using System;
using TourMate.Domain.Enums;

namespace TourMate.Application.DTOs;

public class BookingDto
{
    public Guid Id { get; set; }
    public string BookingReference { get; set; } = string.Empty;
    public Guid TouristUserId { get; set; }
    public string TouristName { get; set; } = string.Empty;
    public string TouristEmail { get; set; } = string.Empty;
    public Guid BusinessId { get; set; }
    public string BusinessName { get; set; } = string.Empty;
    public BusinessType BusinessType { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public int GuestsCount { get; set; }
    public decimal TotalAmountLkr { get; set; }
    public BookingStatus Status { get; set; }
    public string StatusName => Status.ToString();
    public string? SpecialRequests { get; set; }
    public string? CancellationReason { get; set; }
    public bool HasWarning { get; set; }
    public string? WarningMessage { get; set; }
    public bool HasComplaint { get; set; }
    public string? ComplaintText { get; set; }
    public bool IsExpired => Status == BookingStatus.Expired;
    public DateTime CreatedAt { get; set; }
    public List<BookingStatusHistoryDto> StatusHistories { get; set; } = new();
}

public class BookingStatusHistoryDto
{
    public Guid Id { get; set; }
    public BookingStatus PreviousStatus { get; set; }
    public BookingStatus NewStatus { get; set; }
    public string? Reason { get; set; }
    public DateTime Timestamp { get; set; }
}

public class CreateBookingRequest
{
    public Guid BusinessId { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public int GuestsCount { get; set; } = 2;
    public string? SpecialRequests { get; set; }
}

public class UpdateBookingStatusRequest
{
    public BookingStatus Status { get; set; }
    public BookingStatus? NewStatus { set { if (value.HasValue) Status = value.Value; } }
    public string? Reason { get; set; }
}

public class ReviewDto
{
    public Guid Id { get; set; }
    public Guid TouristUserId { get; set; }
    public string TouristName { get; set; } = string.Empty;
    public string TargetType { get; set; } = string.Empty;
    public Guid TargetId { get; set; }
    public Guid? BookingId { get; set; }
    public string? BookingReference { get; set; }
    public string? BusinessName { get; set; }

    public int Rating { get; set; }
    public string Comment { get; set; } = string.Empty;
    public ReviewStatus Status { get; set; }

    // Host Engagement
    public string? OwnerReply { get; set; }
    public DateTime? OwnerRepliedAt { get; set; }
    public bool IsHeartedByOwner { get; set; }
    public DateTime? OwnerHeartedAt { get; set; }

    // Deletion tracking
    public bool IsDeletedByOwner { get; set; }
    public bool IsDeletedByTourist { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class PlaceReviewAdminDto
{
    public Guid Id { get; set; }
    public Guid TouristUserId { get; set; }
    public string TouristName { get; set; } = string.Empty;
    public string TouristEmail { get; set; } = string.Empty;
    public Guid PlaceId { get; set; }
    public string PlaceName { get; set; } = string.Empty;
    public string? PlaceDistrict { get; set; }
    public string? PlaceCategory { get; set; }
    public string? PlaceImageUrl { get; set; }
    public int Rating { get; set; }
    public string Comment { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class CreateReviewRequest
{
    public string TargetType { get; set; } = "Place";
    public Guid TargetId { get; set; }
    public int Rating { get; set; } = 5;
    public string Comment { get; set; } = string.Empty;
}

public class CreateBookingReviewRequest
{
    public int Rating { get; set; } = 5;
    public string Comment { get; set; } = string.Empty;
}

public class UpdateReviewRequest
{
    public int Rating { get; set; } = 5;
    public string Comment { get; set; } = string.Empty;
}

public class ReplyReviewRequest
{
    public string Reply { get; set; } = string.Empty;
}

public class ReactReviewRequest
{
    public bool IsHearted { get; set; } = true;
}

public class FavouriteDto
{
    public Guid Id { get; set; }
    public string TargetType { get; set; } = string.Empty;
    public Guid TargetId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Subtitle { get; set; }
    public string? ImageUrl { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class NotificationDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? ActionUrl { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class SubmitComplaintRequest
{
    public string ComplaintText { get; set; } = string.Empty;
}

public class SendWarningRequest
{
    public string WarningMessage { get; set; } = "Be careful about your booking. Approve bookings in right time.";
}

public class BookingComplaintDto
{
    public Guid Id { get; set; }
    public Guid BookingId { get; set; }
    public string BookingReference { get; set; } = string.Empty;
    public Guid TouristUserId { get; set; }
    public string TouristName { get; set; } = string.Empty;
    public string TouristEmail { get; set; } = string.Empty;
    public Guid BusinessId { get; set; }
    public string BusinessName { get; set; } = string.Empty;
    public BusinessType BusinessType { get; set; }
    public string ComplaintText { get; set; } = string.Empty;
    public string Status { get; set; } = "Pending";
    public string? AdminWarningMessage { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
}
