using System;
using TourMate.Domain.Enums;

namespace TourMate.Domain.Entities;

public class Business
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OwnerUserId { get; set; }
    public User? Owner { get; set; }

    public string Name { get; set; } = string.Empty;
    public BusinessType Type { get; set; } = BusinessType.Hotel;
    public string District { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string ContactPhone { get; set; } = string.Empty;
    public string ContactEmail { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string PriceRange { get; set; } = "$$"; // $, $$, $$$, $$$$
    public double Rating { get; set; } = 4.8;
    public int ReviewCount { get; set; } = 0;

    public VerificationStatus VerificationStatus { get; set; } = VerificationStatus.Draft;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Specialized details
    public Hotel? HotelDetails { get; set; }
    public Restaurant? RestaurantDetails { get; set; }

    // Child collections
    public ICollection<AvailabilitySlot> AvailabilitySlots { get; set; } = new List<AvailabilitySlot>();
    public ICollection<Offer> Offers { get; set; } = new List<Offer>();
    public ICollection<BusinessMedia> Media { get; set; } = new List<BusinessMedia>();
    public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
}

public class Hotel
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid BusinessId { get; set; }
    public Business? Business { get; set; }

    public int StarRating { get; set; } = 4;
    public string CheckInTime { get; set; } = "14:00";
    public string CheckOutTime { get; set; } = "11:00";
    public string AmenitiesJson { get; set; } = "[\"Free WiFi\", \"Pool\", \"Mountain View\", \"Restaurant\", \"Spa\"]";
    public string RoomTypesJson { get; set; } = "[{\"type\":\"Deluxe Double\",\"price\":14000,\"capacity\":2},{\"type\":\"Panoramic Suite\",\"price\":22000,\"capacity\":3}]";
}

public class Restaurant
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid BusinessId { get; set; }
    public Business? Business { get; set; }

    public string CuisineType { get; set; } = "Authentic Sri Lankan & Fusion";
    public string OpeningHours { get; set; } = "07:00 - 22:30";
    public string DiningFeaturesJson { get; set; } = "[\"Organic Ingredients\", \"Scenic Outdoor Seating\", \"Vegetarian Friendly\", \"Vegan Options\"]";
    public decimal AverageCostPerPersonLkr { get; set; } = 2500;
}

public class AvailabilitySlot
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid BusinessId { get; set; }
    public Business? Business { get; set; }

    public DateTime Date { get; set; }
    public int TotalCapacity { get; set; } = 10;
    public int BookedCount { get; set; } = 0;
    public decimal PricePerUnitLkr { get; set; } = 12000;
    public bool IsAvailable => (TotalCapacity - BookedCount) > 0;
}

public class Offer
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid BusinessId { get; set; }
    public Business? Business { get; set; }

    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal DiscountPercent { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public OfferStatus Status { get; set; } = OfferStatus.Active;
}

public class BusinessMedia
{
    public Guid Id { get; set; }
    public Guid BusinessId { get; set; }
    public Business? Business { get; set; }

    public string Url { get; set; } = string.Empty;
    public string? Caption { get; set; }
    public bool IsCover { get; set; }
}
