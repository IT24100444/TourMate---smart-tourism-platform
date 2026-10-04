using System;
using TourMate.Domain.Enums;

namespace TourMate.Application.DTOs;

public class TourismPlaceDto
{
    public Guid Id { get; set; }
    public Guid CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string District { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string? OpeningHours { get; set; }
    public int EstimatedVisitDurationMinutes { get; set; }
    public decimal EntryFeeLkr { get; set; }
    public double AverageRating { get; set; }
    public int ReviewCount { get; set; }
    public PlaceStatus Status { get; set; }
    public string StatusName => Status.ToString();
    public List<string> Images { get; set; } = new();
    public DateTime CreatedAt { get; set; }
}

public class CreateTourismPlaceRequest
{
    public Guid CategoryId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string District { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string? OpeningHours { get; set; }
    public int EstimatedVisitDurationMinutes { get; set; } = 120;
    public decimal EntryFeeLkr { get; set; } = 0;
    public List<string> ImageUrls { get; set; } = new();
}

public class UpdateTourismPlaceRequest
{
    public Guid CategoryId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string District { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string? OpeningHours { get; set; }
    public int EstimatedVisitDurationMinutes { get; set; }
    public decimal EntryFeeLkr { get; set; }
    public List<string> ImageUrls { get; set; } = new();
}

public class PlaceApprovalRequest
{
    public ApprovalDecision Decision { get; set; }
    public string? Comments { get; set; }
}

public class PlaceFilterParams
{
    public string? SearchTerm { get; set; }
    public string? District { get; set; }
    public Guid? CategoryId { get; set; }
    public PlaceStatus? Status { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}

public class PlaceCategoryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Description { get; set; }
}

