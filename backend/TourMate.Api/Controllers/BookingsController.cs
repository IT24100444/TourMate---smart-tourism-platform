using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TourMate.Application.DTOs;
using TourMate.Application.Interfaces;

namespace TourMate.Api.Controllers;

[ApiController]
[Route("api/v1")]
public class BookingsController : ControllerBase
{
    private readonly IBookingService _bookingService;

    public BookingsController(IBookingService bookingService)
    {
        _bookingService = bookingService;
    }

    [Authorize]
    [HttpPost("bookings")]
    public async Task<IActionResult> CreateBooking([FromBody] CreateBookingRequest request)
    {
        var touristId = GetCurrentUserId();
        var result = await _bookingService.CreateBookingAsync(request, touristId);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [Authorize]
    [HttpGet("bookings/my")]
    public async Task<IActionResult> GetMyBookings([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        var touristId = GetCurrentUserId();
        var result = await _bookingService.GetUserBookingsAsync(touristId, page, pageSize);
        return Ok(result);
    }

    [Authorize(Roles = "BusinessOwner,Administrator")]
    [HttpGet("bookings/owner")]
    public async Task<IActionResult> GetOwnerBookings([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        var ownerId = GetCurrentUserId();
        var result = await _bookingService.GetOwnerBookingsAsync(ownerId, page, pageSize);
        return Ok(result);
    }

    [Authorize]
    [HttpPost("bookings/{id:guid}/status")]
    [HttpPatch("bookings/{id:guid}/status")]
    public async Task<IActionResult> UpdateBookingStatus(Guid id, [FromBody] UpdateBookingStatusRequest request)
    {
        var userId = GetCurrentUserId();
        var isAdmin = User.IsInRole("Administrator");
        var result = await _bookingService.UpdateBookingStatusAsync(id, request, userId, isAdmin);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [Authorize]
    [HttpPost("bookings/{id:guid}/resend")]
    public async Task<IActionResult> ResendBooking(Guid id)
    {
        var touristId = GetCurrentUserId();
        var result = await _bookingService.ResendBookingAsync(id, touristId);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [Authorize]
    [HttpPost("bookings/{id:guid}/complain")]
    public async Task<IActionResult> SubmitComplaint(Guid id, [FromBody] SubmitComplaintRequest request)
    {
        var touristId = GetCurrentUserId();
        var result = await _bookingService.SubmitComplaintAsync(id, request, touristId);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [Authorize(Roles = "Administrator")]
    [HttpGet("admin/complaints")]
    public async Task<IActionResult> GetAllComplaints()
    {
        var result = await _bookingService.GetAllComplaintsAsync();
        return Ok(result);
    }

    [Authorize(Roles = "Administrator")]
    [HttpPost("admin/complaints/{id:guid}/warning")]
    public async Task<IActionResult> SendWarning(Guid id, [FromBody] SendWarningRequest request)
    {
        var adminId = GetCurrentUserId();
        var result = await _bookingService.SendWarningAsync(id, request, adminId);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [Authorize]
    [HttpPost("reviews")]
    public async Task<IActionResult> AddReview([FromBody] CreateReviewRequest request)
    {
        var touristId = GetCurrentUserId();
        var result = await _bookingService.AddReviewAsync(request, touristId);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpGet("reviews")]
    public async Task<IActionResult> GetReviews([FromQuery] string targetType, [FromQuery] Guid targetId)
    {
        var result = await _bookingService.GetReviewsAsync(targetType, targetId);
        return Ok(result);
    }

    [Authorize]
    [HttpPost("bookings/{id:guid}/review")]
    public async Task<IActionResult> SubmitBookingReview(Guid id, [FromBody] CreateBookingReviewRequest request)
    {
        var touristId = GetCurrentUserId();
        var result = await _bookingService.SubmitBookingReviewAsync(id, request, touristId);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [Authorize]
    [HttpGet("reviews/my")]
    public async Task<IActionResult> GetMyReviews()
    {
        var touristId = GetCurrentUserId();
        var result = await _bookingService.GetMyReviewsAsync(touristId);
        return Ok(result);
    }

    [Authorize]
    [HttpPut("reviews/{id:guid}")]
    public async Task<IActionResult> UpdateReview(Guid id, [FromBody] UpdateReviewRequest request)
    {
        var touristId = GetCurrentUserId();
        var result = await _bookingService.UpdateReviewAsync(id, request, touristId);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [Authorize]
    [HttpDelete("reviews/{id:guid}")]
    public async Task<IActionResult> DeleteReviewByTourist(Guid id)
    {
        var touristId = GetCurrentUserId();
        var result = await _bookingService.DeleteReviewByTouristAsync(id, touristId);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [Authorize(Roles = "BusinessOwner")]
    [HttpGet("reviews/owner")]
    public async Task<IActionResult> GetOwnerReviews()
    {
        var userId = GetCurrentUserId();
        var result = await _bookingService.GetOwnerReviewsAsync(userId, false);
        return Ok(result);
    }

    [Authorize(Roles = "BusinessOwner")]
    [HttpPost("reviews/{id:guid}/reply")]
    public async Task<IActionResult> ReplyToReview(Guid id, [FromBody] ReplyReviewRequest request)
    {
        var userId = GetCurrentUserId();
        var result = await _bookingService.ReplyToReviewAsync(id, request, userId, false);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [Authorize(Roles = "BusinessOwner")]
    [HttpDelete("reviews/{id:guid}/reply")]
    public async Task<IActionResult> DeleteReply(Guid id)
    {
        var userId = GetCurrentUserId();
        var result = await _bookingService.DeleteReplyAsync(id, userId, false);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [Authorize(Roles = "BusinessOwner")]
    [HttpPost("reviews/{id:guid}/react")]
    public async Task<IActionResult> ReactToReview(Guid id, [FromBody] ReactReviewRequest request)
    {
        var userId = GetCurrentUserId();
        var result = await _bookingService.ReactToReviewAsync(id, request, userId, false);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [Authorize(Roles = "BusinessOwner")]
    [HttpDelete("reviews/{id:guid}/owner")]
    public async Task<IActionResult> DeleteReviewByOwner(Guid id)
    {
        var userId = GetCurrentUserId();
        var result = await _bookingService.DeleteReviewByOwnerAsync(id, userId, false);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [Authorize(Roles = "Administrator")]
    [HttpGet("reviews/places/admin")]
    public async Task<IActionResult> GetAdminPlaceReviews()
    {
        var result = await _bookingService.GetAdminPlaceReviewsAsync();
        return Ok(result);
    }

    [Authorize]
    [HttpPost("favourites/{targetType}/{targetId:guid}")]
    public async Task<IActionResult> ToggleFavourite(string targetType, Guid targetId)
    {
        var userId = GetCurrentUserId();
        var result = await _bookingService.ToggleFavouriteAsync(targetType, targetId, userId);
        return Ok(result);
    }

    [Authorize]
    [HttpGet("favourites")]
    public async Task<IActionResult> GetFavourites()
    {
        var userId = GetCurrentUserId();
        var result = await _bookingService.GetFavouritesAsync(userId);
        return Ok(result);
    }

    private Guid GetCurrentUserId()
    {
        var idStr = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("userId");
        return Guid.TryParse(idStr, out var id) ? id : Guid.Empty;
    }
}
