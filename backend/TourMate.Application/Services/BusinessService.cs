using System;
using TourMate.Application.DTOs;
using TourMate.Application.Interfaces;
using TourMate.Domain.Entities;
using TourMate.Domain.Enums;

namespace TourMate.Application.Services;

public class BusinessService : IBusinessService
{
    private readonly IUnitOfWork _uow;

    public BusinessService(IUnitOfWork uow)
    {
        _uow = uow;
    }

    public async Task<ApiResponse<PagedResult<BusinessDto>>> GetBusinessesAsync(string? district, BusinessType? type, VerificationStatus? status, int page, int pageSize)
    {
        var all = await _uow.Businesses.GetAllAsync();
        var query = all.AsEnumerable();

        if (status.HasValue)
        {
            query = query.Where(b => b.VerificationStatus == status.Value);
        }
        else
        {
            query = query.Where(b => b.VerificationStatus == VerificationStatus.Active);
        }

        if (!string.IsNullOrWhiteSpace(district))
        {
            query = query.Where(b => b.District.Equals(district, StringComparison.OrdinalIgnoreCase));
        }

        if (type.HasValue)
        {
            query = query.Where(b => b.Type == type.Value);
        }

        var totalItems = query.Count();
        var items = query
            .OrderByDescending(b => b.Rating)
            .ThenByDescending(b => b.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(MapToDto)
            .ToList();

        return ApiResponse<PagedResult<BusinessDto>>.Ok(new PagedResult<BusinessDto>
        {
            Items = items,
            Page = page,
            PageSize = pageSize,
            TotalItems = totalItems
        });
    }

    public async Task<ApiResponse<BusinessDto>> GetBusinessByIdAsync(Guid id)
    {
        var business = await _uow.Businesses.GetByIdAsync(id);
        if (business == null)
            return ApiResponse<BusinessDto>.Fail("Business not found.");

        return ApiResponse<BusinessDto>.Ok(MapToDto(business));
    }

    public async Task<ApiResponse<List<BusinessDto>>> GetMyBusinessesAsync(Guid ownerUserId)
    {
        var businesses = await _uow.Businesses.FindAsync(b => b.OwnerUserId == ownerUserId);
        return ApiResponse<List<BusinessDto>>.Ok(businesses.OrderByDescending(b => b.CreatedAt).Select(MapToDto).ToList());
    }

    public async Task<ApiResponse<BusinessDto>> CreateBusinessAsync(CreateBusinessRequest request, Guid ownerUserId, bool isAdmin = false)
    {
        var business = new Business
        {
            OwnerUserId = ownerUserId,
            Name = request.Name.Trim(),
            Type = request.Type,
            District = request.District.Trim(),
            Address = request.Address.Trim(),
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            ContactPhone = request.ContactPhone.Trim(),
            ContactEmail = request.ContactEmail.Trim(),
            Description = request.Description,
            PriceRange = request.PriceRange,
            VerificationStatus = isAdmin ? VerificationStatus.Active : VerificationStatus.PendingVerification, // Direct admin listing is immediately active; Business Owner listing enters Pending Review Queue
            CreatedAt = DateTime.UtcNow
        };

        if (request.Type == BusinessType.Hotel)
        {
            business.HotelDetails = new Hotel
            {
                BusinessId = business.Id,
                StarRating = request.StarRating ?? 4,
                CheckInTime = request.CheckInTime ?? "14:00",
                CheckOutTime = request.CheckOutTime ?? "11:00",
                AmenitiesJson = request.AmenitiesJson ?? "[\"Free WiFi\", \"Breakfast\", \"Mountain View\"]",
                RoomTypesJson = request.RoomTypesJson ?? "[{\"type\":\"Standard Double\",\"price\":12000}]"
            };
        }
        else
        {
            business.RestaurantDetails = new Restaurant
            {
                BusinessId = business.Id,
                CuisineType = request.CuisineType ?? "Sri Lankan Traditional",
                OpeningHours = request.OpeningHours ?? "08:00 - 22:00",
                DiningFeaturesJson = request.DiningFeaturesJson ?? "[\"Outdoor Dining\", \"Vegetarian Options\"]",
                AverageCostPerPersonLkr = request.AverageCostPerPersonLkr ?? 2000
            };
        }

        foreach (var url in request.ImageUrls)
        {
            business.Media.Add(new BusinessMedia
            {
                BusinessId = business.Id,
                Url = url,
                IsCover = business.Media.Count == 0
            });
        }

        await _uow.Businesses.AddAsync(business);
        await _uow.SaveChangesAsync();

        var msg = isAdmin 
            ? "Business listing verified and published immediately." 
            : "Business listing submitted successfully. It is now awaiting administrator review in the pending queue.";

        return ApiResponse<BusinessDto>.Ok(MapToDto(business), msg);
    }

    public async Task<ApiResponse<BusinessDto>> UpdateBusinessAsync(Guid id, UpdateBusinessRequest request, Guid ownerUserId)
    {
        var business = await _uow.Businesses.GetByIdAsync(id);
        if (business == null)
            return ApiResponse<BusinessDto>.Fail("Business not found.");

        if (business.OwnerUserId != ownerUserId)
            return ApiResponse<BusinessDto>.Fail("Access denied. You do not own this business.");

        business.Name = request.Name.Trim();
        business.District = request.District.Trim();
        business.Address = request.Address.Trim();
        business.Latitude = request.Latitude;
        business.Longitude = request.Longitude;
        business.ContactPhone = request.ContactPhone.Trim();
        business.ContactEmail = request.ContactEmail.Trim();
        business.Description = request.Description;
        business.PriceRange = request.PriceRange;
        business.UpdatedAt = DateTime.UtcNow;

        await _uow.Businesses.UpdateAsync(business);
        await _uow.SaveChangesAsync();

        return ApiResponse<BusinessDto>.Ok(MapToDto(business), "Business updated successfully.");
    }

    public async Task<ApiResponse<bool>> DeleteBusinessAsync(Guid id, Guid userId, bool isAdmin)
    {
        var business = await _uow.Businesses.GetByIdAsync(id);
        if (business == null)
            return ApiResponse<bool>.Fail("Business not found.");

        if (!isAdmin && business.OwnerUserId != userId)
            return ApiResponse<bool>.Fail("Access denied. You do not own this business.");

        await _uow.Businesses.DeleteAsync(business);
        await _uow.SaveChangesAsync();

        return ApiResponse<bool>.Ok(true, "Business deleted successfully.");
    }

    public async Task<ApiResponse<bool>> VerifyBusinessAsync(Guid id, BusinessVerificationRequest request, Guid adminUserId)
    {
        var business = await _uow.Businesses.GetByIdAsync(id);
        if (business == null)
            return ApiResponse<bool>.Fail("Business not found.");

        business.VerificationStatus = request.Status;
        business.UpdatedAt = DateTime.UtcNow;

        await _uow.Businesses.UpdateAsync(business);
        await _uow.SaveChangesAsync();

        var actionText = request.Status == VerificationStatus.Active ? "approved and published to front list" : request.Status.ToString();
        return ApiResponse<bool>.Ok(true, $"Business verification status updated: {actionText}.");
    }

    public async Task<ApiResponse<AvailabilitySlotDto>> AddAvailabilitySlotAsync(Guid businessId, CreateAvailabilitySlotRequest request, Guid ownerUserId)
    {
        var business = await _uow.Businesses.GetByIdAsync(businessId);
        if (business == null)
            return ApiResponse<AvailabilitySlotDto>.Fail("Business not found.");

        if (business.OwnerUserId != ownerUserId)
            return ApiResponse<AvailabilitySlotDto>.Fail("Access denied.");

        var slot = new AvailabilitySlot
        {
            BusinessId = businessId,
            Date = request.Date.ToUniversalTime().Date,
            TotalCapacity = request.TotalCapacity,
            PricePerUnitLkr = request.PricePerUnitLkr
        };

        await _uow.AvailabilitySlots.AddAsync(slot);
        await _uow.SaveChangesAsync();

        return ApiResponse<AvailabilitySlotDto>.Ok(new AvailabilitySlotDto
        {
            Id = slot.Id,
            BusinessId = slot.BusinessId,
            Date = slot.Date,
            TotalCapacity = slot.TotalCapacity,
            BookedCount = slot.BookedCount,
            PricePerUnitLkr = slot.PricePerUnitLkr
        }, "Availability slot added.");
    }

    public async Task<ApiResponse<OfferDto>> AddOfferAsync(Guid businessId, CreateOfferRequest request, Guid ownerUserId)
    {
        var business = await _uow.Businesses.GetByIdAsync(businessId);
        if (business == null)
            return ApiResponse<OfferDto>.Fail("Business not found.");

        // Strictly enforce business owner autonomy: Only the property owner can create offers
        if (business.OwnerUserId != ownerUserId)
            return ApiResponse<OfferDto>.Fail("Access denied. Only the registered business owner can create or manage offers for this property.");

        if (request.EndDate <= request.StartDate)
            return ApiResponse<OfferDto>.Fail("End date must be after start date.");

        var offer = new Offer
        {
            BusinessId = businessId,
            Title = request.Title.Trim(),
            Description = request.Description.Trim(),
            DiscountPercent = request.DiscountPercent,
            StartDate = request.StartDate.ToUniversalTime(),
            EndDate = request.EndDate.ToUniversalTime(),
            Status = OfferStatus.Active
        };

        await _uow.Offers.AddAsync(offer);
        await _uow.SaveChangesAsync();

        return ApiResponse<OfferDto>.Ok(new OfferDto
        {
            Id = offer.Id,
            BusinessId = offer.BusinessId,
            Title = offer.Title,
            Description = offer.Description,
            DiscountPercent = offer.DiscountPercent,
            StartDate = offer.StartDate,
            EndDate = offer.EndDate,
            Status = offer.Status
        }, "Offer created successfully.");
    }

    public async Task<ApiResponse<bool>> DeleteOfferAsync(Guid businessId, Guid offerId, Guid ownerUserId)
    {
        var business = await _uow.Businesses.GetByIdAsync(businessId);
        if (business == null)
            return ApiResponse<bool>.Fail("Business not found.");

        if (business.OwnerUserId != ownerUserId)
            return ApiResponse<bool>.Fail("Access denied. Only the registered business owner can manage offers for this property.");

        var offer = business.Offers.FirstOrDefault(o => o.Id == offerId);
        if (offer == null)
            return ApiResponse<bool>.Fail("Offer not found.");

        await _uow.Offers.DeleteAsync(offer);
        await _uow.SaveChangesAsync();

        return ApiResponse<bool>.Ok(true, "Offer removed successfully.");
    }

    private static BusinessDto MapToDto(Business b)
    {
        return new BusinessDto
        {
            Id = b.Id,
            OwnerUserId = b.OwnerUserId,
            Name = b.Name,
            Type = b.Type,
            District = b.District,
            Address = b.Address,
            Latitude = b.Latitude,
            Longitude = b.Longitude,
            ContactPhone = b.ContactPhone,
            ContactEmail = b.ContactEmail,
            Description = b.Description,
            PriceRange = b.PriceRange,
            Rating = b.Rating,
            ReviewCount = b.ReviewCount,
            VerificationStatus = b.VerificationStatus,
            Hotel = b.HotelDetails == null ? null : new HotelDetailsDto
            {
                StarRating = b.HotelDetails.StarRating,
                CheckInTime = b.HotelDetails.CheckInTime,
                CheckOutTime = b.HotelDetails.CheckOutTime,
                AmenitiesJson = b.HotelDetails.AmenitiesJson,
                RoomTypesJson = b.HotelDetails.RoomTypesJson
            },
            Restaurant = b.RestaurantDetails == null ? null : new RestaurantDetailsDto
            {
                CuisineType = b.RestaurantDetails.CuisineType,
                OpeningHours = b.RestaurantDetails.OpeningHours,
                DiningFeaturesJson = b.RestaurantDetails.DiningFeaturesJson,
                AverageCostPerPersonLkr = b.RestaurantDetails.AverageCostPerPersonLkr
            },
            Offers = b.Offers.Select(o => new OfferDto
            {
                Id = o.Id,
                BusinessId = o.BusinessId,
                Title = o.Title,
                Description = o.Description,
                DiscountPercent = o.DiscountPercent,
                StartDate = o.StartDate,
                EndDate = o.EndDate,
                Status = o.Status
            }).ToList(),
            AvailabilitySlots = b.AvailabilitySlots.Select(s => new AvailabilitySlotDto
            {
                Id = s.Id,
                BusinessId = s.BusinessId,
                Date = s.Date,
                TotalCapacity = s.TotalCapacity,
                BookedCount = s.BookedCount,
                PricePerUnitLkr = s.PricePerUnitLkr
            }).ToList(),
            Images = b.Media.Select(m => m.Url).ToList()
        };
    }
}
