using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TourMate.Application.DTOs;
using TourMate.Application.Interfaces;

namespace TourMate.Api.Controllers;

[ApiController]
[Route("api/v1/ai-workflows")]
public class AIWorkflowsController : ControllerBase
{
    private readonly ITripWorkflowService _tripService;

    public AIWorkflowsController(ITripWorkflowService tripService)
    {
        _tripService = tripService;
    }

    [Authorize]
    [HttpGet("{workflowId:guid}")]
    public async Task<IActionResult> GetWorkflowStatus(Guid workflowId)
    {
        var result = await _tripService.GetWorkflowStatusAsync(workflowId);
        return result.Success ? Ok(result) : NotFound(result);
    }

    [Authorize]
    [HttpPost("{workflowId:guid}/decision")]
    public async Task<IActionResult> ProcessApprovalDecision(Guid workflowId, [FromBody] ApprovalDecisionRequest request)
    {
        var userId = GetCurrentUserId();
        var result = await _tripService.ProcessApprovalDecisionAsync(workflowId, request, userId);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [Authorize(Roles = "Administrator")]
    [HttpGet]
    public async Task<IActionResult> GetAllWorkflows()
    {
        var result = await _tripService.GetAllWorkflowsForAdminAsync();
        return Ok(result);
    }

    private Guid GetCurrentUserId()
    {
        var idStr = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("userId");
        return Guid.TryParse(idStr, out var id) ? id : Guid.Empty;
    }
}
