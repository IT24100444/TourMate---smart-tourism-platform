using System;
using TourMate.Application.DTOs;
using TourMate.Application.Interfaces;
using TourMate.Domain.Entities;
using TourMate.Domain.Enums;

namespace TourMate.Application.Services;

public class BookingService : IBookingService
{
    private readonly IUnitOfWork _uow;

    public BookingService(IUnitOfWork uow)
    {
        _uow = uow;
    }

    public async Task<ApiResponse<BookingDto>> CreateBookingAsync(CreateBookingRequest request, Guid touristUserId)
    {
        var business = await _uow.Businesses.GetByIdAsync(request.BusinessId);
        if (business == null || business.VerificationStatus != VerificationStatus.Active)
            return ApiResponse<BookingDto>.Fail("Selected business is not active or available for booking.");

        if (request.EndDate <= request.StartDate)
            return ApiResponse<BookingDto>.Fail("End date must be after start date.");

        var days = (int)Math.Max(1, (request.EndDate.Date - request.StartDate.Date).TotalDays);
        
        // Estimate pricing
        decimal baseRate = 12000m;
        if (business.Type == BusinessType.Hotel && business.HotelDetails != null)
        {
            baseRate = 15000m;
        }
        else if (business.Type == BusinessType.Restaurant && business.RestaurantDetails != null)
        {
            baseRate = business.RestaurantDetails.AverageCostPerPersonLkr;
            days = 1;
        }

        decimal totalAmount = baseRate * days * Math.Max(1, request.GuestsCount);

        var booking = new Booking
        {
            TouristUserId = touristUserId,
            BusinessId = request.BusinessId,
            StartDate = request.StartDate.ToUniversalTime(),
            EndDate = request.EndDate.ToUniversalTime(),
            GuestsCount = request.GuestsCount,
            TotalAmountLkr = totalAmount,
            Status = BookingStatus.Pending,
            SpecialRequests = request.SpecialRequests,
            CreatedAt = DateTime.UtcNow
        };

        booking.StatusHistories.Add(new BookingStatusHistory
        {
            BookingId = booking.Id,
            PreviousStatus = BookingStatus.Pending,
            NewStatus = BookingStatus.Pending,
            ChangedByUserId = touristUserId,
            Reason = "Booking request submitted by tourist.",
            Timestamp = DateTime.UtcNow
        });

        // Notify Business Owner
        var notification = new Notification
        {
            UserId = business.OwnerUserId,
            Title = "New Booking Request",
            Message = $"New booking received for {business.Name} ({request.GuestsCount} guests, {totalAmount:N0} LKR).",
            ActionUrl = $"/bookings/{booking.Id}"
        };

        await _uow.Bookings.AddAsync(booking);
        await _uow.Notifications.AddAsync(notification);
        await _uow.SaveChangesAsync();

        return ApiResponse<BookingDto>.Ok(MapToDto(booking, business.Name, business.Type), "Booking request submitted successfully.");
    }

    public async Task<ApiResponse<PagedResult<BookingDto>>> GetUserBookingsAsync(Guid touristUserId, int page, int pageSize)
    {
        var userBookings = (await _uow.Bookings.FindAsync(b => b.TouristUserId == touristUserId))
            .OrderByDescending(b => b.CreatedAt)
            .ToList();

        await CheckAndExpireBookingsAsync(userBookings);

        var total = userBookings.Count;
        var paged = userBookings.Skip((page - 1) * pageSize).Take(pageSize).ToList();

        var pagedIds = paged.Select(b => b.Id).ToList();
        var allHistories = await _uow.BookingStatusHistories.FindAsync(h => pagedIds.Contains(h.BookingId));
        var historiesByBooking = allHistories.GroupBy(h => h.BookingId).ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.Timestamp).ToList());

        var bizIds = paged.Select(b => b.BusinessId).Distinct().ToList();
        var businesses = (await _uow.Businesses.FindAsync(b => bizIds.Contains(b.Id))).ToDictionary(b => b.Id);

        var dtos = new List<BookingDto>();
        foreach (var b in paged)
        {
            businesses.TryGetValue(b.BusinessId, out var biz);
            var hList = historiesByBooking.TryGetValue(b.Id, out var hl) ? hl : null;
            dtos.Add(MapToDto(b, biz?.Name ?? "Business", biz?.Type ?? BusinessType.Hotel, hList));
        }

        return ApiResponse<PagedResult<BookingDto>>.Ok(new PagedResult<BookingDto>
        {
            Items = dtos,
            Page = page,
            PageSize = pageSize,
            TotalItems = total
        });
    }

    public async Task<ApiResponse<PagedResult<BookingDto>>> GetOwnerBookingsAsync(Guid ownerUserId, int page, int pageSize)
    {
        var ownerBusinesses = (await _uow.Businesses.FindAsync(b => b.OwnerUserId == ownerUserId)).ToList();
        var bizIds = ownerBusinesses.Select(b => b.Id).ToList();

        var relevant = (await _uow.Bookings.FindAsync(b => bizIds.Contains(b.BusinessId)))
            .OrderByDescending(b => b.CreatedAt)
            .ToList();

        await CheckAndExpireBookingsAsync(relevant);

        var total = relevant.Count;
        var paged = relevant.Skip((page - 1) * pageSize).Take(pageSize).ToList();

        var pagedIds = paged.Select(b => b.Id).ToList();
        var allHistories = await _uow.BookingStatusHistories.FindAsync(h => pagedIds.Contains(h.BookingId));
        var historiesByBooking = allHistories.GroupBy(h => h.BookingId).ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.Timestamp).ToList());

        var touristIds = paged.Select(b => b.TouristUserId).Distinct().ToList();
        var tourists = (await _uow.Users.FindAsync(u => touristIds.Contains(u.Id))).ToDictionary(u => u.Id);
        var bizMap = ownerBusinesses.ToDictionary(b => b.Id);

        var dtos = new List<BookingDto>();
        foreach (var b in paged)
        {
            bizMap.TryGetValue(b.BusinessId, out var biz);
            tourists.TryGetValue(b.TouristUserId, out var tourist);
            var hList = historiesByBooking.TryGetValue(b.Id, out var hl) ? hl : null;
            var dto = MapToDto(b, biz?.Name ?? "Business", biz?.Type ?? BusinessType.Hotel, hList);
            dto.TouristName = tourist?.FullName ?? "Tourist";
            dto.TouristEmail = tourist?.Email ?? "";
            dtos.Add(dto);
        }

        return ApiResponse<PagedResult<BookingDto>>.Ok(new PagedResult<BookingDto>
        {
            Items = dtos,
            Page = page,
            PageSize = pageSize,
            TotalItems = total
        });
    }

    public async Task<ApiResponse<BookingDto>> UpdateBookingStatusAsync(Guid bookingId, UpdateBookingStatusRequest request, Guid changedByUserId, bool isAdmin)
    {
        var booking = await _uow.Bookings.GetByIdAsync(bookingId);
        if (booking == null)
            return ApiResponse<BookingDto>.Fail("Booking not found.");

        // State machine constraint check
        if (booking.Status == BookingStatus.Completed)
            return ApiResponse<BookingDto>.Fail("A completed booking cannot transition back to another status.");

        if (booking.Status == BookingStatus.Cancelled && request.Status != BookingStatus.Cancelled)
            return ApiResponse<BookingDto>.Fail("A cancelled booking cannot be reactivated.");

        var oldStatus = booking.Status;
        booking.Status = request.Status;
        booking.UpdatedAt = DateTime.UtcNow;

        var history = new BookingStatusHistory
        {
            BookingId = booking.Id,
            PreviousStatus = oldStatus,
            NewStatus = request.Status,
            ChangedByUserId = changedByUserId,
            Reason = request.Reason ?? $"Status changed from {oldStatus} to {request.Status}",
            Timestamp = DateTime.UtcNow
        };
        await _uow.BookingStatusHistories.AddAsync(history);

        // Notify Tourist
        var notification = new Notification
        {
            UserId = booking.TouristUserId,
            Title = $"Booking Update: {request.Status}",
            Message = $"Your booking reference {booking.BookingReference} is now {request.Status}." + (string.IsNullOrWhiteSpace(request.Reason) ? "" : $" Reason: {request.Reason}"),
            ActionUrl = $"/bookings/{booking.Id}"
        };

        await _uow.Notifications.AddAsync(notification);
        await _uow.Bookings.UpdateAsync(booking);
        await _uow.SaveChangesAsync();

        var biz = await _uow.Businesses.GetByIdAsync(booking.BusinessId);
        var allHistories = await _uow.BookingStatusHistories.FindAsync(h => h.BookingId == booking.Id);
        return ApiResponse<BookingDto>.Ok(MapToDto(booking, biz?.Name ?? "Business", biz?.Type ?? BusinessType.Hotel, allHistories.ToList()), $"Booking status updated to {request.Status}");
    }

    public async Task<ApiResponse<BookingDto>> ResendBookingAsync(Guid bookingId, Guid touristUserId)
    {
        var booking = await _uow.Bookings.GetByIdAsync(bookingId);
        if (booking == null)
            return ApiResponse<BookingDto>.Fail("Booking not found.");

        if (booking.TouristUserId != touristUserId)
            return ApiResponse<BookingDto>.Fail("You are not authorized to re-send this booking.");

        var oldStatus = booking.Status;
        booking.Status = BookingStatus.Pending;
        booking.HasComplaint = false;
        booking.ComplaintText = null;
        booking.CreatedAt = DateTime.UtcNow; // Restart 24-hr expiration window
        booking.UpdatedAt = DateTime.UtcNow;

        await _uow.BookingStatusHistories.AddAsync(new BookingStatusHistory
        {
            BookingId = booking.Id,
            PreviousStatus = oldStatus,
            NewStatus = BookingStatus.Pending,
            ChangedByUserId = touristUserId,
            Reason = "Booking re-sent by tourist. Awaiting host confirmation.",
            Timestamp = DateTime.UtcNow
        });

        var business = await _uow.Businesses.GetByIdAsync(booking.BusinessId);
        if (business != null)
        {
            await _uow.Notifications.AddAsync(new Notification
            {
                UserId = business.OwnerUserId,
                Title = "Booking Re-sent by Tourist",
                Message = $"A tourist re-sent booking request {booking.BookingReference} for {business.Name}.",
                ActionUrl = $"/bookings/{booking.Id}"
            });
        }

        await _uow.Bookings.UpdateAsync(booking);
        await _uow.SaveChangesAsync();

        var allHistories = await _uow.BookingStatusHistories.FindAsync(h => h.BookingId == booking.Id);
        var dto = MapToDto(booking, business?.Name ?? "Business", business?.Type ?? BusinessType.Hotel, allHistories.ToList());
        var tourist = await _uow.Users.GetByIdAsync(booking.TouristUserId);
        dto.TouristName = tourist?.FullName ?? "Tourist";
        dto.TouristEmail = tourist?.Email ?? "";

        return ApiResponse<BookingDto>.Ok(dto, "Booking re-sent successfully. Host has been notified.");
    }

    public async Task<ApiResponse<BookingComplaintDto>> SubmitComplaintAsync(Guid bookingId, SubmitComplaintRequest request, Guid touristUserId)
    {
        if (string.IsNullOrWhiteSpace(request.ComplaintText))
            return ApiResponse<BookingComplaintDto>.Fail("Complaint details cannot be empty.");

        var booking = await _uow.Bookings.GetByIdAsync(bookingId);
        if (booking == null)
            return ApiResponse<BookingComplaintDto>.Fail("Booking not found.");

        if (booking.TouristUserId != touristUserId)
            return ApiResponse<BookingComplaintDto>.Fail("You are not authorized to file a complaint for this booking.");

        var complaint = new BookingComplaint
        {
            BookingId = booking.Id,
            TouristUserId = touristUserId,
            BusinessId = booking.BusinessId,
            ComplaintText = request.ComplaintText.Trim(),
            Status = "Pending",
            CreatedAt = DateTime.UtcNow
        };

        booking.HasComplaint = true;
        booking.ComplaintText = request.ComplaintText.Trim();
        booking.UpdatedAt = DateTime.UtcNow;
        await _uow.Bookings.UpdateAsync(booking);
        await _uow.BookingComplaints.AddAsync(complaint);

        // Notify administrators
        var admins = await _uow.Users.FindAsync(u => u.Role == UserRole.Administrator);
        foreach (var admin in admins)
        {
            await _uow.Notifications.AddAsync(new Notification
            {
                UserId = admin.Id,
                Title = "New Booking Complaint Filed",
                Message = $"Tourist filed a complaint for booking {booking.BookingReference}.",
                ActionUrl = "/admin/complaints"
            });
        }

        await _uow.SaveChangesAsync();

        var tourist = await _uow.Users.GetByIdAsync(touristUserId);
        var business = await _uow.Businesses.GetByIdAsync(booking.BusinessId);

        var dto = new BookingComplaintDto
        {
            Id = complaint.Id,
            BookingId = booking.Id,
            BookingReference = booking.BookingReference,
            TouristUserId = touristUserId,
            TouristName = tourist?.FullName ?? "Tourist",
            TouristEmail = tourist?.Email ?? "",
            BusinessId = booking.BusinessId,
            BusinessName = business?.Name ?? "Business",
            BusinessType = business?.Type ?? BusinessType.Hotel,
            ComplaintText = complaint.ComplaintText,
            Status = complaint.Status,
            AdminWarningMessage = complaint.AdminWarningMessage,
            CreatedAt = complaint.CreatedAt
        };

        return ApiResponse<BookingComplaintDto>.Ok(dto, "Complaint submitted to TourMate Administration successfully.");
    }

    public async Task<ApiResponse<List<BookingComplaintDto>>> GetAllComplaintsAsync()
    {
        var complaints = await _uow.BookingComplaints.GetAllAsync();
        var allBookings = (await _uow.Bookings.GetAllAsync()).ToDictionary(b => b.Id);
        var allUsers = (await _uow.Users.GetAllAsync()).ToDictionary(u => u.Id);
        var allBusinesses = (await _uow.Businesses.GetAllAsync()).ToDictionary(b => b.Id);

        var dtos = new List<BookingComplaintDto>();
        foreach (var c in complaints.OrderByDescending(x => x.CreatedAt))
        {
            allBookings.TryGetValue(c.BookingId, out var b);
            allUsers.TryGetValue(c.TouristUserId, out var tourist);
            allBusinesses.TryGetValue(c.BusinessId, out var biz);

            dtos.Add(new BookingComplaintDto
            {
                Id = c.Id,
                BookingId = c.BookingId,
                BookingReference = b?.BookingReference ?? "N/A",
                TouristUserId = c.TouristUserId,
                TouristName = tourist?.FullName ?? "Tourist",
                TouristEmail = tourist?.Email ?? "",
                BusinessId = c.BusinessId,
                BusinessName = biz?.Name ?? "Business",
                BusinessType = biz?.Type ?? BusinessType.Hotel,
                ComplaintText = c.ComplaintText,
                Status = c.Status,
                AdminWarningMessage = c.AdminWarningMessage,
                CreatedAt = c.CreatedAt,
                ResolvedAt = c.ResolvedAt
            });
        }

        return ApiResponse<List<BookingComplaintDto>>.Ok(dtos);
    }

    public async Task<ApiResponse<BookingComplaintDto>> SendWarningAsync(Guid complaintId, SendWarningRequest request, Guid adminUserId)
    {
        var complaint = await _uow.BookingComplaints.GetByIdAsync(complaintId);
        if (complaint == null)
            return ApiResponse<BookingComplaintDto>.Fail("Complaint not found.");

        var warningMsg = string.IsNullOrWhiteSpace(request.WarningMessage)
            ? "Be careful about your booking. Approve bookings in right time."
            : request.WarningMessage.Trim();

        complaint.Status = "WarningSent";
        complaint.AdminWarningMessage = warningMsg;
        complaint.ResolvedAt = DateTime.UtcNow;

        var booking = await _uow.Bookings.GetByIdAsync(complaint.BookingId);
        if (booking != null)
        {
            booking.HasWarning = true;
            booking.WarningMessage = warningMsg;
            booking.UpdatedAt = DateTime.UtcNow;
            await _uow.Bookings.UpdateAsync(booking);

            await _uow.BookingStatusHistories.AddAsync(new BookingStatusHistory
            {
                BookingId = booking.Id,
                PreviousStatus = booking.Status,
                NewStatus = booking.Status,
                ChangedByUserId = adminUserId,
                Reason = $"Official Warning issued by Administration: \"{warningMsg}\"",
                Timestamp = DateTime.UtcNow
            });

            var business = await _uow.Businesses.GetByIdAsync(booking.BusinessId);
            if (business != null)
            {
                await _uow.Notifications.AddAsync(new Notification
                {
                    UserId = business.OwnerUserId,
                    Title = "Official Administration Warning",
                    Message = warningMsg,
                    ActionUrl = $"/bookings/{booking.Id}"
                });
            }
        }

        await _uow.BookingComplaints.UpdateAsync(complaint);
        await _uow.SaveChangesAsync();

        var tourist = await _uow.Users.GetByIdAsync(complaint.TouristUserId);
        var bizObj = await _uow.Businesses.GetByIdAsync(complaint.BusinessId);

        var dto = new BookingComplaintDto
        {
            Id = complaint.Id,
            BookingId = complaint.BookingId,
            BookingReference = booking?.BookingReference ?? "N/A",
            TouristUserId = complaint.TouristUserId,
            TouristName = tourist?.FullName ?? "Tourist",
            TouristEmail = tourist?.Email ?? "",
            BusinessId = complaint.BusinessId,
            BusinessName = bizObj?.Name ?? "Business",
            BusinessType = bizObj?.Type ?? BusinessType.Hotel,
            ComplaintText = complaint.ComplaintText,
            Status = complaint.Status,
            AdminWarningMessage = complaint.AdminWarningMessage,
            CreatedAt = complaint.CreatedAt,
            ResolvedAt = complaint.ResolvedAt
        };

        return ApiResponse<BookingComplaintDto>.Ok(dto, "Warning sent to business owner successfully.");
    }

    private async Task CheckAndExpireBookingsAsync(IEnumerable<Booking> bookings)
    {
        var now = DateTime.UtcNow;
        var modified = false;
        foreach (var b in bookings.Where(b => b.Status == BookingStatus.Pending))
        {
            if (now - b.CreatedAt > TimeSpan.FromHours(24))
            {
                b.Status = BookingStatus.Expired;
                b.UpdatedAt = now;
                await _uow.BookingStatusHistories.AddAsync(new BookingStatusHistory
                {
                    BookingId = b.Id,
                    PreviousStatus = BookingStatus.Pending,
                    NewStatus = BookingStatus.Expired,
                    ChangedByUserId = Guid.Empty,
                    Reason = "Auto-expired: Business owner did not respond within 24 hours.",
                    Timestamp = now
                });
                await _uow.Bookings.UpdateAsync(b);
                modified = true;
            }
        }
        if (modified)
        {
            await _uow.SaveChangesAsync();
        }
    }

    public async Task<ApiResponse<ReviewDto>> AddReviewAsync(CreateReviewRequest request, Guid touristUserId)
    {
        var tourist = await _uow.Users.GetByIdAsync(touristUserId);
        if (tourist == null)
            return ApiResponse<ReviewDto>.Fail("User not found.");

        var review = new Review
        {
            TouristUserId = touristUserId,
            TargetType = request.TargetType,
            TargetId = request.TargetId,
            Rating = Math.Clamp(request.Rating, 1, 5),
            Comment = request.Comment.Trim(),
            Status = ReviewStatus.Approved,
            CreatedAt = DateTime.UtcNow
        };

        await _uow.Reviews.AddAsync(review);
        await _uow.SaveChangesAsync();

        // Recalculate average rating
        if (request.TargetType.Equals("Place", StringComparison.OrdinalIgnoreCase))
        {
            var place = await _uow.TourismPlaces.GetByIdAsync(request.TargetId);
            if (place != null)
            {
                var reviews = await _uow.Reviews.FindAsync(r => r.TargetId == place.Id && r.TargetType == "Place");
                place.ReviewCount = reviews.Count;
                place.AverageRating = Math.Round(reviews.Average(r => r.Rating), 1);
                await _uow.TourismPlaces.UpdateAsync(place);
            }
        }
        else
        {
            var biz = await _uow.Businesses.GetByIdAsync(request.TargetId);
            if (biz != null)
            {
                var reviews = await _uow.Reviews.FindAsync(r => r.TargetId == biz.Id && r.TargetType == "Business");
                biz.ReviewCount = reviews.Count;
                biz.Rating = Math.Round(reviews.Average(r => r.Rating), 1);
                await _uow.Businesses.UpdateAsync(biz);
            }
        }

        await _uow.SaveChangesAsync();

        return ApiResponse<ReviewDto>.Ok(new ReviewDto
        {
            Id = review.Id,
            TouristUserId = touristUserId,
            TouristName = tourist.FullName,
            TargetType = review.TargetType,
            TargetId = review.TargetId,
            Rating = review.Rating,
            Comment = review.Comment,
            Status = review.Status,
            CreatedAt = review.CreatedAt
        }, "Review submitted successfully.");
    }

    public async Task<ApiResponse<List<ReviewDto>>> GetReviewsAsync(string targetType, Guid targetId)
    {
        var reviews = await _uow.Reviews.FindAsync(r => r.TargetType.ToLower() == targetType.ToLower() && r.TargetId == targetId && r.Status == ReviewStatus.Approved);
        var list = new List<ReviewDto>();
        foreach (var r in reviews.OrderByDescending(x => x.CreatedAt))
        {
            var user = await _uow.Users.GetByIdAsync(r.TouristUserId);
            list.Add(new ReviewDto
            {
                Id = r.Id,
                TouristUserId = r.TouristUserId,
                TouristName = user?.FullName ?? "Tourist",
                TargetType = r.TargetType,
                TargetId = r.TargetId,
                Rating = r.Rating,
                Comment = r.Comment,
                Status = r.Status,
                CreatedAt = r.CreatedAt
            });
        }
        return ApiResponse<List<ReviewDto>>.Ok(list);
    }

    public async Task<ApiResponse<ReviewDto>> SubmitBookingReviewAsync(Guid bookingId, CreateBookingReviewRequest request, Guid touristUserId)
    {
        var booking = await _uow.Bookings.GetByIdAsync(bookingId);
        if (booking == null)
            return ApiResponse<ReviewDto>.Fail("Booking reservation not found.");

        if (booking.TouristUserId != touristUserId)
            return ApiResponse<ReviewDto>.Fail("You can only review your own bookings.");

        // Strict Post-Stay Rule: Booking must be Completed
        if (booking.Status != BookingStatus.Completed)
            return ApiResponse<ReviewDto>.Fail("Reviews can only be submitted after your booking is Completed / Transaction Settled.");

        var tourist = await _uow.Users.GetByIdAsync(touristUserId);
        var biz = await _uow.Businesses.GetByIdAsync(booking.BusinessId);

        // Check if an active review exists for this booking
        var existing = (await _uow.Reviews.FindAsync(r => r.BookingId == bookingId && !r.IsDeletedByTourist)).FirstOrDefault();
        Review review;

        if (existing != null)
        {
            existing.Rating = Math.Clamp(request.Rating, 1, 5);
            existing.Comment = request.Comment.Trim();
            existing.IsDeletedByOwner = false;
            existing.UpdatedAt = DateTime.UtcNow;
            await _uow.Reviews.UpdateAsync(existing);
            review = existing;
        }
        else
        {
            review = new Review
            {
                TouristUserId = touristUserId,
                TargetType = "Business",
                TargetId = booking.BusinessId,
                BookingId = booking.Id,
                Rating = Math.Clamp(request.Rating, 1, 5),
                Comment = request.Comment.Trim(),
                Status = ReviewStatus.Approved,
                CreatedAt = DateTime.UtcNow
            };
            await _uow.Reviews.AddAsync(review);
        }

        await _uow.SaveChangesAsync();
        await RecalculateBusinessRatingAsync(booking.BusinessId);

        return ApiResponse<ReviewDto>.Ok(new ReviewDto
        {
            Id = review.Id,
            TouristUserId = touristUserId,
            TouristName = tourist?.FullName ?? "Tourist",
            TargetType = review.TargetType,
            TargetId = review.TargetId,
            BookingId = review.BookingId,
            BookingReference = booking.BookingReference,
            BusinessName = biz?.Name ?? "Business Host",
            Rating = review.Rating,
            Comment = review.Comment,
            Status = review.Status,
            OwnerReply = review.OwnerReply,
            OwnerRepliedAt = review.OwnerRepliedAt,
            IsHeartedByOwner = review.IsHeartedByOwner,
            OwnerHeartedAt = review.OwnerHeartedAt,
            IsDeletedByOwner = review.IsDeletedByOwner,
            IsDeletedByTourist = review.IsDeletedByTourist,
            CreatedAt = review.CreatedAt,
            UpdatedAt = review.UpdatedAt
        }, "Booking review submitted successfully.");
    }

    public async Task<ApiResponse<List<ReviewDto>>> GetMyReviewsAsync(Guid touristUserId)
    {
        var tourist = await _uow.Users.GetByIdAsync(touristUserId);
        var reviews = await _uow.Reviews.FindAsync(r => r.TouristUserId == touristUserId && !r.IsDeletedByTourist);
        var list = new List<ReviewDto>();

        foreach (var r in reviews.OrderByDescending(x => x.CreatedAt))
        {
            string? refCode = null;
            if (r.BookingId.HasValue)
            {
                var b = await _uow.Bookings.GetByIdAsync(r.BookingId.Value);
                refCode = b?.BookingReference;
            }

            string? bizName = null;
            if (r.TargetType.Equals("Business", StringComparison.OrdinalIgnoreCase))
            {
                var biz = await _uow.Businesses.GetByIdAsync(r.TargetId);
                bizName = biz?.Name;
            }
            else
            {
                var place = await _uow.TourismPlaces.GetByIdAsync(r.TargetId);
                bizName = place?.Name;
            }

            list.Add(new ReviewDto
            {
                Id = r.Id,
                TouristUserId = r.TouristUserId,
                TouristName = tourist?.FullName ?? "Tourist",
                TargetType = r.TargetType,
                TargetId = r.TargetId,
                BookingId = r.BookingId,
                BookingReference = refCode,
                BusinessName = bizName,
                Rating = r.Rating,
                Comment = r.Comment,
                Status = r.Status,
                OwnerReply = r.OwnerReply,
                OwnerRepliedAt = r.OwnerRepliedAt,
                IsHeartedByOwner = r.IsHeartedByOwner,
                OwnerHeartedAt = r.OwnerHeartedAt,
                IsDeletedByOwner = r.IsDeletedByOwner,
                IsDeletedByTourist = r.IsDeletedByTourist,
                CreatedAt = r.CreatedAt,
                UpdatedAt = r.UpdatedAt
            });
        }

        return ApiResponse<List<ReviewDto>>.Ok(list);
    }

    public async Task<ApiResponse<ReviewDto>> UpdateReviewAsync(Guid reviewId, UpdateReviewRequest request, Guid touristUserId)
    {
        var review = await _uow.Reviews.GetByIdAsync(reviewId);
        if (review == null || review.TouristUserId != touristUserId || review.IsDeletedByTourist)
            return ApiResponse<ReviewDto>.Fail("Review not found.");

        if (review.IsDeletedByOwner)
            return ApiResponse<ReviewDto>.Fail("This review was removed by the business owner and cannot be edited.");

        review.Rating = Math.Clamp(request.Rating, 1, 5);
        review.Comment = request.Comment.Trim();
        review.UpdatedAt = DateTime.UtcNow;

        await _uow.Reviews.UpdateAsync(review);
        await _uow.SaveChangesAsync();

        if (review.TargetType.Equals("Business", StringComparison.OrdinalIgnoreCase))
        {
            await RecalculateBusinessRatingAsync(review.TargetId);
        }
        else if (review.TargetType.Equals("Place", StringComparison.OrdinalIgnoreCase))
        {
            await RecalculatePlaceRatingAsync(review.TargetId);
        }

        var tourist = await _uow.Users.GetByIdAsync(touristUserId);
        return ApiResponse<ReviewDto>.Ok(new ReviewDto
        {
            Id = review.Id,
            TouristUserId = touristUserId,
            TouristName = tourist?.FullName ?? "Tourist",
            TargetType = review.TargetType,
            TargetId = review.TargetId,
            BookingId = review.BookingId,
            Rating = review.Rating,
            Comment = review.Comment,
            Status = review.Status,
            OwnerReply = review.OwnerReply,
            OwnerRepliedAt = review.OwnerRepliedAt,
            IsHeartedByOwner = review.IsHeartedByOwner,
            OwnerHeartedAt = review.OwnerHeartedAt,
            IsDeletedByOwner = review.IsDeletedByOwner,
            IsDeletedByTourist = review.IsDeletedByTourist,
            CreatedAt = review.CreatedAt,
            UpdatedAt = review.UpdatedAt
        }, "Review updated successfully.");
    }

    public async Task<ApiResponse<bool>> DeleteReviewByTouristAsync(Guid reviewId, Guid touristUserId)
    {
        var review = await _uow.Reviews.GetByIdAsync(reviewId);
        if (review == null || review.TouristUserId != touristUserId)
            return ApiResponse<bool>.Fail("Review not found.");

        review.IsDeletedByTourist = true;
        await _uow.Reviews.UpdateAsync(review);
        await _uow.SaveChangesAsync();

        if (review.TargetType.Equals("Business", StringComparison.OrdinalIgnoreCase))
        {
            await RecalculateBusinessRatingAsync(review.TargetId);
        }
        else if (review.TargetType.Equals("Place", StringComparison.OrdinalIgnoreCase))
        {
            await RecalculatePlaceRatingAsync(review.TargetId);
        }

        return ApiResponse<bool>.Ok(true, "Review deleted successfully.");
    }

    public async Task<ApiResponse<List<ReviewDto>>> GetOwnerReviewsAsync(Guid ownerUserId, bool isAdmin)
    {
        IEnumerable<Business> businesses;
        if (isAdmin)
        {
            businesses = await _uow.Businesses.GetAllAsync();
        }
        else
        {
            businesses = await _uow.Businesses.FindAsync(b => b.OwnerUserId == ownerUserId);
        }

        var bizMap = businesses.ToDictionary(b => b.Id, b => b.Name);
        var bizIds = bizMap.Keys.ToHashSet();

        var reviews = await _uow.Reviews.FindAsync(r => 
            r.TargetType.ToLower() == "business" && 
            bizIds.Contains(r.TargetId) && 
            !r.IsDeletedByTourist);

        var list = new List<ReviewDto>();
        foreach (var r in reviews.OrderByDescending(x => x.CreatedAt))
        {
            var user = await _uow.Users.GetByIdAsync(r.TouristUserId);
            string? refCode = null;
            if (r.BookingId.HasValue)
            {
                var b = await _uow.Bookings.GetByIdAsync(r.BookingId.Value);
                refCode = b?.BookingReference;
            }

            list.Add(new ReviewDto
            {
                Id = r.Id,
                TouristUserId = r.TouristUserId,
                TouristName = user?.FullName ?? "Tourist",
                TargetType = r.TargetType,
                TargetId = r.TargetId,
                BookingId = r.BookingId,
                BookingReference = refCode,
                BusinessName = bizMap.TryGetValue(r.TargetId, out var name) ? name : "My Property",
                Rating = r.Rating,
                Comment = r.Comment,
                Status = r.Status,
                OwnerReply = r.OwnerReply,
                OwnerRepliedAt = r.OwnerRepliedAt,
                IsHeartedByOwner = r.IsHeartedByOwner,
                OwnerHeartedAt = r.OwnerHeartedAt,
                IsDeletedByOwner = r.IsDeletedByOwner,
                IsDeletedByTourist = r.IsDeletedByTourist,
                CreatedAt = r.CreatedAt,
                UpdatedAt = r.UpdatedAt
            });
        }

        return ApiResponse<List<ReviewDto>>.Ok(list);
    }

    public async Task<ApiResponse<ReviewDto>> ReplyToReviewAsync(Guid reviewId, ReplyReviewRequest request, Guid ownerUserId, bool isAdmin)
    {
        var review = await _uow.Reviews.GetByIdAsync(reviewId);
        if (review == null)
            return ApiResponse<ReviewDto>.Fail("Review not found.");

        var biz = await _uow.Businesses.GetByIdAsync(review.TargetId);
        if (biz == null || (!isAdmin && biz.OwnerUserId != ownerUserId))
            return ApiResponse<ReviewDto>.Fail("Unauthorized: You can only reply to reviews for your own businesses.");

        review.OwnerReply = request.Reply.Trim();
        review.OwnerRepliedAt = DateTime.UtcNow;

        await _uow.Reviews.UpdateAsync(review);
        await _uow.SaveChangesAsync();

        var tourist = await _uow.Users.GetByIdAsync(review.TouristUserId);
        return ApiResponse<ReviewDto>.Ok(new ReviewDto
        {
            Id = review.Id,
            TouristUserId = review.TouristUserId,
            TouristName = tourist?.FullName ?? "Tourist",
            TargetType = review.TargetType,
            TargetId = review.TargetId,
            BookingId = review.BookingId,
            BusinessName = biz.Name,
            Rating = review.Rating,
            Comment = review.Comment,
            Status = review.Status,
            OwnerReply = review.OwnerReply,
            OwnerRepliedAt = review.OwnerRepliedAt,
            IsHeartedByOwner = review.IsHeartedByOwner,
            OwnerHeartedAt = review.OwnerHeartedAt,
            IsDeletedByOwner = review.IsDeletedByOwner,
            CreatedAt = review.CreatedAt,
            UpdatedAt = review.UpdatedAt
        }, "Reply saved successfully.");
    }

    public async Task<ApiResponse<ReviewDto>> DeleteReplyAsync(Guid reviewId, Guid ownerUserId, bool isAdmin)
    {
        var review = await _uow.Reviews.GetByIdAsync(reviewId);
        if (review == null)
            return ApiResponse<ReviewDto>.Fail("Review not found.");

        var biz = await _uow.Businesses.GetByIdAsync(review.TargetId);
        if (biz == null || (!isAdmin && biz.OwnerUserId != ownerUserId))
            return ApiResponse<ReviewDto>.Fail("Unauthorized: You can only modify reviews for your own businesses.");

        review.OwnerReply = null;
        review.OwnerRepliedAt = null;

        await _uow.Reviews.UpdateAsync(review);
        await _uow.SaveChangesAsync();

        var tourist = await _uow.Users.GetByIdAsync(review.TouristUserId);
        return ApiResponse<ReviewDto>.Ok(new ReviewDto
        {
            Id = review.Id,
            TouristUserId = review.TouristUserId,
            TouristName = tourist?.FullName ?? "Tourist",
            TargetType = review.TargetType,
            TargetId = review.TargetId,
            BookingId = review.BookingId,
            BusinessName = biz.Name,
            Rating = review.Rating,
            Comment = review.Comment,
            Status = review.Status,
            OwnerReply = review.OwnerReply,
            OwnerRepliedAt = review.OwnerRepliedAt,
            IsHeartedByOwner = review.IsHeartedByOwner,
            OwnerHeartedAt = review.OwnerHeartedAt,
            IsDeletedByOwner = review.IsDeletedByOwner,
            CreatedAt = review.CreatedAt,
            UpdatedAt = review.UpdatedAt
        }, "Reply removed successfully.");
    }

    public async Task<ApiResponse<ReviewDto>> ReactToReviewAsync(Guid reviewId, ReactReviewRequest request, Guid ownerUserId, bool isAdmin)
    {
        var review = await _uow.Reviews.GetByIdAsync(reviewId);
        if (review == null)
            return ApiResponse<ReviewDto>.Fail("Review not found.");

        var biz = await _uow.Businesses.GetByIdAsync(review.TargetId);
        if (biz == null || (!isAdmin && biz.OwnerUserId != ownerUserId))
            return ApiResponse<ReviewDto>.Fail("Unauthorized: You can only react to reviews for your own businesses.");

        review.IsHeartedByOwner = request.IsHearted;
        review.OwnerHeartedAt = request.IsHearted ? DateTime.UtcNow : null;

        await _uow.Reviews.UpdateAsync(review);
        await _uow.SaveChangesAsync();

        var tourist = await _uow.Users.GetByIdAsync(review.TouristUserId);
        return ApiResponse<ReviewDto>.Ok(new ReviewDto
        {
            Id = review.Id,
            TouristUserId = review.TouristUserId,
            TouristName = tourist?.FullName ?? "Tourist",
            TargetType = review.TargetType,
            TargetId = review.TargetId,
            BookingId = review.BookingId,
            BusinessName = biz.Name,
            Rating = review.Rating,
            Comment = review.Comment,
            Status = review.Status,
            OwnerReply = review.OwnerReply,
            OwnerRepliedAt = review.OwnerRepliedAt,
            IsHeartedByOwner = review.IsHeartedByOwner,
            OwnerHeartedAt = review.OwnerHeartedAt,
            IsDeletedByOwner = review.IsDeletedByOwner,
            CreatedAt = review.CreatedAt,
            UpdatedAt = review.UpdatedAt
        }, request.IsHearted ? "Gave heart to review ❤️" : "Removed heart from review.");
    }

    public async Task<ApiResponse<bool>> DeleteReviewByOwnerAsync(Guid reviewId, Guid ownerUserId, bool isAdmin)
    {
        var review = await _uow.Reviews.GetByIdAsync(reviewId);
        if (review == null)
            return ApiResponse<bool>.Fail("Review not found.");

        var biz = await _uow.Businesses.GetByIdAsync(review.TargetId);
        if (biz == null || (!isAdmin && biz.OwnerUserId != ownerUserId))
            return ApiResponse<bool>.Fail("Unauthorized: You can only delete reviews for your own businesses.");

        // RULE: Business owner can only delete review BEFORE giving a reply or reaction (heart)
        if (!string.IsNullOrWhiteSpace(review.OwnerReply) || review.IsHeartedByOwner)
        {
            return ApiResponse<bool>.Fail("Cannot delete this review. You have already replied or reacted to it.");
        }

        review.IsDeletedByOwner = true;
        review.OwnerReply = null;
        review.OwnerRepliedAt = null;
        review.IsHeartedByOwner = false;
        review.OwnerHeartedAt = null;

        await _uow.Reviews.UpdateAsync(review);
        await _uow.SaveChangesAsync();
        await RecalculateBusinessRatingAsync(review.TargetId);

        return ApiResponse<bool>.Ok(true, "Review deleted by business owner.");
    }

    public async Task<ApiResponse<List<PlaceReviewAdminDto>>> GetAdminPlaceReviewsAsync()
    {
        var placeReviews = await _uow.Reviews.FindAsync(r => 
            r.TargetType.ToLower() == "place" && 
            !r.IsDeletedByTourist);

        var list = new List<PlaceReviewAdminDto>();
        foreach (var r in placeReviews.OrderByDescending(x => x.CreatedAt))
        {
            var tourist = await _uow.Users.GetByIdAsync(r.TouristUserId);
            var place = await _uow.TourismPlaces.GetByIdAsync(r.TargetId);

            list.Add(new PlaceReviewAdminDto
            {
                Id = r.Id,
                TouristUserId = r.TouristUserId,
                TouristName = tourist?.FullName ?? "Tourist",
                TouristEmail = tourist?.Email ?? "tourist@tourmate.lk",
                PlaceId = r.TargetId,
                PlaceName = place?.Name ?? "Attraction",
                PlaceDistrict = place?.District,
                PlaceCategory = place?.Category?.Name ?? "Attraction",
                PlaceImageUrl = place?.Media?.FirstOrDefault(m => m.IsCover)?.Url ?? place?.Media?.FirstOrDefault()?.Url,
                Rating = r.Rating,
                Comment = r.Comment,
                CreatedAt = r.CreatedAt,
                UpdatedAt = r.UpdatedAt
            });
        }

        return ApiResponse<List<PlaceReviewAdminDto>>.Ok(list, "Admin place reviews fetched successfully.");
    }

    private async Task RecalculateBusinessRatingAsync(Guid businessId)
    {
        var biz = await _uow.Businesses.GetByIdAsync(businessId);
        if (biz != null)
        {
            var validReviews = await _uow.Reviews.FindAsync(r => 
                r.TargetId == biz.Id && 
                r.TargetType.ToLower() == "business" && 
                !r.IsDeletedByTourist && 
                !r.IsDeletedByOwner && 
                r.Status == ReviewStatus.Approved);

            biz.ReviewCount = validReviews.Count;
            biz.Rating = validReviews.Count > 0 
                ? Math.Round(validReviews.Average(r => r.Rating), 1) 
                : 4.8;
            await _uow.Businesses.UpdateAsync(biz);
            await _uow.SaveChangesAsync();
        }
    }

    private async Task RecalculatePlaceRatingAsync(Guid placeId)
    {
        var place = await _uow.TourismPlaces.GetByIdAsync(placeId);
        if (place != null)
        {
            var validReviews = await _uow.Reviews.FindAsync(r => 
                r.TargetId == place.Id && 
                r.TargetType.ToLower() == "place" && 
                !r.IsDeletedByTourist && 
                r.Status == ReviewStatus.Approved);

            place.ReviewCount = validReviews.Count;
            place.AverageRating = validReviews.Count > 0 
                ? Math.Round(validReviews.Average(r => r.Rating), 1) 
                : 4.9;
            await _uow.TourismPlaces.UpdateAsync(place);
            await _uow.SaveChangesAsync();
        }
    }

    public async Task<ApiResponse<bool>> ToggleFavouriteAsync(string targetType, Guid targetId, Guid userId)
    {
        var existing = (await _uow.Favourites.FindAsync(f => f.UserId == userId && f.TargetType.ToLower() == targetType.ToLower() && f.TargetId == targetId)).FirstOrDefault();
        if (existing != null)
        {
            await _uow.Favourites.DeleteAsync(existing);
            await _uow.SaveChangesAsync();
            return ApiResponse<bool>.Ok(false, "Removed from favourites.");
        }

        var fav = new Favourite
        {
            UserId = userId,
            TargetType = targetType,
            TargetId = targetId,
            CreatedAt = DateTime.UtcNow
        };
        await _uow.Favourites.AddAsync(fav);
        await _uow.SaveChangesAsync();
        return ApiResponse<bool>.Ok(true, "Added to favourites.");
    }

    public async Task<ApiResponse<List<FavouriteDto>>> GetFavouritesAsync(Guid userId)
    {
        var favs = await _uow.Favourites.FindAsync(f => f.UserId == userId);
        var dtos = new List<FavouriteDto>();

        foreach (var f in favs)
        {
            string title = "Saved Item";
            string? subtitle = null;
            string? imageUrl = null;

            if (f.TargetType.Equals("Place", StringComparison.OrdinalIgnoreCase))
            {
                var place = await _uow.TourismPlaces.GetByIdAsync(f.TargetId);
                if (place != null)
                {
                    title = place.Name;
                    subtitle = place.District;
                    imageUrl = place.Media.FirstOrDefault()?.Url;
                }
            }
            else
            {
                var biz = await _uow.Businesses.GetByIdAsync(f.TargetId);
                if (biz != null)
                {
                    title = biz.Name;
                    subtitle = $"{biz.Type} in {biz.District}";
                    imageUrl = biz.Media.FirstOrDefault()?.Url;
                }
            }

            dtos.Add(new FavouriteDto
            {
                Id = f.Id,
                TargetType = f.TargetType,
                TargetId = f.TargetId,
                Title = title,
                Subtitle = subtitle,
                ImageUrl = imageUrl,
                CreatedAt = f.CreatedAt
            });
        }

        return ApiResponse<List<FavouriteDto>>.Ok(dtos);
    }

    private static BookingDto MapToDto(Booking b, string businessName, BusinessType businessType, List<BookingStatusHistory>? histories = null)
    {
        var historyList = histories ?? b.StatusHistories?.ToList() ?? new List<BookingStatusHistory>();
        var cancellationReason = historyList
            .Where(h => h.NewStatus == BookingStatus.Cancelled || h.NewStatus == BookingStatus.Rejected || h.NewStatus == BookingStatus.Expired)
            .OrderByDescending(h => h.Timestamp)
            .Select(h => h.Reason)
            .FirstOrDefault();

        return new BookingDto
        {
            Id = b.Id,
            BookingReference = b.BookingReference,
            TouristUserId = b.TouristUserId,
            BusinessId = b.BusinessId,
            BusinessName = businessName,
            BusinessType = businessType,
            StartDate = b.StartDate,
            EndDate = b.EndDate,
            GuestsCount = b.GuestsCount,
            TotalAmountLkr = b.TotalAmountLkr,
            Status = b.Status,
            SpecialRequests = b.SpecialRequests,
            CancellationReason = cancellationReason,
            HasWarning = b.HasWarning,
            WarningMessage = b.WarningMessage,
            HasComplaint = b.HasComplaint,
            ComplaintText = b.ComplaintText,
            CreatedAt = b.CreatedAt,
            StatusHistories = historyList.Select(h => new BookingStatusHistoryDto
            {
                Id = h.Id,
                PreviousStatus = h.PreviousStatus,
                NewStatus = h.NewStatus,
                Reason = h.Reason,
                Timestamp = h.Timestamp
            }).ToList()
        };
    }
}
