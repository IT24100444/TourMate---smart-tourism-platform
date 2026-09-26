using System;
using TourMate.Domain.Enums;

namespace TourMate.Domain.Entities;

public class PlaceCategory
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? IconName { get; set; }
    public ICollection<TourismPlace> Places { get; set; } = new List<TourismPlace>();
}

public class TourismPlace
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CategoryId { get; set; }
    public PlaceCategory? Category { get; set; }

    public string Name { get; set; } = string.Empty;
    public string District { get; set; } = string.Empty; // e.g. Badulla (Ella), Matale (Sigiriya), Kandy, Galle
    public string Description { get; set; } = string.Empty;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string? OpeningHours { get; set; }
    public int EstimatedVisitDurationMinutes { get; set; } = 120;
    public decimal EntryFeeLkr { get; set; } = 0;
    public double AverageRating { get; set; } = 4.5;
    public int ReviewCount { get; set; } = 0;
    
    public PlaceStatus Status { get; set; } = PlaceStatus.Draft;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public ICollection<PlaceMedia> Media { get; set; } = new List<PlaceMedia>();
    public ICollection<PlaceApprovalHistory> ApprovalHistories { get; set; } = new List<PlaceApprovalHistory>();
}

public class PlaceMedia
{
    public Guid Id { get; set; }
    public Guid PlaceId { get; set; }
    public TourismPlace? Place { get; set; }

    public string Url { get; set; } = string.Empty;
    public string? Caption { get; set; }
    public bool IsCover { get; set; }
}

public class PlaceApprovalHistory
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid PlaceId { get; set; }
    public TourismPlace? Place { get; set; }

    public Guid ReviewedByUserId { get; set; }
    public ApprovalDecision Decision { get; set; }
    public string? Comments { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
