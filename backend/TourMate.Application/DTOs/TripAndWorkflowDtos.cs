using System;
using TourMate.Domain.Enums;

namespace TourMate.Application.DTOs;

public class TripDto
{
    public Guid Id { get; set; }
    public Guid TouristUserId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Destination { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public decimal BudgetLkr { get; set; }
    public TripStatus Status { get; set; }
    public string StatusName => Status.ToString();
    public DateTime CreatedAt { get; set; }

    public TripPreferenceDto? Preferences { get; set; }
    public List<ItineraryDto> Itineraries { get; set; } = new();
    public List<AIWorkflowRunDto> WorkflowRuns { get; set; } = new();
}

public class TripPreferenceDto
{
    public string Pace { get; set; } = "Balanced";
    public List<string> Interests { get; set; } = new();
    public List<string> DietaryRestrictions { get; set; } = new();
    public int AdultsCount { get; set; } = 2;
    public int ChildrenCount { get; set; } = 0;
}

public class CreateTripRequest
{
    public string Title { get; set; } = string.Empty;
    public string Destination { get; set; } = "Ella";
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public decimal BudgetLkr { get; set; } = 40000;
    public string Pace { get; set; } = "Balanced";
    public List<string> Interests { get; set; } = new() { "Nature", "Hiking", "Local Food" };
    public List<string> DietaryRestrictions { get; set; } = new();
    public int AdultsCount { get; set; } = 2;
    public int ChildrenCount { get; set; } = 0;
}

public class ItineraryDto
{
    public Guid Id { get; set; }
    public int Version { get; set; }
    public decimal TotalEstimatedCostLkr { get; set; }
    public string Status { get; set; } = string.Empty;
    public List<ItineraryDayDto> Days { get; set; } = new();
}

public class ItineraryDayDto
{
    public Guid Id { get; set; }
    public int DayNumber { get; set; }
    public DateTime Date { get; set; }
    public string Summary { get; set; } = string.Empty;
    public List<ItineraryItemDto> Items { get; set; } = new();
}

public class ItineraryItemDto
{
    public Guid Id { get; set; }
    public string TimeSlot { get; set; } = string.Empty;
    public string ItemType { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public Guid? ReferenceId { get; set; }
    public decimal EstimatedCostLkr { get; set; }
    public int OrderIndex { get; set; }
}

public class AIPlanRequest
{
    public string Objective { get; set; } = "Plan a 2-day Ella trip for LKR 40,000. I like nature, hiking and local food.";
    public decimal? OverrideBudgetLkr { get; set; }
}

public class AIWorkflowRunDto
{
    public Guid Id { get; set; }
    public Guid TripId { get; set; }
    public string Objective { get; set; } = string.Empty;
    public AIWorkflowStatus Status { get; set; }
    public string StatusName => Status.ToString();
    public string CurrentNode { get; set; } = string.Empty;
    public string StateJson { get; set; } = "{}";
    public string? FinalSummaryJson { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public List<ApprovalRequestDto> ApprovalRequests { get; set; } = new();
}

public class ApprovalRequestDto
{
    public Guid Id { get; set; }
    public Guid WorkflowId { get; set; }
    public string ActionType { get; set; } = string.Empty;
    public string PayloadJson { get; set; } = "{}";
    public ApprovalDecision Status { get; set; }
    public string StatusName => Status.ToString();
    public string? DecisionNotes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? DecidedAt { get; set; }
}

public class ApprovalDecisionRequest
{
    public ApprovalDecision Decision { get; set; } // Approved, Rejected, RevisionRequested
    public string? Notes { get; set; }
}
