using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TourMate.Application.DTOs;
using TourMate.Application.Interfaces;

namespace TourMate.Api.Controllers;

[ApiController]
[Route("api/v1/trips")]
public class TripsController : ControllerBase
{
    private readonly ITripWorkflowService _tripService;

    public TripsController(ITripWorkflowService tripService)
    {
        _tripService = tripService;
    }

    [Authorize]
    [HttpPost]
    public async Task<IActionResult> CreateTrip([FromBody] CreateTripRequest request)
    {
        var touristId = GetCurrentUserId();
        var result = await _tripService.CreateTripAsync(request, touristId);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [Authorize]
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetTripById(Guid id)
    {
        var touristId = GetCurrentUserId();
        var result = await _tripService.GetTripByIdAsync(id, touristId);
        return result.Success ? Ok(result) : NotFound(result);
    }

    [Authorize]
    [HttpGet("my")]
    public async Task<IActionResult> GetMyTrips()
    {
        var touristId = GetCurrentUserId();
        var result = await _tripService.GetUserTripsAsync(touristId);
        return Ok(result);
    }

    [Authorize]
    [HttpPost("{id:guid}/ai-plan")]
    public async Task<IActionResult> InitiateAIPlanning(Guid id, [FromBody] AIPlanRequest request)
    {
        var touristId = GetCurrentUserId();
        var result = await _tripService.InitiateAIPlanningAsync(id, request, touristId);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    private Guid GetCurrentUserId()
    {
        var idStr = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("userId");
        return Guid.TryParse(idStr, out var id) ? id : Guid.Empty;
    }
}
