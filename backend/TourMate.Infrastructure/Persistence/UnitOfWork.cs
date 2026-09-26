using System;
using TourMate.Application.Interfaces;
using TourMate.Domain.Entities;

namespace TourMate.Infrastructure.Persistence;

public class UnitOfWork : IUnitOfWork
{
    private readonly TourMateDbContext _context;

    public UnitOfWork(TourMateDbContext context)
    {
        _context = context;
        Users = new Repository<User>(_context);
        PlaceCategories = new Repository<PlaceCategory>(_context);
        TourismPlaces = new TourismPlaceRepository(_context);
        PlaceMedias = new Repository<PlaceMedia>(_context);
        PlaceApprovalHistories = new Repository<PlaceApprovalHistory>(_context);

        Businesses = new BusinessRepository(_context);
        Hotels = new Repository<Hotel>(_context);
        Restaurants = new Repository<Restaurant>(_context);
        AvailabilitySlots = new Repository<AvailabilitySlot>(_context);
        Offers = new Repository<Offer>(_context);

        Bookings = new Repository<Booking>(_context);
        BookingStatusHistories = new Repository<BookingStatusHistory>(_context);
        BookingComplaints = new Repository<BookingComplaint>(_context);
        Reviews = new Repository<Review>(_context);
        Favourites = new Repository<Favourite>(_context);
        Notifications = new Repository<Notification>(_context);

        Trips = new Repository<Trip>(_context);
        Itineraries = new Repository<Itinerary>(_context);
        AIWorkflowRuns = new Repository<AIWorkflowRun>(_context);
        ApprovalRequests = new Repository<ApprovalRequest>(_context);
    }

    public IRepository<User> Users { get; }
    public IRepository<PlaceCategory> PlaceCategories { get; }
    public IRepository<TourismPlace> TourismPlaces { get; }
    public IRepository<PlaceMedia> PlaceMedias { get; }
    public IRepository<PlaceApprovalHistory> PlaceApprovalHistories { get; }

    public IRepository<Business> Businesses { get; }
    public IRepository<Hotel> Hotels { get; }
    public IRepository<Restaurant> Restaurants { get; }
    public IRepository<AvailabilitySlot> AvailabilitySlots { get; }
    public IRepository<Offer> Offers { get; }

    public IRepository<Booking> Bookings { get; }
    public IRepository<BookingStatusHistory> BookingStatusHistories { get; }
    public IRepository<BookingComplaint> BookingComplaints { get; }
    public IRepository<Review> Reviews { get; }
    public IRepository<Favourite> Favourites { get; }
    public IRepository<Notification> Notifications { get; }

    public IRepository<Trip> Trips { get; }
    public IRepository<Itinerary> Itineraries { get; }
    public IRepository<AIWorkflowRun> AIWorkflowRuns { get; }
    public IRepository<ApprovalRequest> ApprovalRequests { get; }

    public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return await _context.SaveChangesAsync(cancellationToken);
    }

    public void Dispose()
    {
        _context.Dispose();
        GC.SuppressFinalize(this);
    }
}
