using System;
using TourMate.Application.DTOs;
using TourMate.Application.Interfaces;
using TourMate.Domain.Entities;
using TourMate.Domain.Enums;

namespace TourMate.Application.Services;

public class TourismPlaceService : ITourismPlaceService
{
    private readonly IUnitOfWork _uow;

    public TourismPlaceService(IUnitOfWork uow)
    {
        _uow = uow;
    }

    public async Task<ApiResponse<List<TourismPlaceDto>>> GetPlacesAsync()
    {
        var places = await _uow.TourismPlaces.GetAllAsync();
        // Default: only approved places for public discovery
        var query = places.Where(p => p.Status == PlaceStatus.Approved);

        var items = query
            .OrderByDescending(p => p.AverageRating)
            .Select(MapToDto)
            .ToList();

        return ApiResponse<List<TourismPlaceDto>>.Ok(items);
    }

    public async Task<ApiResponse<TourismPlaceDto>> GetPlaceByIdAsync(Guid id)
    {
        var place = await _uow.TourismPlaces.GetByIdAsync(id);
        if (place == null)
            return ApiResponse<TourismPlaceDto>.Fail("Tourism place not found.");

        return ApiResponse<TourismPlaceDto>.Ok(MapToDto(place));
    }

    public async Task<ApiResponse<TourismPlaceDto>> CreatePlaceAsync(CreateTourismPlaceRequest request, Guid userId, bool isAdmin = false)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return ApiResponse<TourismPlaceDto>.Fail("Place name is required.");

        if (request.Latitude < 5.0 || request.Latitude > 10.5 || request.Longitude < 79.0 || request.Longitude > 82.5)
            return ApiResponse<TourismPlaceDto>.Fail("Coordinates must fall within Sri Lanka bounding box (5.9-9.9 Lat, 79.5-81.9 Lng).");

        var place = new TourismPlace
        {
            CategoryId = request.CategoryId,
            Name = request.Name.Trim(),
            District = request.District.Trim(),
            Description = request.Description.Trim(),
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            OpeningHours = request.OpeningHours ?? "08:00 - 18:00",
            EstimatedVisitDurationMinutes = request.EstimatedVisitDurationMinutes,
            EntryFeeLkr = request.EntryFeeLkr,
            // If created by Admin, it is Approved directly. If submitted by tourist, it is PendingReview.
            Status = isAdmin ? PlaceStatus.Approved : PlaceStatus.PendingReview,
            CreatedAt = DateTime.UtcNow
        };

        if (request.ImageUrls != null && request.ImageUrls.Count > 0)
        {
            var validUrls = request.ImageUrls.Where(u => !string.IsNullOrWhiteSpace(u)).Distinct().ToList();
            for (int i = 0; i < validUrls.Count; i++)
            {
                place.Media.Add(new PlaceMedia
                {
                    PlaceId = place.Id,
                    Url = validUrls[i].Trim(),
                    IsCover = (i == 0)
                });
            }
        }

        await _uow.TourismPlaces.AddAsync(place);
        await _uow.SaveChangesAsync();

        var category = await _uow.PlaceCategories.GetByIdAsync(place.CategoryId);
        place.Category = category;

        var message = isAdmin
            ? "Tourism attraction published successfully and is now live."
            : "Explored place submitted successfully! Awaiting Admin review.";

        return ApiResponse<TourismPlaceDto>.Ok(MapToDto(place), message);
    }

    public async Task<ApiResponse<TourismPlaceDto>> UpdatePlaceAsync(Guid id, UpdateTourismPlaceRequest request, Guid userId)
    {
        var place = await _uow.TourismPlaces.GetByIdAsync(id);
        if (place == null)
            return ApiResponse<TourismPlaceDto>.Fail("Tourism place not found.");

        place.CategoryId = request.CategoryId;
        place.Name = request.Name.Trim();
        place.District = request.District.Trim();
        place.Description = request.Description.Trim();
        place.Latitude = request.Latitude;
        place.Longitude = request.Longitude;
        place.OpeningHours = request.OpeningHours;
        place.EstimatedVisitDurationMinutes = request.EstimatedVisitDurationMinutes;
        place.EntryFeeLkr = request.EntryFeeLkr;
        place.UpdatedAt = DateTime.UtcNow;

        // Cleanly update media: delete existing records and insert new ones
        if (request.ImageUrls != null)
        {
            var oldMedias = place.Media.ToList();
            foreach (var m in oldMedias)
            {
                await _uow.PlaceMedias.DeleteAsync(m);
            }
            place.Media.Clear();

            var validUrls = request.ImageUrls.Where(u => !string.IsNullOrWhiteSpace(u)).Distinct().ToList();
            for (int i = 0; i < validUrls.Count; i++)
            {
                place.Media.Add(new PlaceMedia
                {
                    PlaceId = place.Id,
                    Url = validUrls[i].Trim(),
                    IsCover = (i == 0)
                });
            }
        }

        await _uow.SaveChangesAsync();

        var category = await _uow.PlaceCategories.GetByIdAsync(place.CategoryId);
        place.Category = category;

        return ApiResponse<TourismPlaceDto>.Ok(MapToDto(place), "Tourism place updated successfully.");
    }

    public async Task<ApiResponse<List<PlaceCategoryDto>>> GetCategoriesAsync()
    {
        var categories = await _uow.PlaceCategories.GetAllAsync();
        var dtos = categories.Select(c => new PlaceCategoryDto
        {
            Id = c.Id,
            Name = c.Name,
            Slug = c.Slug,
            Description = c.Description
        }).ToList();
        return ApiResponse<List<PlaceCategoryDto>>.Ok(dtos);
    }

    public async Task<ApiResponse<bool>> ArchivePlaceAsync(Guid id, Guid userId)
    {
        var place = await _uow.TourismPlaces.GetByIdAsync(id);
        if (place == null)
            return ApiResponse<bool>.Fail("Place not found.");

        // Business rule: Soft delete / Archive only
        place.Status = PlaceStatus.Archived;
        place.UpdatedAt = DateTime.UtcNow;

        await _uow.TourismPlaces.UpdateAsync(place);
        await _uow.SaveChangesAsync();

        return ApiResponse<bool>.Ok(true, "Tourism place archived.");
    }
    
    public async Task<ApiResponse<bool>> ReviewPlaceApprovalAsync(Guid id, PlaceApprovalRequest request, Guid reviewerUserId)
    {
        var place = await _uow.TourismPlaces.GetByIdAsync(id);
        if (place == null)
            return ApiResponse<bool>.Fail("Place not found.");

        var history = new PlaceApprovalHistory
        {
            PlaceId = place.Id,
            ReviewedByUserId = reviewerUserId,
            Decision = request.Decision,
            Comments = request.Comments,
            Timestamp = DateTime.UtcNow
        };

        if (request.Decision == ApprovalDecision.Approved)
            place.Status = PlaceStatus.Approved;
        else if (request.Decision == ApprovalDecision.Rejected)
            place.Status = PlaceStatus.Rejected;
        else
            place.Status = PlaceStatus.Draft;

        place.UpdatedAt = DateTime.UtcNow;

        await _uow.PlaceApprovalHistories.AddAsync(history);
        await _uow.TourismPlaces.UpdateAsync(place);
        await _uow.SaveChangesAsync();

        return ApiResponse<bool>.Ok(true, $"Place status updated to {place.Status}.");
    }

    public async Task<ApiResponse<List<TourismPlaceDto>>> GetNearbyPlacesAsync(double lat, double lng, double radiusKm)
    {
        var places = await _uow.TourismPlaces.FindAsync(p => p.Status == PlaceStatus.Approved);

        // Haversine formula calculation
        var nearby = places
            .Select(p => new
            {
                Place = p,
                DistanceKm = CalculateDistanceKm(lat, lng, p.Latitude, p.Longitude)
            })
            .Where(x => x.DistanceKm <= radiusKm)
            .OrderBy(x => x.DistanceKm)
            .Take(20)
            .Select(x => MapToDto(x.Place))
            .ToList();

        return ApiResponse<List<TourismPlaceDto>>.Ok(nearby);
    }

    private static double CalculateDistanceKm(double lat1, double lon1, double lat2, double lon2)
    {
        var r = 6371; // Earth radius in km
        var dLat = ToRadians(lat2 - lat1);
        var dLon = ToRadians(lon2 - lon1);
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2)) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return r * c;
    }

    private static double ToRadians(double degrees) => degrees * Math.PI / 180.0;

    private static TourismPlaceDto MapToDto(TourismPlace p)
    {
        return new TourismPlaceDto
        {
            Id = p.Id,
            CategoryId = p.CategoryId,
            CategoryName = p.Category?.Name ?? "Attraction",
            Name = p.Name,
            District = p.District,
            Description = p.Description,
            Latitude = p.Latitude,
            Longitude = p.Longitude,
            OpeningHours = p.OpeningHours,
            EstimatedVisitDurationMinutes = p.EstimatedVisitDurationMinutes,
            EntryFeeLkr = p.EntryFeeLkr,
            AverageRating = p.AverageRating,
            ReviewCount = p.ReviewCount,
            Status = p.Status,
            Images = p.Media.Select(m => m.Url).ToList(),
            CreatedAt = p.CreatedAt
        };
    }
}
