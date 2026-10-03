using System;
using System.Text.Json;
using TourMate.Application.DTOs;
using TourMate.Application.Interfaces;
using TourMate.Domain.Entities;
using TourMate.Domain.Enums;

namespace TourMate.Application.Services;

public class TripWorkflowService : ITripWorkflowService
{
    private readonly IUnitOfWork _uow;
    private readonly IAIServiceClient _aiClient;

    public TripWorkflowService(IUnitOfWork uow, IAIServiceClient aiClient)
    {
        _uow = uow;
        _aiClient = aiClient;
    }

    public async Task<ApiResponse<TripDto>> CreateTripAsync(CreateTripRequest request, Guid touristUserId)
    {
        if (request.EndDate <= request.StartDate)
            return ApiResponse<TripDto>.Fail("End date must be after start date.");

        if (request.BudgetLkr < 10000)
            return ApiResponse<TripDto>.Fail("Minimum recommended budget is LKR 10,000.");

        var trip = new Trip
        {
            TouristUserId = touristUserId,
            Title = string.IsNullOrWhiteSpace(request.Title) ? $"Trip to {request.Destination}" : request.Title.Trim(),
            Destination = request.Destination.Trim(),
            StartDate = request.StartDate.ToUniversalTime(),
            EndDate = request.EndDate.ToUniversalTime(),
            BudgetLkr = request.BudgetLkr,
            Status = TripStatus.Draft,
            CreatedAt = DateTime.UtcNow,
            Preferences = new TripPreference
            {
                Pace = request.Pace,
                InterestsJson = JsonSerializer.Serialize(request.Interests),
                DietaryRestrictionsJson = JsonSerializer.Serialize(request.DietaryRestrictions),
                AdultsCount = request.AdultsCount,
                ChildrenCount = request.ChildrenCount
            }
        };

        await _uow.Trips.AddAsync(trip);
        await _uow.SaveChangesAsync();

        return ApiResponse<TripDto>.Ok(MapToDto(trip), "Trip created.");
    }

    public async Task<ApiResponse<TripDto>> GetTripByIdAsync(Guid tripId, Guid touristUserId)
    {
        var trip = await _uow.Trips.GetByIdAsync(tripId);
        if (trip == null)
            return ApiResponse<TripDto>.Fail("Trip not found.");

        return ApiResponse<TripDto>.Ok(MapToDto(trip));
    }

    public async Task<ApiResponse<List<TripDto>>> GetUserTripsAsync(Guid touristUserId)
    {
        var trips = await _uow.Trips.FindAsync(t => t.TouristUserId == touristUserId);
        return ApiResponse<List<TripDto>>.Ok(trips.OrderByDescending(t => t.CreatedAt).Select(MapToDto).ToList());
    }

    public async Task<ApiResponse<AIWorkflowRunDto>> InitiateAIPlanningAsync(Guid tripId, AIPlanRequest request, Guid touristUserId)
    {
        var trip = await _uow.Trips.GetByIdAsync(tripId);
        if (trip == null)
            return ApiResponse<AIWorkflowRunDto>.Fail("Trip not found.");

        if (trip.TouristUserId != touristUserId)
            return ApiResponse<AIWorkflowRunDto>.Fail("Access denied.");

        var workflowId = Guid.NewGuid();
        var budget = request.OverrideBudgetLkr ?? trip.BudgetLkr;

        // Call TourMate Multi-Agent Service (Google ADK 2.0)
        var aiResult = await _aiClient.StartPlanWorkflowAsync(tripId, request.Objective, budget, trip.Destination, workflowId);

        var workflow = new AIWorkflowRun
        {
            Id = workflowId,
            TripId = tripId,
            Objective = request.Objective,
            Status = aiResult.Status,
            CurrentNode = aiResult.CurrentNode,
            StateJson = aiResult.StateJson,
            FinalSummaryJson = aiResult.FinalSummaryJson,
            CreatedAt = DateTime.UtcNow,
            CompletedAt = aiResult.Status == AIWorkflowStatus.Succeeded ? DateTime.UtcNow : null
        };

        // If waiting approval, generate ApprovalRequest
        if (aiResult.Status == AIWorkflowStatus.WaitingApproval)
        {
            var approval = new ApprovalRequest
            {
                WorkflowId = workflow.Id,
                ActionType = "ConfirmBookingPackage",
                PayloadJson = aiResult.StateJson,
                Status = ApprovalDecision.Pending,
                CreatedAt = DateTime.UtcNow
            };
            workflow.ApprovalRequests.Add(approval);
            trip.Status = TripStatus.ApprovalRequired;
        }
        else if (aiResult.Status == AIWorkflowStatus.Succeeded)
        {
            trip.Status = TripStatus.Proposed;
        }
        else
        {
            trip.Status = TripStatus.Planning;
        }

        await _uow.AIWorkflowRuns.AddAsync(workflow);
        await _uow.Trips.UpdateAsync(trip);
        await _uow.SaveChangesAsync();

        return ApiResponse<AIWorkflowRunDto>.Ok(MapWorkflowToDto(workflow), "AI workflow executed. Proposed itinerary ready.");
    }

    public async Task<ApiResponse<AIWorkflowRunDto>> GetWorkflowStatusAsync(Guid workflowId)
    {
        var workflow = await _uow.AIWorkflowRuns.GetByIdAsync(workflowId);
        if (workflow == null)
            return ApiResponse<AIWorkflowRunDto>.Fail("Workflow not found.");

        return ApiResponse<AIWorkflowRunDto>.Ok(MapWorkflowToDto(workflow));
    }

    public async Task<ApiResponse<AIWorkflowRunDto>> ProcessApprovalDecisionAsync(Guid workflowId, ApprovalDecisionRequest request, Guid userId)
    {
        var workflow = await _uow.AIWorkflowRuns.GetByIdAsync(workflowId);
        if (workflow == null)
            return ApiResponse<AIWorkflowRunDto>.Fail("Workflow not found.");

        var approval = (await _uow.ApprovalRequests.FindAsync(a => a.WorkflowId == workflowId && a.Status == ApprovalDecision.Pending)).FirstOrDefault();
        if (approval == null)
            return ApiResponse<AIWorkflowRunDto>.Fail("No pending approval found for this workflow.");

        approval.Status = request.Decision;
        approval.DecidedByUserId = userId;
        approval.DecisionNotes = request.Notes;
        approval.DecidedAt = DateTime.UtcNow;

        var trip = await _uow.Trips.GetByIdAsync(workflow.TripId);

        if (request.Decision == ApprovalDecision.Approved)
        {
            workflow.Status = AIWorkflowStatus.Succeeded;
            workflow.CompletedAt = DateTime.UtcNow;
            if (trip != null) trip.Status = TripStatus.Approved;

            // Generate notification for tourist
            if (trip != null)
            {
                await _uow.Notifications.AddAsync(new Notification
                {
                    UserId = trip.TouristUserId,
                    Title = "Trip Itinerary Approved!",
                    Message = $"Your AI Itinerary for {trip.Destination} has been approved and bookings are confirmed.",
                    ActionUrl = $"/trips/{trip.Id}"
                });
            }
        }
        else if (request.Decision == ApprovalDecision.Rejected)
        {
            workflow.Status = AIWorkflowStatus.Rejected;
            if (trip != null) trip.Status = TripStatus.Draft;
        }
        else if (request.Decision == ApprovalDecision.RevisionRequested)
        {
            // Resume AI graph with revision notes
            workflow.Status = AIWorkflowStatus.Running;
            var resumed = await _aiClient.ResumeWorkflowAsync(workflowId, request.Decision, request.Notes);
            workflow.Status = resumed.Status;
            workflow.CurrentNode = resumed.CurrentNode;
            workflow.StateJson = resumed.StateJson;
            workflow.FinalSummaryJson = resumed.FinalSummaryJson;
        }

        await _uow.ApprovalRequests.UpdateAsync(approval);
        await _uow.AIWorkflowRuns.UpdateAsync(workflow);
        if (trip != null) await _uow.Trips.UpdateAsync(trip);
        await _uow.SaveChangesAsync();

        return ApiResponse<AIWorkflowRunDto>.Ok(MapWorkflowToDto(workflow), $"Approval decision recorded: {request.Decision}");
    }

    public async Task<ApiResponse<List<AIWorkflowRunDto>>> GetAllWorkflowsForAdminAsync()
    {
        var runs = await _uow.AIWorkflowRuns.GetAllAsync();
        return ApiResponse<List<AIWorkflowRunDto>>.Ok(runs.OrderByDescending(r => r.CreatedAt).Select(MapWorkflowToDto).ToList());
    }

    private static TripDto MapToDto(Trip t)
    {
        return new TripDto
        {
            Id = t.Id,
            TouristUserId = t.TouristUserId,
            Title = t.Title,
            Destination = t.Destination,
            StartDate = t.StartDate,
            EndDate = t.EndDate,
            BudgetLkr = t.BudgetLkr,
            Status = t.Status,
            CreatedAt = t.CreatedAt,
            Preferences = t.Preferences == null ? null : new TripPreferenceDto
            {
                Pace = t.Preferences.Pace,
                Interests = JsonSerializer.Deserialize<List<string>>(t.Preferences.InterestsJson) ?? new(),
                DietaryRestrictions = JsonSerializer.Deserialize<List<string>>(t.Preferences.DietaryRestrictionsJson) ?? new(),
                AdultsCount = t.Preferences.AdultsCount,
                ChildrenCount = t.Preferences.ChildrenCount
            },
            WorkflowRuns = t.WorkflowRuns.Select(MapWorkflowToDto).ToList()
        };
    }

    private static AIWorkflowRunDto MapWorkflowToDto(AIWorkflowRun w)
    {
        return new AIWorkflowRunDto
        {
            Id = w.Id,
            TripId = w.TripId,
            Objective = w.Objective,
            Status = w.Status,
            CurrentNode = w.CurrentNode,
            StateJson = w.StateJson,
            FinalSummaryJson = w.FinalSummaryJson,
            CreatedAt = w.CreatedAt,
            CompletedAt = w.CompletedAt,
            ApprovalRequests = w.ApprovalRequests.Select(a => new ApprovalRequestDto
            {
                Id = a.Id,
                WorkflowId = a.WorkflowId,
                ActionType = a.ActionType,
                PayloadJson = a.PayloadJson,
                Status = a.Status,
                DecisionNotes = a.DecisionNotes,
                CreatedAt = a.CreatedAt,
                DecidedAt = a.DecidedAt
            }).ToList()
        };
    }
}
