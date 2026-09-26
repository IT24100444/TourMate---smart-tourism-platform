using System;
using Microsoft.EntityFrameworkCore;
using TourMate.Domain.Entities;
using TourMate.Domain.Enums;

namespace TourMate.Infrastructure.Persistence;

public class TourMateDbContext : DbContext
{
    public TourMateDbContext(DbContextOptions<TourMateDbContext> options) : base(options)
    {
    }

    // Shared / Core
    public DbSet<User> Users => Set<User>();

    // Component A: Tourism Places
    public DbSet<PlaceCategory> PlaceCategories => Set<PlaceCategory>();
    public DbSet<TourismPlace> TourismPlaces => Set<TourismPlace>();
    public DbSet<PlaceMedia> PlaceMedias => Set<PlaceMedia>();
    public DbSet<PlaceApprovalHistory> PlaceApprovalHistories => Set<PlaceApprovalHistory>();

    // Component B: Accommodation & Dining
    public DbSet<Business> Businesses => Set<Business>();
    public DbSet<Hotel> Hotels => Set<Hotel>();
    public DbSet<Restaurant> Restaurants => Set<Restaurant>();
    public DbSet<AvailabilitySlot> AvailabilitySlots => Set<AvailabilitySlot>();
    public DbSet<Offer> Offers => Set<Offer>();
    public DbSet<BusinessMedia> BusinessMedias => Set<BusinessMedia>();

    // Component C: Bookings & Engagement
    public DbSet<Booking> Bookings => Set<Booking>();
    public DbSet<BookingStatusHistory> BookingStatusHistories => Set<BookingStatusHistory>();
    public DbSet<BookingComplaint> BookingComplaints => Set<BookingComplaint>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<Favourite> Favourites => Set<Favourite>();
    public DbSet<Notification> Notifications => Set<Notification>();

    // Component D: Trips & AI Workflows
    public DbSet<Trip> Trips => Set<Trip>();
    public DbSet<TripPreference> TripPreferences => Set<TripPreference>();
    public DbSet<Itinerary> Itineraries => Set<Itinerary>();
    public DbSet<ItineraryDay> ItineraryDays => Set<ItineraryDay>();
    public DbSet<ItineraryItem> ItineraryItems => Set<ItineraryItem>();
    public DbSet<AIWorkflowRun> AIWorkflowRuns => Set<AIWorkflowRun>();
    public DbSet<ApprovalRequest> ApprovalRequests => Set<ApprovalRequest>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User Indexes
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        // Tourism Place
        modelBuilder.Entity<TourismPlace>()
            .HasIndex(p => p.District);
        modelBuilder.Entity<TourismPlace>()
            .HasIndex(p => p.Status);
        modelBuilder.Entity<TourismPlace>()
            .HasOne(p => p.Category)
            .WithMany(c => c.Places)
            .HasForeignKey(p => p.CategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        // Business
        modelBuilder.Entity<Business>()
            .HasIndex(b => b.District);
        modelBuilder.Entity<Business>()
            .HasIndex(b => b.VerificationStatus);
        modelBuilder.Entity<Business>()
            .HasOne(b => b.Owner)
            .WithMany(u => u.Businesses)
            .HasForeignKey(b => b.OwnerUserId)
            .OnDelete(DeleteBehavior.Restrict);

        // Hotel & Restaurant 1-to-1 with Business
        modelBuilder.Entity<Hotel>()
            .HasOne(h => h.Business)
            .WithOne(b => b.HotelDetails)
            .HasForeignKey<Hotel>(h => h.BusinessId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Restaurant>()
            .HasOne(r => r.Business)
            .WithOne(b => b.RestaurantDetails)
            .HasForeignKey<Restaurant>(r => r.BusinessId)
            .OnDelete(DeleteBehavior.Cascade);

        // Bookings
        modelBuilder.Entity<Booking>()
            .HasOne(b => b.Tourist)
            .WithMany(u => u.Bookings)
            .HasForeignKey(b => b.TouristUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Booking>()
            .HasOne(b => b.Business)
            .WithMany(b => b.Bookings)
            .HasForeignKey(b => b.BusinessId)
            .OnDelete(DeleteBehavior.Restrict);

        // Booking Complaints
        modelBuilder.Entity<BookingComplaint>()
            .HasOne(c => c.Tourist)
            .WithMany()
            .HasForeignKey(c => c.TouristUserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<BookingComplaint>()
            .HasOne(c => c.Booking)
            .WithMany()
            .HasForeignKey(c => c.BookingId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<BookingComplaint>()
            .HasOne(c => c.Business)
            .WithMany()
            .HasForeignKey(c => c.BusinessId)
            .OnDelete(DeleteBehavior.Cascade);

        // Favourites composite index
        modelBuilder.Entity<Favourite>()
            .HasIndex(f => new { f.UserId, f.TargetType, f.TargetId })
            .IsUnique();

        // Trip
        modelBuilder.Entity<Trip>()
            .HasOne(t => t.Tourist)
            .WithMany(u => u.Trips)
            .HasForeignKey(t => t.TouristUserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<TripPreference>()
            .HasOne(p => p.Trip)
            .WithOne(t => t.Preferences)
            .HasForeignKey<TripPreference>(p => p.TripId)
            .OnDelete(DeleteBehavior.Cascade);

        // AI Workflow
        modelBuilder.Entity<AIWorkflowRun>()
            .HasOne(w => w.Trip)
            .WithMany(t => t.WorkflowRuns)
            .HasForeignKey(w => w.TripId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ApprovalRequest>()
            .HasOne(a => a.Workflow)
            .WithMany(w => w.ApprovalRequests)
            .HasForeignKey(a => a.WorkflowId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
