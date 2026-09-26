using System;
using System.Linq.Expressions;
using TourMate.Domain.Entities;

namespace TourMate.Application.Interfaces;

public interface IRepository<T> where T : class
{
    Task<T?> GetByIdAsync(Guid id);
    Task<IReadOnlyList<T>> GetAllAsync();
    Task<IReadOnlyList<T>> FindAsync(Expression<Func<T, bool>> predicate);
    Task<T> AddAsync(T entity);
    Task UpdateAsync(T entity);
    Task DeleteAsync(T entity);
    Task<int> CountAsync(Expression<Func<T, bool>>? predicate = null);
}

public interface IUnitOfWork : IDisposable
{
    IRepository<User> Users { get; }
    IRepository<PlaceCategory> PlaceCategories { get; }
    IRepository<TourismPlace> TourismPlaces { get; }
    IRepository<PlaceMedia> PlaceMedias { get; }
    IRepository<PlaceApprovalHistory> PlaceApprovalHistories { get; }

    IRepository<Business> Businesses { get; }
    IRepository<Hotel> Hotels { get; }
    IRepository<Restaurant> Restaurants { get; }
    IRepository<AvailabilitySlot> AvailabilitySlots { get; }
    IRepository<Offer> Offers { get; }

    IRepository<Booking> Bookings { get; }
    IRepository<BookingStatusHistory> BookingStatusHistories { get; }
    IRepository<BookingComplaint> BookingComplaints { get; }
    IRepository<Review> Reviews { get; }
    IRepository<Favourite> Favourites { get; }
    IRepository<Notification> Notifications { get; }

    IRepository<Trip> Trips { get; }
    IRepository<Itinerary> Itineraries { get; }
    IRepository<AIWorkflowRun> AIWorkflowRuns { get; }
    IRepository<ApprovalRequest> ApprovalRequests { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
