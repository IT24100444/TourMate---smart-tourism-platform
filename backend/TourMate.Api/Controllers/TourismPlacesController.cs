using System.Security.Claims; 
using Microsoft.AspNetCore.Authorization; 
using Microsoft.AspNetCore.Mvc; 
using TourMate.Application.DTOs; 
using TourMate.Application.Interfaces; 
using TourMate.Domain.Enums; 
 
namespace TourMate.Api.Controllers; 
 
[ApiController] 
[Route("api/v1/tourism-places")] 
public class TourismPlacesController : ControllerBase 
{ 
    private readonly ITourismPlaceService _placeService; 
 
    public TourismPlacesController(ITourismPlaceService placeService) 
    { 
        _placeService = placeService; 
    } 
 
    [HttpGet] 
    public async Task<IActionResult> GetPlaces() 
    { 
        var result = await _placeService.GetPlacesAsync(); 
        return Ok(result); 
    } 
 
    [HttpGet("{id:guid}")] 
    public async Task<IActionResult> GetPlaceById(Guid id) 
    { 
        var result = await _placeService.GetPlaceByIdAsync(id); 
        return result.Success ? Ok(result) : NotFound(result); 
    } 
 
    [HttpGet("nearby")] 
    public async Task<IActionResult> GetNearbyPlaces([FromQuery] double lat, [FromQuery] double lng, [FromQuery] double radiusKm = 25) 
    { 
        var result = await _placeService.GetNearbyPlacesAsync(lat, lng, radiusKm); 
        return Ok(result); 
    } 
 
    [HttpGet("categories")] 
    public async Task<IActionResult> GetCategories() 
    { 
        var result = await _placeService.GetCategoriesAsync(); 
        return Ok(result); 
    } 
 
    [HttpPost] 
    public async Task<IActionResult> CreatePlace([FromBody] CreateTourismPlaceRequest request) 
    { 
        var userId = GetCurrentUserId(); 
        var isAdmin = User.Identity?.IsAuthenticated == true && User.IsInRole("Administrator"); 
        var result = await _placeService.CreatePlaceAsync(request, userId, isAdmin); 
        return result.Success ? CreatedAtAction(nameof(GetPlaceById), new { id = result.Data!.Id }, result) : BadRequest(result); 
    } 
 
    [Authorize(Roles = "Administrator")] 
    [HttpPost("{id:guid}/approve")] 
    public async Task<IActionResult> ReviewPlaceApproval(Guid id, [FromBody] PlaceApprovalRequest request) 
    { 
        var userId = GetCurrentUserId(); 
        var result = await _placeService.ReviewPlaceApprovalAsync(id, request, userId); 
        return result.Success ? Ok(result) : BadRequest(result); 
    } 
 
    private Guid GetCurrentUserId() 
    { 
        var idStr = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("userId"); 
        return Guid.TryParse(idStr, out var id) ? id : Guid.Empty; 
    } 
}
