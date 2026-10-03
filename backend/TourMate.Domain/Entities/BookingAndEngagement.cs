using System;
using System.ComponentModel.DataAnnotations.Schema;
using TourMate.Domain.Enums;

namespace TourMate.Domain.Entities;

public class Booking
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string BookingReference { get; set; } = $"TM-{DateTime.UtcNow:yyyyMMdd}-{Random.Shared.Next(1000, 9999)}";

    public Guid TouristUserId { get; set; }
    public User? Tourist { get; set; }

    public Guid BusinessId { get; set; }
    public Business? Business { get; set; }

    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public int GuestsCount { get; set; } = 2;
    public decimal TotalAmountLkr { get; set; }
    public BookingStatus Status { get; set; } = BookingStatus.Pending;
    public string? SpecialRequests { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public bool HasWarning { get; set; } = false;
    public string? WarningMessage { get; set; }

    public bool HasComplaint { get; set; } = false;
    public string? ComplaintText { get; set; }

    public ICollection<BookingStatusHistory> StatusHistories { get; set; } = new List<BookingStatusHistory>();
}

public class BookingStatusHistory
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid BookingId { get; set; }
    public Booking? Booking { get; set; }

    public BookingStatus PreviousStatus { get; set; }
    public BookingStatus NewStatus { get; set; }
    public Guid ChangedByUserId { get; set; }
    public string? Reason { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

public class BookingComplaint
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [ForeignKey(nameof(Booking))]
    public Guid BookingId { get; set; }
    public Booking? Booking { get; set; }

    [ForeignKey(nameof(Tourist))]
    public Guid TouristUserId { get; set; }
    public User? Tourist { get; set; }

    [ForeignKey(nameof(Business))]
    public Guid BusinessId { get; set; }
    public Business? Business { get; set; }

    public string ComplaintText { get; set; } = string.Empty;
    public string Status { get; set; } = "Pending"; // "Pending", "WarningSent", "Dismissed"
    public string? AdminWarningMessage { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ResolvedAt { get; set; }
}

public class Review
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TouristUserId { get; set; }
    public User? Tourist { get; set; }

    public string TargetType { get; set; } = "Place"; // "Place" or "Business"
    public Guid TargetId { get; set; }
    public Guid? BookingId { get; set; }
    public Booking? Booking { get; set; }

    public int Rating { get; set; } = 5; // 1 to 5
    public string Comment { get; set; } = string.Empty;
    public ReviewStatus Status { get; set; } = ReviewStatus.Approved;

    // Host Engagement
    public string? OwnerReply { get; set; }
    public DateTime? OwnerRepliedAt { get; set; }
    public bool IsHeartedByOwner { get; set; } = false;
    public DateTime? OwnerHeartedAt { get; set; }

    // Deletion / Moderation tracking
    public bool IsDeletedByOwner { get; set; } = false;
    public bool IsDeletedByTourist { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}

public class Favourite
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public User? User { get; set; }

    public string TargetType { get; set; } = "Place"; // "Place" or "Business"
    public Guid TargetId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class Notification
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public User? User { get; set; }

    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? ActionUrl { get; set; }
    public bool IsRead { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
