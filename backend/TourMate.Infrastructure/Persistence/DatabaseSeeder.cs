using System;
using TourMate.Application.Interfaces;
using TourMate.Domain.Entities;
using TourMate.Domain.Enums;

namespace TourMate.Infrastructure.Persistence;

public static class DatabaseSeeder
{
    public static async Task SeedAsync(TourMateDbContext context, IPasswordHasher hasher)
    {
        await context.Database.EnsureCreatedAsync();
        if (context.Users.Any()) return; // Already seeded

        // 1. Seed Users
        var admin = new User
        {
            Id = Guid.Parse("11111111-1111-1111-1111-111111111111"),
            Email = "admin@tourmate.lk",
            FullName = "TourMate Platform Administrator",
            PasswordHash = hasher.HashPassword("Admin123!"),
            Role = UserRole.Administrator,
            Status = UserStatus.Active,
            PhoneNumber = "+94 11 234 5678"
        };

        var owner = new User
        {
            Id = Guid.Parse("22222222-2222-2222-2222-222222222222"),
            Email = "owner@tourmate.lk",
            FullName = "Sunil Perera (Hotelier & Host)",
            PasswordHash = hasher.HashPassword("Owner123!"),
            Role = UserRole.BusinessOwner,
            Status = UserStatus.Active,
            PhoneNumber = "+94 77 987 6543"
        };

        var tourist = new User
        {
            Id = Guid.Parse("33333333-3333-3333-3333-333333333333"),
            Email = "tourist@tourmate.lk",
            FullName = "Nimal Fernando (Explorer)",
            PasswordHash = hasher.HashPassword("Tourist123!"),
            Role = UserRole.Tourist,
            Status = UserStatus.Active,
            PhoneNumber = "+94 71 555 4321"
        };

        context.Users.AddRange(admin, owner, tourist);
        await context.SaveChangesAsync();

        // 2. Seed Place Categories
        var catNature = new PlaceCategory { Id = Guid.NewGuid(), Name = "Nature & Wildlife", Slug = "nature", IconName = "Mountain" };
        var catHeritage = new PlaceCategory { Id = Guid.NewGuid(), Name = "Heritage & Culture", Slug = "heritage", IconName = "Landmark" };
        var catAdventure = new PlaceCategory { Id = Guid.NewGuid(), Name = "Adventure & Hiking", Slug = "adventure", IconName = "Compass" };
        var catBeach = new PlaceCategory { Id = Guid.NewGuid(), Name = "Coastal & Beach", Slug = "beach", IconName = "Waves" };

        context.PlaceCategories.AddRange(catNature, catHeritage, catAdventure, catBeach);
        await context.SaveChangesAsync();

        // 3. Seed Tourism Places
        var pNineArch = new TourismPlace
        {
            Id = Guid.NewGuid(),
            CategoryId = catAdventure.Id,
            Name = "Nine Arch Bridge, Demodara",
            District = "Badulla",
            Description = "Iconic colonial-era viaduct bridge located in Ella amidst lush misty tea plantations. Trains crossing the massive stone arches create an unforgettable spectacle.",
            Latitude = 6.8768,
            Longitude = 81.0608,
            OpeningHours = "06:00 - 18:30",
            EstimatedVisitDurationMinutes = 90,
            EntryFeeLkr = 0,
            AverageRating = 4.9,
            ReviewCount = 128,
            Status = PlaceStatus.Approved
        };
        pNineArch.Media.Add(new PlaceMedia { PlaceId = pNineArch.Id, Url = "https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?w=1200", Caption = "Morning mist over Nine Arch Bridge", IsCover = true });

        var pLittleAdam = new TourismPlace
        {
            Id = Guid.NewGuid(),
            CategoryId = catAdventure.Id,
            Name = "Little Adam's Peak (Punchi Sri Pada)",
            District = "Badulla",
            Description = "An easy yet deeply rewarding hike in Ella offering 360-degree panoramic views across Ella Gap, lush ravines, and endless Ceylon tea estates.",
            Latitude = 6.8617,
            Longitude = 81.0573,
            OpeningHours = "Open 24 Hours (Sunrise/Sunset recommended)",
            EstimatedVisitDurationMinutes = 120,
            EntryFeeLkr = 0,
            AverageRating = 4.8,
            ReviewCount = 95,
            Status = PlaceStatus.Approved
        };
        pLittleAdam.Media.Add(new PlaceMedia { PlaceId = pLittleAdam.Id, Url = "https://images.unsplash.com/photo-1546708973-b339540b5162?w=1200", Caption = "Sunset overlooking Ella Gap", IsCover = true });

        var pSigiriya = new TourismPlace
        {
            Id = Guid.NewGuid(),
            CategoryId = catHeritage.Id,
            Name = "Sigiriya Ancient Rock Fortress",
            District = "Matale",
            Description = "UNESCO World Heritage ancient citadel rising 200 meters above the central plains, featuring 5th-century frescoes, mirror wall graffiti, and royal water gardens.",
            Latitude = 7.9570,
            Longitude = 80.7603,
            OpeningHours = "07:00 - 17:30",
            EstimatedVisitDurationMinutes = 180,
            EntryFeeLkr = 11000,
            AverageRating = 4.9,
            ReviewCount = 310,
            Status = PlaceStatus.Approved
        };
        pSigiriya.Media.Add(new PlaceMedia { PlaceId = pSigiriya.Id, Url = "https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=1200", Caption = "Majestic Sigiriya Lion Rock", IsCover = true });

        var pGalleFort = new TourismPlace
        {
            Id = Guid.NewGuid(),
            CategoryId = catHeritage.Id,
            Name = "Galle Dutch Fort",
            District = "Galle",
            Description = "Historic 17th-century coastal fortress blending European architectural styles with South Asian traditions, fortified ramparts, cobblestone alleys, and ocean views.",
            Latitude = 6.0270,
            Longitude = 80.2170,
            OpeningHours = "Open 24 Hours",
            EstimatedVisitDurationMinutes = 150,
            EntryFeeLkr = 0,
            AverageRating = 4.7,
            ReviewCount = 240,
            Status = PlaceStatus.Approved
        };
        pGalleFort.Media.Add(new PlaceMedia { PlaceId = pGalleFort.Id, Url = "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=1200", Caption = "Galle Fort Lighthouse at Sunset", IsCover = true });

        var pEllaRock = new TourismPlace
        {
            Id = Guid.NewGuid(),
            CategoryId = catAdventure.Id,
            Name = "Ella Rock Wilderness Trek",
            District = "Badulla",
            Description = "Exhilarating trek through eucalyptus forests, railway tracks, and tea plantations ending at a cliff precipice offering vertigo-inducing vistas.",
            Latitude = 6.8524,
            Longitude = 81.0428,
            OpeningHours = "06:00 - 17:00",
            EstimatedVisitDurationMinutes = 240,
            EntryFeeLkr = 1000,
            AverageRating = 4.8,
            ReviewCount = 88,
            Status = PlaceStatus.PendingReview // For testing Admin moderation queue!
        };
        pEllaRock.Media.Add(new PlaceMedia { PlaceId = pEllaRock.Id, Url = "https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?w=1200", Caption = "Ella Rock summit", IsCover = true });

        context.TourismPlaces.AddRange(pNineArch, pLittleAdam, pSigiriya, pGalleFort, pEllaRock);
        await context.SaveChangesAsync();

        // 4. Seed Businesses (Hotel & Restaurant in Ella)
        var bHotel = new Business
        {
            Id = Guid.NewGuid(),
            OwnerUserId = owner.Id,
            Name = "Ella Gap Panoramic Eco Resort",
            Type = BusinessType.Hotel,
            District = "Badulla",
            Address = "Passara Road, Ella, Sri Lanka",
            Latitude = 6.8680,
            Longitude = 81.0510,
            ContactPhone = "+94 57 222 8899",
            ContactEmail = "stay@ellagapresort.lk",
            Description = "Luxury eco-lodge perched on the hillside of Ella with uninterrupted views of Ella Rock, private infinity plunge pools, and organic tea gardens.",
            PriceRange = "$$$",
            Rating = 4.8,
            ReviewCount = 56,
            VerificationStatus = VerificationStatus.Active
        };
        bHotel.HotelDetails = new Hotel
        {
            BusinessId = bHotel.Id,
            StarRating = 4,
            CheckInTime = "14:00",
            CheckOutTime = "11:00",
            AmenitiesJson = "[\"Infinity Pool\", \"Mountain View Balcony\", \"Complimentary Ceylon Tea Bar\", \"Free High-Speed WiFi\", \"Organic Restaurant\"]",
            RoomTypesJson = "[{\"type\":\"Deluxe Mountain View\",\"price\":18000,\"capacity\":2},{\"type\":\"Panoramic Master Suite\",\"price\":28000,\"capacity\":4}]"
        };
        bHotel.Media.Add(new BusinessMedia { BusinessId = bHotel.Id, Url = "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200", Caption = "Infinity pool over Ella Gap", IsCover = true });
        bHotel.Offers.Add(new Offer
        {
            BusinessId = bHotel.Id,
            Title = "Green Season Getaway 15% Off",
            Description = "Enjoy 15% discount on 2+ nights stays including free guided morning nature trek.",
            DiscountPercent = 15,
            StartDate = DateTime.UtcNow.AddDays(-5),
            EndDate = DateTime.UtcNow.AddMonths(2),
            Status = OfferStatus.Active
        });

        // Availability slots for the next 30 days
        for (int i = 0; i < 14; i++)
        {
            bHotel.AvailabilitySlots.Add(new AvailabilitySlot
            {
                BusinessId = bHotel.Id,
                Date = DateTime.UtcNow.Date.AddDays(i),
                TotalCapacity = 8,
                BookedCount = i % 3 == 0 ? 2 : 0,
                PricePerUnitLkr = 18000
            });
        }

        var bRestaurant = new Business
        {
            Id = Guid.NewGuid(),
            OwnerUserId = owner.Id,
            Name = "Cafe Chill Ella & Artisan Kitchen",
            Type = BusinessType.Restaurant,
            District = "Badulla",
            Address = "Main Street, Ella, Sri Lanka",
            Latitude = 6.8655,
            Longitude = 81.0475,
            ContactPhone = "+94 57 222 9900",
            ContactEmail = "hello@cafechillella.lk",
            Description = "Famous relaxed social hub of Ella serving wood-fired artisanal pizzas, clay-pot Sri Lankan curries, and fresh tropical fruit smoothies with chilled music.",
            PriceRange = "$$",
            Rating = 4.9,
            ReviewCount = 210,
            VerificationStatus = VerificationStatus.Active
        };
        bRestaurant.RestaurantDetails = new Restaurant
        {
            BusinessId = bRestaurant.Id,
            CuisineType = "Sri Lankan Clay Pot & International Fusion",
            OpeningHours = "07:30 - 23:00",
            DiningFeaturesJson = "[\"Wood-fired Oven\", \"Open Air Lounge\", \"Vegan & Gluten-Free Menus\", \"Craft Cocktails\"]",
            AverageCostPerPersonLkr = 3500
        };
        bRestaurant.Media.Add(new BusinessMedia { BusinessId = bRestaurant.Id, Url = "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200", Caption = "Open air dining lounge", IsCover = true });

        context.Businesses.AddRange(bHotel, bRestaurant);
        await context.SaveChangesAsync();

        // 5. Seed a Sample Booking for Demonstration
        var sampleBooking = new Booking
        {
            TouristUserId = tourist.Id,
            BusinessId = bHotel.Id,
            StartDate = DateTime.UtcNow.Date.AddDays(5),
            EndDate = DateTime.UtcNow.Date.AddDays(7),
            GuestsCount = 2,
            TotalAmountLkr = 36000,
            Status = BookingStatus.Pending,
            SpecialRequests = "Quiet room with mountain view for anniversary."
        };
        sampleBooking.StatusHistories.Add(new BookingStatusHistory
        {
            BookingId = sampleBooking.Id,
            PreviousStatus = BookingStatus.Pending,
            NewStatus = BookingStatus.Pending,
            ChangedByUserId = tourist.Id,
            Reason = "Initial reservation request by tourist."
        });
        context.Bookings.Add(sampleBooking);

        // 6. Seed Sample Review and Favourite
        context.Reviews.Add(new Review
        {
            TouristUserId = tourist.Id,
            TargetType = "Place",
            TargetId = pNineArch.Id,
            Rating = 5,
            Comment = "Truly breathtaking bridge! Watching the blue train pass over the stone arches while sipping hot tea is a memory I will never forget."
        });

        context.Favourites.Add(new Favourite
        {
            UserId = tourist.Id,
            TargetType = "Place",
            TargetId = pNineArch.Id
        });

        await context.SaveChangesAsync();
    }
}
