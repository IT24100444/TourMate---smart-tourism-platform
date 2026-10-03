using System;
using TourMate.Domain.Enums;

namespace TourMate.Domain.Entities;

public class Trip
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TouristUserId { get; set; }
    public User? Tourist { get; set; }

    public string Title { get; set; } = string.Empty;
    public string Destination { get; set; } = "Ella";
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public decimal BudgetLkr { get; set; } = 40000;
    public TripStatus Status { get; set; } = TripStatus.Draft;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public TripPreference? Preferences { get; set; }
    public ICollection<Itinerary> Itineraries { get; set; } = new List<Itinerary>();
    public ICollection<AIWorkflowRun> WorkflowRuns { get; set; } = new List<AIWorkflowRun>();
}

public class TripPreference
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TripId { get; set; }
    public Trip? Trip { get; set; }

    public string Pace { get; set; } = "Balanced"; // Relaxed, Balanced, Fast
    public string InterestsJson { get; set; } = "[\"Nature\", \"Hiking\", \"Local Food\"]";
    public string DietaryRestrictionsJson { get; set; } = "[\"Vegetarian Friendly\"]";
    public int AdultsCount { get; set; } = 2;
    public int ChildrenCount { get; set; } = 0;
}

public class Itinerary
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TripId { get; set; }
    public Trip? Trip { get; set; }

    public int Version { get; set; } = 1;
    public decimal TotalEstimatedCostLkr { get; set; }
    public string Status { get; set; } = "Proposed"; // Proposed, Finalized, Active
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<ItineraryDay> Days { get; set; } = new List<ItineraryDay>();
}

public class ItineraryDay
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ItineraryId { get; set; }
    public Itinerary? Itinerary { get; set; }

    public int DayNumber { get; set; }
    public DateTime Date { get; set; }
    public string Summary { get; set; } = string.Empty;

    public ICollection<ItineraryItem> Items { get; set; } = new List<ItineraryItem>();
}

public class ItineraryItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid DayId { get; set; }
    public ItineraryDay? Day { get; set; }

    public string TimeSlot { get; set; } = "09:00 - 11:30";
    public string ItemType { get; set; } = "Place"; // "Place", "Hotel", "Restaurant", "Transport"
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public Guid? ReferenceId { get; set; } // Reference to TourismPlace or Business
    public decimal EstimatedCostLkr { get; set; }
    public int OrderIndex { get; set; }
}

public class AIWorkflowRun
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TripId { get; set; }
    public Trip? Trip { get; set; }

    public string Objective { get; set; } = string.Empty;
    public AIWorkflowStatus Status { get; set; } = AIWorkflowStatus.Running;
    public string CurrentNode { get; set; } = "planner";
    public string StateJson { get; set; } = "{}";
    public string? FinalSummaryJson { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }

    public ICollection<ApprovalRequest> ApprovalRequests { get; set; } = new List<ApprovalRequest>();
}

public class ApprovalRequest
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid WorkflowId { get; set; }
    public AIWorkflowRun? Workflow { get; set; }

    public string ActionType { get; set; } = "ConfirmBookingPackage";
    public string PayloadJson { get; set; } = "{}";
    public ApprovalDecision Status { get; set; } = ApprovalDecision.Pending;
    public Guid? DecidedByUserId { get; set; }
    public string? DecisionNotes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DecidedAt { get; set; }
}
