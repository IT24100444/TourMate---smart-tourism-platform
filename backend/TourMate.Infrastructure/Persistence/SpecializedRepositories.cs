using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TourMate.Domain.Entities;

namespace TourMate.Infrastructure.Persistence;

public class TourismPlaceRepository : Repository<TourismPlace>
{
    public TourismPlaceRepository(TourMateDbContext context) : base(context) { }

    public override async Task<TourismPlace?> GetByIdAsync(Guid id) =>
        await _dbSet
            .Include(p => p.Category)
            .Include(p => p.Media)
            .Include(p => p.ApprovalHistories)
            .FirstOrDefaultAsync(p => p.Id == id);

    public override async Task<IReadOnlyList<TourismPlace>> GetAllAsync() =>
        await _dbSet
            .Include(p => p.Category)
            .Include(p => p.Media)
            .ToListAsync();

    public override async Task<IReadOnlyList<TourismPlace>> FindAsync(Expression<Func<TourismPlace, bool>> predicate) =>
        await _dbSet
            .Include(p => p.Category)
            .Include(p => p.Media)
            .Where(predicate)
            .ToListAsync();
}

public class BusinessRepository : Repository<Business>
{
    public BusinessRepository(TourMateDbContext context) : base(context) { }

    public override async Task<Business?> GetByIdAsync(Guid id) =>
        await _dbSet
            .Include(b => b.HotelDetails)
            .Include(b => b.RestaurantDetails)
            .Include(b => b.Media)
            .Include(b => b.Offers)
            .Include(b => b.AvailabilitySlots)
            .FirstOrDefaultAsync(b => b.Id == id);

    public override async Task<IReadOnlyList<Business>> GetAllAsync() =>
        await _dbSet
            .Include(b => b.HotelDetails)
            .Include(b => b.RestaurantDetails)
            .Include(b => b.Media)
            .Include(b => b.Offers)
            .Include(b => b.AvailabilitySlots)
            .ToListAsync();

    public override async Task<IReadOnlyList<Business>> FindAsync(Expression<Func<Business, bool>> predicate) =>
        await _dbSet
            .Include(b => b.HotelDetails)
            .Include(b => b.RestaurantDetails)
            .Include(b => b.Media)
            .Include(b => b.Offers)
            .Include(b => b.AvailabilitySlots)
            .Where(predicate)
            .ToListAsync();
}
