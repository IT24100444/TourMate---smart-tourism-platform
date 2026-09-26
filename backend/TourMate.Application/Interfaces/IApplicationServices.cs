using System;
using System.Security.Claims;
using TourMate.Application.DTOs;
using TourMate.Domain.Enums;

namespace TourMate.Application.Interfaces;

public interface IAuthService
{
    Task<ApiResponse<AuthResponse>> RegisterAsync(RegisterRequest request);
    Task<ApiResponse<AuthResponse>> LoginAsync(LoginRequest request);
    Task<ApiResponse<UserProfileDto>> GetCurrentUserAsync(Guid userId);
}

public interface ITourismPlaceService
{
    Task<ApiResponse<List<TourismPlaceDto>>> GetPlacesAsync();
    Task<ApiResponse<TourismPlaceDto>> GetPlaceByIdAsync(Guid id);
    Task<ApiResponse<TourismPlaceDto>> CreatePlaceAsync(CreateTourismPlaceRequest request, Guid userId, bool isAdmin = false);
    Task<ApiResponse<TourismPlaceDto>> UpdatePlaceAsync(Guid id, UpdateTourismPlaceRequest request, Guid userId);
    Task<ApiResponse<bool>> ReviewPlaceApprovalAsync(Guid id, PlaceApprovalRequest request, Guid reviewerUserId);
    Task<ApiResponse<List<TourismPlaceDto>>> GetNearbyPlacesAsync(double lat, double lng, double radiusKm);
    Task<ApiResponse<List<PlaceCategoryDto>>> GetCategoriesAsync();
}

public interface IBusinessService
{
    Task<ApiResponse<PagedResult<BusinessDto>>> GetBusinessesAsync(string? district, BusinessType? type, VerificationStatus? status, int page, int pageSize);
    Task<ApiResponse<BusinessDto>> GetBusinessByIdAsync(Guid id);
    Task<ApiResponse<List<BusinessDto>>> GetMyBusinessesAsync(Guid ownerUserId);
    Task<ApiResponse<BusinessDto>> CreateBusinessAsync(CreateBusinessRequest request, Guid ownerUserId, bool isAdmin = false);
    Task<ApiResponse<BusinessDto>> UpdateBusinessAsync(Guid id, UpdateBusinessRequest request, Guid ownerUserId);
    Task<ApiResponse<bool>> DeleteBusinessAsync(Guid id, Guid userId, bool isAdmin);
    Task<ApiResponse<bool>> VerifyBusinessAsync(Guid id, BusinessVerificationRequest request, Guid adminUserId);
    Task<ApiResponse<AvailabilitySlotDto>> AddAvailabilitySlotAsync(Guid businessId, CreateAvailabilitySlotRequest request, Guid ownerUserId);
    Task<ApiResponse<OfferDto>> AddOfferAsync(Guid businessId, CreateOfferRequest request, Guid ownerUserId);
    Task<ApiResponse<bool>> DeleteOfferAsync(Guid businessId, Guid offerId, Guid ownerUserId);
}

public interface IBookingService
{
    Task<ApiResponse<BookingDto>> CreateBookingAsync(CreateBookingRequest request, Guid touristUserId);
    Task<ApiResponse<PagedResult<BookingDto>>> GetUserBookingsAsync(Guid touristUserId, int page, int pageSize);
    Task<ApiResponse<PagedResult<BookingDto>>> GetOwnerBookingsAsync(Guid ownerUserId, int page, int pageSize);
    Task<ApiResponse<BookingDto>> UpdateBookingStatusAsync(Guid bookingId, UpdateBookingStatusRequest request, Guid changedByUserId, bool isAdmin);
    Task<ApiResponse<BookingDto>> ResendBookingAsync(Guid bookingId, Guid touristUserId);
    Task<ApiResponse<BookingComplaintDto>> SubmitComplaintAsync(Guid bookingId, SubmitComplaintRequest request, Guid touristUserId);
    Task<ApiResponse<List<BookingComplaintDto>>> GetAllComplaintsAsync();
    Task<ApiResponse<BookingComplaintDto>> SendWarningAsync(Guid complaintId, SendWarningRequest request, Guid adminUserId);
    Task<ApiResponse<ReviewDto>> AddReviewAsync(CreateReviewRequest request, Guid touristUserId);
    Task<ApiResponse<List<ReviewDto>>> GetReviewsAsync(string targetType, Guid targetId);
    Task<ApiResponse<ReviewDto>> SubmitBookingReviewAsync(Guid bookingId, CreateBookingReviewRequest request, Guid touristUserId);
    Task<ApiResponse<List<ReviewDto>>> GetMyReviewsAsync(Guid touristUserId);
    Task<ApiResponse<ReviewDto>> UpdateReviewAsync(Guid reviewId, UpdateReviewRequest request, Guid touristUserId);
    Task<ApiResponse<bool>> DeleteReviewByTouristAsync(Guid reviewId, Guid touristUserId);
    Task<ApiResponse<List<ReviewDto>>> GetOwnerReviewsAsync(Guid ownerUserId, bool isAdmin);
    Task<ApiResponse<ReviewDto>> ReplyToReviewAsync(Guid reviewId, ReplyReviewRequest request, Guid ownerUserId, bool isAdmin);
    Task<ApiResponse<ReviewDto>> DeleteReplyAsync(Guid reviewId, Guid ownerUserId, bool isAdmin);
    Task<ApiResponse<ReviewDto>> ReactToReviewAsync(Guid reviewId, ReactReviewRequest request, Guid ownerUserId, bool isAdmin);
    Task<ApiResponse<bool>> DeleteReviewByOwnerAsync(Guid reviewId, Guid ownerUserId, bool isAdmin);
    Task<ApiResponse<List<PlaceReviewAdminDto>>> GetAdminPlaceReviewsAsync();
    Task<ApiResponse<bool>> ToggleFavouriteAsync(string targetType, Guid targetId, Guid userId);
    Task<ApiResponse<List<FavouriteDto>>> GetFavouritesAsync(Guid userId);
}

public interface ITripWorkflowService
{
    Task<ApiResponse<TripDto>> CreateTripAsync(CreateTripRequest request, Guid touristUserId);
    Task<ApiResponse<TripDto>> GetTripByIdAsync(Guid tripId, Guid touristUserId);
    Task<ApiResponse<List<TripDto>>> GetUserTripsAsync(Guid touristUserId);
    Task<ApiResponse<AIWorkflowRunDto>> InitiateAIPlanningAsync(Guid tripId, AIPlanRequest request, Guid touristUserId);
    Task<ApiResponse<AIWorkflowRunDto>> GetWorkflowStatusAsync(Guid workflowId);
    Task<ApiResponse<AIWorkflowRunDto>> ProcessApprovalDecisionAsync(Guid workflowId, ApprovalDecisionRequest request, Guid userId);
    Task<ApiResponse<List<AIWorkflowRunDto>>> GetAllWorkflowsForAdminAsync();
}

public interface IAIServiceClient
{
    Task<AIWorkflowRunDto> StartPlanWorkflowAsync(Guid tripId, string objective, decimal budgetLkr, string destination, Guid? workflowId = null);
    Task<AIWorkflowRunDto> ResumeWorkflowAsync(Guid workflowId, ApprovalDecision decision, string? notes);
}
