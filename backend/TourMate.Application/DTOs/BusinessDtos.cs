using System;
using TourMate.Domain.Enums;

namespace TourMate.Application.DTOs;

public class BusinessDto
{
    public Guid Id { get; set; }
    public Guid OwnerUserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public BusinessType Type { get; set; }
    public string TypeName => Type.ToString();
    public string District { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string ContactPhone { get; set; } = string.Empty;
    public string ContactEmail { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string PriceRange { get; set; } = "$$";
    public double Rating { get; set; }
    public int ReviewCount { get; set; }
    public VerificationStatus VerificationStatus { get; set; }
    public string StatusName => VerificationStatus.ToString();

    // Specifics
    public HotelDetailsDto? Hotel { get; set; }
    public RestaurantDetailsDto? Restaurant { get; set; }
    public List<AvailabilitySlotDto> AvailabilitySlots { get; set; } = new();
    public List<OfferDto> Offers { get; set; } = new();
    public List<string> Images { get; set; } = new();
}

public class HotelDetailsDto
{
    public int StarRating { get; set; }
    public string CheckInTime { get; set; } = "14:00";
    public string CheckOutTime { get; set; } = "11:00";
    public string AmenitiesJson { get; set; } = "[]";
    public string RoomTypesJson { get; set; } = "[]";
}

public class RestaurantDetailsDto
{
    public string CuisineType { get; set; } = string.Empty;
    public string OpeningHours { get; set; } = string.Empty;
    public string DiningFeaturesJson { get; set; } = "[]";
    public decimal AverageCostPerPersonLkr { get; set; }
}

public class CreateBusinessRequest
{
    public string Name { get; set; } = string.Empty;
    public BusinessType Type { get; set; }
    public string District { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string ContactPhone { get; set; } = string.Empty;
    public string ContactEmail { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string PriceRange { get; set; } = "$$";

    // Hotel details
    public int? StarRating { get; set; }
    public string? CheckInTime { get; set; }
    public string? CheckOutTime { get; set; }
    public string? AmenitiesJson { get; set; }
    public string? RoomTypesJson { get; set; }

    // Restaurant details
    public string? CuisineType { get; set; }
    public string? OpeningHours { get; set; }
    public string? DiningFeaturesJson { get; set; }
    public decimal? AverageCostPerPersonLkr { get; set; }

    public List<string> ImageUrls { get; set; } = new();
}

public class UpdateBusinessRequest : CreateBusinessRequest { }

public class AvailabilitySlotDto
{
    public Guid Id { get; set; }
    public Guid BusinessId { get; set; }
    public DateTime Date { get; set; }
    public int TotalCapacity { get; set; }
    public int BookedCount { get; set; }
    public int RemainingCapacity => Math.Max(0, TotalCapacity - BookedCount);
    public decimal PricePerUnitLkr { get; set; }
}

public class CreateAvailabilitySlotRequest
{
    public DateTime Date { get; set; }
    public int TotalCapacity { get; set; }
    public decimal PricePerUnitLkr { get; set; }
}

public class OfferDto
{
    public Guid Id { get; set; }
    public Guid BusinessId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal DiscountPercent { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public OfferStatus Status { get; set; }
}

public class CreateOfferRequest
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal DiscountPercent { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
}

public class BusinessVerificationRequest
{
    public VerificationStatus Status { get; set; }
    public string? Feedback { get; set; }
}
