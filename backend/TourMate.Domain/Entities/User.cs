using System;
using TourMate.Domain.Enums;

namespace TourMate.Domain.Entities;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public UserRole Role { get; set; } = UserRole.Tourist;
    public UserStatus Status { get; set; } = UserStatus.Active;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation collections
    public ICollection<Business> Businesses { get; set; } = new List<Business>();
    public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
    public ICollection<Review> Reviews { get; set; } = new List<Review>();
    public ICollection<Favourite> Favourites { get; set; } = new List<Favourite>();
    public ICollection<Trip> Trips { get; set; } = new List<Trip>();
    public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
}
