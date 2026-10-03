using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TourMate.Application.DTOs;
using TourMate.Application.Interfaces;
using TourMate.Domain.Enums;

namespace TourMate.Api.Controllers;

[ApiController]
[Route("api/v1/businesses")]
public class BusinessesController : ControllerBase
{
    private readonly IBusinessService _businessService;

    public BusinessesController(IBusinessService businessService)
    {
        _businessService = businessService;
    }

    [HttpGet]
    public async Task<IActionResult> GetBusinesses(
        [FromQuery] string? district, 
        [FromQuery] BusinessType? type, 
        [FromQuery] VerificationStatus? status,
        [FromQuery] int page = 1, 
        [FromQuery] int pageSize = 50)
    {
        var role = User.FindFirstValue(ClaimTypes.Role);
        if (role == "BusinessOwner" && !status.HasValue)
        {
            var userId = GetCurrentUserId();
            var myResult = await _businessService.GetMyBusinessesAsync(userId);
            return Ok(myResult);
        }

        var result = await _businessService.GetBusinessesAsync(district, type, status, page, pageSize);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetBusinessById(Guid id)
    {
        var result = await _businessService.GetBusinessByIdAsync(id);
        return result.Success ? Ok(result) : NotFound(result);
    }

    [Authorize(Roles = "BusinessOwner,Administrator")]
    [HttpGet("my")]
    public async Task<IActionResult> GetMyBusinesses()
    {
        var userId = GetCurrentUserId();
        var result = await _businessService.GetMyBusinessesAsync(userId);
        return Ok(result);
    }

    [Authorize(Roles = "BusinessOwner,Administrator")]
    [HttpPost]
    public async Task<IActionResult> CreateBusiness([FromBody] CreateBusinessRequest request)
    {
        var userId = GetCurrentUserId();
        var isAdmin = User.IsInRole("Administrator");
        var result = await _businessService.CreateBusinessAsync(request, userId, isAdmin);
        return result.Success ? CreatedAtAction(nameof(GetBusinessById), new { id = result.Data!.Id }, result) : BadRequest(result);
    }

    [Authorize(Roles = "BusinessOwner,Administrator")]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateBusiness(Guid id, [FromBody] UpdateBusinessRequest request)
    {
        var userId = GetCurrentUserId();
        var result = await _businessService.UpdateBusinessAsync(id, request, userId);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [Authorize(Roles = "Administrator,BusinessOwner")]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteBusiness(Guid id)
    {
        var userId = GetCurrentUserId();
        var isAdmin = User.IsInRole("Administrator");
        var result = await _businessService.DeleteBusinessAsync(id, userId, isAdmin);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [Authorize(Roles = "Administrator")]
    [HttpPost("{id:guid}/verify")]
    public async Task<IActionResult> VerifyBusiness(Guid id, [FromBody] BusinessVerificationRequest request)
    {
        var userId = GetCurrentUserId();
        var result = await _businessService.VerifyBusinessAsync(id, request, userId);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [Authorize(Roles = "BusinessOwner,Administrator")]
    [HttpPost("{id:guid}/availability")]
    public async Task<IActionResult> AddAvailability(Guid id, [FromBody] CreateAvailabilitySlotRequest request)
    {
        var userId = GetCurrentUserId();
        var result = await _businessService.AddAvailabilitySlotAsync(id, request, userId);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    // STRICT AUTONOMY: Only Business Owners have the authority to manage promotional offers for their hotels and restaurants
    [Authorize(Roles = "BusinessOwner")]
    [HttpPost("{id:guid}/offers")]
    public async Task<IActionResult> AddOffer(Guid id, [FromBody] CreateOfferRequest request)
    {
        var userId = GetCurrentUserId();
        var result = await _businessService.AddOfferAsync(id, request, userId);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [Authorize(Roles = "BusinessOwner")]
    [HttpDelete("{businessId:guid}/offers/{offerId:guid}")]
    public async Task<IActionResult> DeleteOffer(Guid businessId, Guid offerId)
    {
        var userId = GetCurrentUserId();
        var result = await _businessService.DeleteOfferAsync(businessId, offerId, userId);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    private Guid GetCurrentUserId()
    {
        var idStr = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("userId");
        return Guid.TryParse(idStr, out var id) ? id : Guid.Empty;
    }
}
