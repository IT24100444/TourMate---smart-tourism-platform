"""
TourMate AI — Intelligent Sri Lanka Tourism Multi-Agent Service.
ADK 2.0 Multi-Agent Workflow, Specialized LlmAgents, AgentTool Orchestration, Security Checkpoint, and HITL Gate.
"""

import json
import logging
import re
import uuid
from typing import Any, Dict, List, Optional

from google.adk.agents import Agent, LlmAgent
from google.adk.apps import App
from google.adk.models import Gemini
from google.adk.tools import AgentTool, request_input
from google.adk.workflow import Edge, START, Workflow, node
from google.adk import Context
from google.genai import types

from .config import config
from .database import save_workflow_state, record_audit_log, get_workflow_state
from .security import run_security_checkpoint
from .tools_catalog import (
    search_attractions,
    search_accommodations_and_dining,
    calculate_budget_feasibility,
    check_weather_and_seasonality,
    get_destination_insights,
    search_excel_partner_offers_tool,
    search_live_web_accommodation_tool,
    set_shared_context,
    get_shared_context,
)

logger = logging.getLogger("tourmate.agent")

# Shared Gemini LLM Model instance — gemini-2.0-flash with token-saving limits
gemini_model = Gemini(
    model=config.model,
    # Cap output to avoid bloated responses wasting quota.
    # 1024 tokens is enough for all TourMate sub-agent responses.
    generation_config=types.GenerateContentConfig(
        max_output_tokens=1024,
        temperature=0.3,   # Low temp = focused, deterministic, fewer retry-worthy hallucinations
    ),
    retry_options=types.HttpRetryOptions(attempts=2),  # Reduced from 3 → save retry quota
)


# ═══════════════════════════════════════════════════════════════════════════════
# SPECIALIZED LLM SUB-AGENTS (Phases 2 & 3)
# ═══════════════════════════════════════════════════════════════════════════════

# Sub-Agent 1: Tourism Discovery Agent (Member 1 - Nature, Hiking, Heritage)
tourism_discovery_agent = LlmAgent(
    name="tourism_discovery_agent",
    description="Specialist agent for discovering Sri Lanka tourist attractions, nature hikes, UNESCO heritage sites, and visiting hours.",
    model=gemini_model,
    tools=[search_attractions, get_destination_insights],
    instruction=(
        "You are the specialist Tourism Discovery Agent for TourMate Sri Lanka. "
        "Your role is to discover and recommend authentic Sri Lankan attractions, nature treks, "
        "cultural landmarks, and optimal visiting hours for the requested destination. "
        "Always recommend at least 2 attractions with duration and entry fees in LKR."
    )
)

# Sub-Agent 2: Accommodation & Dining Agent (Member 2 - Hotels, Eco-lodges, Cuisine)
accommodation_dining_agent = LlmAgent(
    name="accommodation_dining_agent",
    description="Specialist agent for selecting verified hotels, eco-lodges, partner discount offers, and authentic culinary dining in Sri Lanka.",
    model=gemini_model,
    tools=[search_accommodations_and_dining, search_excel_partner_offers_tool, search_live_web_accommodation_tool],
    instruction=(
        "You are the specialist Accommodation & Dining Agent for TourMate Sri Lanka. "
        "Your role is to select verified tourist hotels, exclusive partner discount offers, and authentic dining venues "
        "(wood-fired clay-pot curries, fresh seafood, hoppers) matching the tourist's destination "
        "and target budget. Provide verified options with transparent LKR pricing and promo codes."
    )
)

# Sub-Agent 3: Booking Feasibility & Constraint Agent (Member 3 - Financials & Weather)
booking_feasibility_agent = LlmAgent(
    name="booking_feasibility_agent",
    description="Specialist agent for calculating financial feasibility, transport buffers, and climate checks.",
    model=gemini_model,
    tools=[calculate_budget_feasibility, check_weather_and_seasonality],
    instruction=(
        "You are the specialist Booking Feasibility & Constraint Agent for TourMate Sri Lanka. "
        "Calculate total costs (accommodation + dining + activities + local transport buffer), "
        "verify that the itinerary strictly respects the tourist's budget ceiling, "
        "and assess weather conditions for the destination."
    )
)


# ADK AgentTool Wrappers enabling Sub-Agents to be called programmatically or by Lead Agents
tourism_discovery_tool = AgentTool(agent=tourism_discovery_agent)
accommodation_dining_tool = AgentTool(agent=accommodation_dining_agent)
booking_feasibility_tool = AgentTool(agent=booking_feasibility_agent)


# ═══════════════════════════════════════════════════════════════════════════════
# WORKFLOW NODE FUNCTIONS (Phases 2, 4, & 5)
# ═══════════════════════════════════════════════════════════════════════════════

async def execute_security_checkpoint(ctx: Context) -> str:
    """Executes PII scrubbing, injection defense, and domain validation (Security Checkpoint Gate)."""
    state = ctx.state
    objective = state.get("objective", "")
    destination = state.get("destination", "Ella")
    budget_lkr = float(state.get("budget_limit_lkr", 40000.0))
    wf_id = state.get("workflow_id", "temp")

    sec_result = run_security_checkpoint(
        objective=objective,
        destination=destination,
        budget_lkr=budget_lkr,
        workflow_id=wf_id
    )

    state["security_check"] = sec_result
    state["sanitized_objective"] = sec_result.get("sanitized_objective", objective)

    if not sec_result["passed"]:
        state["status"] = "FailedSafe"
        state["current_node"] = "security_checkpoint"
        state["error_reason"] = sec_result.get("reason", "Security gate failed")
        return "SECURITY_EVENT"

    state["current_node"] = "planner"
    return "PROCEED"


async def execute_security_event(ctx: Context) -> None:
    """Terminal handler for security violations and prompt injection attempts."""
    state = ctx.state
    state["status"] = "Rejected"
    state["current_node"] = "security_event"
    state.setdefault("history_log", []).append({
        "node": "security_checkpoint",
        "action": f"SECURITY EVENT: {state.get('error_reason')}. Workflow halted."
    })
    save_workflow_state(
        workflow_id=state["workflow_id"],
        trip_id=state.get("trip_id", "trip_unknown"),
        objective=state.get("objective", ""),
        destination=state.get("destination", ""),
        budget_limit_lkr=state.get("budget_limit_lkr", 0.0),
        total_estimated_lkr=0.0,
        status=state["status"],
        current_node="security_event",
        state_data=state
    )


async def execute_planner_coordinator(ctx: Context) -> str:
    """Coordinator (Member 4 - Lead Planner). Parses objective, extracts constraints, delegates tasks."""
    state = ctx.state
    state["current_node"] = "planner"

    # Extract trip duration dynamically from user objective (e.g. "5 day", "5-day", "3 days")
    obj = state.get("objective", "")
    m = re.search(r'(\d+)\s*(?:-| )?\s*(?:day|dat)s?', obj, re.IGNORECASE)
    if m:
        days = int(m.group(1))
    else:
        word_map = {'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7}
        days = 2
        for w, val in word_map.items():
            if f"{w} day" in obj.lower() or f"{w}-day" in obj.lower():
                days = val
                break
    state["duration_days"] = max(1, min(days, 14))

    state.setdefault("history_log", []).append({
        "node": "planner",
        "action": f"Objective parsed for {state.get('destination')} ({state['duration_days']} days, Budget: LKR {state.get('budget_limit_lkr', 0):,.2f}). Delegating to specialist sub-agents."
    })
    return "next"


async def execute_tourism_discovery(ctx: Context) -> str:
    """Member 1 - Tourism Discovery Specialist (Nature, Hiking, Cultural Heritage)."""
    state = ctx.state
    destination = state.get("destination", "Ella")
    state["current_node"] = "tourism_discovery"
    set_shared_context(state)

    # Query catalog and record in shared context
    attractions = search_attractions(destination=destination, category="all")
    insights = get_destination_insights(destination=destination)

    state["attractions"] = attractions
    state["destination_insights"] = insights
    state.setdefault("history_log", []).append({
        "node": "tourism_discovery",
        "action": f"Tourism Discovery Agent discovered {len(attractions)} verified attractions in {destination}."
    })
    return "next"


async def execute_accommodation_dining(ctx: Context) -> str:
    """Member 2 - Accommodation & Dining Specialist (Hotels, Eco-Lodges, Cuisine)."""
    state = ctx.state
    destination = state.get("destination", "Ella")
    state["current_node"] = "accommodation_dining"
    set_shared_context(state)

    businesses = search_accommodations_and_dining(destination=destination, venue_type="all")
    state["businesses"] = businesses
    state.setdefault("history_log", []).append({
        "node": "accommodation_dining",
        "action": f"Accommodation & Dining Agent selected {len(businesses)} verified lodging and restaurant options."
    })
    return "next"


async def execute_booking_feasibility(ctx: Context) -> str:
    """Member 3 - Booking Feasibility & Constraint Specialist (Bi-directional memory + Financial Math)."""
    state = ctx.state
    destination = state.get("destination", "Ella")
    budget_limit = float(state.get("budget_limit_lkr", 40000.0))
    state["current_node"] = "booking_feasibility"
    set_shared_context(state)

    # Read bi-directional memory populated by previous sub-agents
    businesses = state.get("businesses", [])
    attractions = state.get("attractions", [])

    hotels = [b for b in businesses if b.get("type") == "Hotel"]
    restaurants = [b for b in businesses if b.get("type") == "Restaurant"]

    duration_days = state.get("duration_days", 2)
    nights = max(1, duration_days - 1)  # N-day trip has N-1 accommodation nights
    nightly_rate = hotels[0]["cost_lkr"] if hotels else 15000.0
    hotel_cost = nightly_rate * nights
    dining_cost = sum(r["cost_lkr"] for r in restaurants[:2]) * duration_days if restaurants else 3500.0 * duration_days
    activity_cost = sum(a.get("entry_fee_lkr", 0.0) for a in attractions[:min(len(attractions), duration_days + 1)])

    transport_buffer = 1500.0 * duration_days  # 1,500 LKR/day local transport buffer
    feasibility = calculate_budget_feasibility(
        hotel_cost=hotel_cost,
        dining_cost=dining_cost,
        activities_cost=activity_cost,
        budget_limit_lkr=budget_limit,
        transport_buffer_lkr=transport_buffer
    )
    weather = check_weather_and_seasonality(destination=destination)

    state["feasibility"] = feasibility
    state["weather"] = weather
    state["total_estimated_lkr"] = feasibility["estimated_total_lkr"]
    state.setdefault("history_log", []).append({
        "node": "booking_feasibility",
        "action": f"Booking Feasibility Agent completed constraint evaluation: Total LKR {state['total_estimated_lkr']:,.2f} ({feasibility['status_message']})."
    })
    return "next"


async def execute_deterministic_validator(ctx: Context) -> str:
    """Deterministic Validator Node. Enforces hard safety rules before booking commitment."""
    state = ctx.state
    state["current_node"] = "deterministic_validator"
    errors = []

    total_est = state.get("total_estimated_lkr", 0.0)
    budget_limit = state.get("budget_limit_lkr", 0.0)
    attractions = state.get("attractions", [])
    businesses = state.get("businesses", [])

    # Rule 1: Budget ceiling compliance
    if total_est > budget_limit:
        errors.append(f"Budget exceeded! Total LKR {total_est:,.2f} exceeds ceiling LKR {budget_limit:,.2f}.")

    # Rule 2: Minimum attractions threshold
    if len(attractions) < 2:
        errors.append("Proposed itinerary contains fewer than 2 attractions.")

    # Rule 3: Accommodation requirement
    has_hotel = any(b.get("type") == "Hotel" for b in businesses)
    if not has_hotel:
        errors.append("Multi-day itinerary lacks verified hotel accommodation.")

    state["validation_passed"] = (len(errors) == 0)
    state["validation_errors"] = errors

    if not state["validation_passed"]:
        state["status"] = "FailedSafe"
        state.setdefault("history_log", []).append({
            "node": "deterministic_validator",
            "action": f"Validation failed: {'; '.join(errors)}"
        })
        return "VALIDATION_FAILED"

    state.setdefault("history_log", []).append({
        "node": "deterministic_validator",
        "action": "Deterministic validation passed. All business constraints satisfied."
    })
    return "VALIDATION_PASSED"


async def execute_failed_safe(ctx: Context) -> None:
    """Terminal node when deterministic validator catches constraint violation."""
    state = ctx.state
    state["status"] = "FailedSafe"
    state["current_node"] = "failed_safe"
    save_workflow_state(
        workflow_id=state["workflow_id"],
        trip_id=state.get("trip_id", "trip_unknown"),
        objective=state.get("objective", ""),
        destination=state.get("destination", ""),
        budget_limit_lkr=state.get("budget_limit_lkr", 0.0),
        total_estimated_lkr=state.get("total_estimated_lkr", 0.0),
        status="FailedSafe",
        current_node="failed_safe",
        state_data=state
    )


async def execute_human_approval_gate(ctx: Context) -> str:
    """Human-in-the-loop gate before issuing high-impact booking reservations."""
    state = ctx.state
    state["current_node"] = "human_approval_gate"
    state["status"] = "WaitingApproval"
    state["requires_human_approval"] = True
    dest = state.get("destination", "Sri Lanka")
    state["high_impact_action"] = f"Confirm hotel reservation and guided permits in {dest} (Total: LKR {state.get('total_estimated_lkr', 0):,.2f})"

    state.setdefault("history_log", []).append({
        "node": "human_approval_gate",
        "action": "Plan finalized within budget. Execution paused awaiting human approval."
    })
    return "next"


async def execute_final_itinerary(ctx: Context) -> None:
    """Assembles dynamic multi-day personalized itinerary and persists state to SQLite."""
    state = ctx.state
    state["current_node"] = "final_output"
    dest = state.get("destination", "Sri Lanka")
    attractions = state.get("attractions", [])
    businesses = state.get("businesses", [])
    hotels = [b for b in businesses if b.get("type") == "Hotel"]
    restaurants = [b for b in businesses if b.get("type") == "Restaurant"]
    total_est = state.get("total_estimated_lkr", 0.0)
    budget = state.get("budget_limit_lkr", 0.0)

    days_count = state.get("duration_days", 2)

    # Dynamic day-by-day itinerary assembly
    if days_count == 2:
        day1_items = []
        if attractions:
            day1_items.append({"time": "09:00 - 11:30", "type": "Attraction", "name": attractions[0]["name"], "cost": attractions[0]["entry_fee_lkr"]})
        if restaurants:
            day1_items.append({"time": "12:30 - 14:00", "type": "Dining", "name": restaurants[0]["name"], "cost": restaurants[0]["cost_lkr"]})
        if hotels:
            day1_items.append({"time": "14:30 - 15:30", "type": "Check-in", "name": hotels[0]["name"], "cost": hotels[0]["cost_lkr"]})
        if len(attractions) > 1:
            day1_items.append({"time": "16:00 - 18:30", "type": "Attraction", "name": attractions[1]["name"], "cost": attractions[1]["entry_fee_lkr"]})

        day2_items = []
        if len(attractions) > 2:
            day2_items.append({"time": "07:30 - 11:30", "type": "Attraction", "name": attractions[2]["name"], "cost": attractions[2]["entry_fee_lkr"]})
        if len(restaurants) > 1:
            day2_items.append({"time": "12:30 - 14:00", "type": "Dining", "name": restaurants[1]["name"], "cost": restaurants[1]["cost_lkr"]})
        if len(attractions) > 3:
            day2_items.append({"time": "14:30 - 16:30", "type": "Attraction", "name": attractions[3]["name"], "cost": attractions[3]["entry_fee_lkr"]})

        days_list = [
            {
                "day": 1,
                "summary": f"{attractions[0]['name'] if attractions else 'Arrival'} & {restaurants[0]['name'] if restaurants else 'Local Dining'}",
                "items": day1_items
            },
            {
                "day": 2,
                "summary": f"{attractions[2]['name'] if len(attractions) > 2 else 'Exploration'} & Return",
                "items": day2_items
            }
        ]
    else:
        days_list = []
        for d in range(1, days_count + 1):
            items = []
            if d == 1:
                if attractions:
                    items.append({"time": "09:00 - 11:30", "type": "Attraction", "name": attractions[0]["name"], "cost": attractions[0]["entry_fee_lkr"]})
                if restaurants:
                    items.append({"time": "12:30 - 14:00", "type": "Dining", "name": restaurants[0]["name"], "cost": restaurants[0]["cost_lkr"]})
                if hotels:
                    items.append({"time": "14:30 - 15:30", "type": "Check-in", "name": hotels[0]["name"], "cost": hotels[0]["cost_lkr"]})
                if len(attractions) > 1:
                    items.append({"time": "16:00 - 18:30", "type": "Attraction", "name": attractions[1]["name"], "cost": attractions[1]["entry_fee_lkr"]})
            else:
                a_idx = (d - 1) % len(attractions) if attractions else 0
                r_idx = (d - 1) % len(restaurants) if restaurants else 0
                if attractions:
                    items.append({"time": "07:30 - 11:30", "type": "Attraction", "name": attractions[a_idx]["name"], "cost": attractions[a_idx]["entry_fee_lkr"]})
                if restaurants:
                    items.append({"time": "12:30 - 14:00", "type": "Dining", "name": restaurants[r_idx]["name"], "cost": restaurants[r_idx]["cost_lkr"]})
                next_a = (a_idx + 1) % len(attractions) if attractions else 0
                if len(attractions) > 1 and next_a != a_idx:
                    items.append({"time": "15:00 - 17:30", "type": "Attraction", "name": attractions[next_a]["name"], "cost": attractions[next_a]["entry_fee_lkr"]})

            summary = items[0]["name"] if items else f"Day {d} Exploration"
            days_list.append({
                "day": d,
                "summary": summary,
                "items": items
            })

    itinerary = {
        "title": f"Personalized {days_count}-Day {dest} Expedition",
        "destination": dest,
        "budget_limit_lkr": budget,
        "total_estimated_lkr": total_est,
        "savings_lkr": budget - total_est,
        "savings_percentage": state.get("feasibility", {}).get("savings_percentage", 0),
        "days": days_list,
        "travel_insights": state.get("destination_insights", {}),
        "weather_advisory": state.get("weather", {})
    }

    state["final_itinerary"] = itinerary

    # Persist state to SQLite Database
    save_workflow_state(
        workflow_id=state["workflow_id"],
        trip_id=state.get("trip_id", "trip_unknown"),
        objective=state.get("objective", ""),
        destination=dest,
        budget_limit_lkr=budget,
        total_estimated_lkr=total_est,
        status=state.get("status", "WaitingApproval"),
        current_node="final_output",
        state_data=state
    )


# Wrap node functions into ADK 2.0 BaseNode instances
security_checkpoint_node = node(execute_security_checkpoint, name="security_checkpoint")
security_event_node = node(execute_security_event, name="security_event")
planner_coordinator_node = node(execute_planner_coordinator, name="planner_coordinator")
tourism_discovery_node = node(execute_tourism_discovery, name="tourism_discovery")
accommodation_dining_node = node(execute_accommodation_dining, name="accommodation_dining")
booking_feasibility_node = node(execute_booking_feasibility, name="booking_feasibility")
deterministic_validator_node = node(execute_deterministic_validator, name="deterministic_validator")
failed_safe_node = node(execute_failed_safe, name="failed_safe")
human_approval_gate_node = node(execute_human_approval_gate, name="human_approval_gate")
final_itinerary_node = node(execute_final_itinerary, name="final_itinerary")


# ═══════════════════════════════════════════════════════════════════════════════
# ADK 2.0 WORKFLOW GRAPH DEFINITION
# ═══════════════════════════════════════════════════════════════════════════════

tourmate_workflow = Workflow(
    name="tourmate_workflow",
    description="Multi-agent Sri Lanka tourism planning workflow with security gate and deterministic validation.",
    edges=[
        Edge(from_node=START, to_node=security_checkpoint_node),
        Edge(from_node=security_checkpoint_node, to_node=security_event_node, route="SECURITY_EVENT"),
        Edge(from_node=security_checkpoint_node, to_node=planner_coordinator_node, route="PROCEED"),
        Edge(from_node=planner_coordinator_node, to_node=tourism_discovery_node),
        Edge(from_node=tourism_discovery_node, to_node=accommodation_dining_node),
        Edge(from_node=accommodation_dining_node, to_node=booking_feasibility_node),
        Edge(from_node=booking_feasibility_node, to_node=deterministic_validator_node),
        Edge(from_node=deterministic_validator_node, to_node=failed_safe_node, route="VALIDATION_FAILED"),
        Edge(from_node=deterministic_validator_node, to_node=human_approval_gate_node, route="VALIDATION_PASSED"),
        Edge(from_node=human_approval_gate_node, to_node=final_itinerary_node),
    ]
)


# ═══════════════════════════════════════════════════════════════════════════════
# ROOT AGENT & APP EXPORT
# ═══════════════════════════════════════════════════════════════════════════════

def security_checkpoint_tool(objective: str, destination: str, budget_lkr: float) -> str:
    """Security Checkpoint tool for verifying PII, prompt injections, and domain bounds."""
    res = run_security_checkpoint(objective=objective, destination=destination, budget_lkr=budget_lkr)
    return json.dumps(res)


root_agent = Agent(
    name="tourmate_ai",
    model=gemini_model,
    instruction=(
        "You are TourMate AI — the leading Agentic AI Tourism Concierge for Sri Lanka.\n"
        "You orchestrate a team of specialized sub-agents via AgentTools:\n"
        "1. Security Checkpoint: Validates user input safety, PII, and prompt injection defense.\n"
        "2. Tourism Discovery Agent: Discovers attractions, nature treks, and heritage sights.\n"
        "3. Accommodation & Dining Agent: Recommends verified hotels, eco-lodges, and local culinary venues.\n"
        "4. Booking Feasibility & Constraint Agent: Computes financial math, transport buffers, and climate checks.\n"
        "5. Deterministic Validator & Human Approval Gate: Ensures non-negotiable budget bounds and permits approval.\n"
        "Always collaborate with your specialized sub-agents to deliver a tailored, accurate Sri Lanka itinerary."
    ),
    tools=[
        security_checkpoint_tool,
        tourism_discovery_tool,
        accommodation_dining_tool,
        booking_feasibility_tool,
        search_attractions,
        search_accommodations_and_dining,
        calculate_budget_feasibility,
        check_weather_and_seasonality,
        get_destination_insights,
        search_excel_partner_offers_tool,
        search_live_web_accommodation_tool,
    ],
)

app = App(
    root_agent=root_agent,
    name="app",
)


# ═══════════════════════════════════════════════════════════════════════════════
# PROGRAMMATIC EXECUTION HELPER (For FastAPI & Test suites)
# ═══════════════════════════════════════════════════════════════════════════════

class WorkflowContext:
    """Lightweight context container providing state access for pipeline execution."""
    def __init__(self, state: Dict[str, Any]):
        self.state = state


async def run_tourmate_pipeline(
    trip_id: str,
    objective: str,
    budget_lkr: float,
    destination: str,
    workflow_id: Optional[str] = None
) -> Dict[str, Any]:
    """Runs the complete multi-agent pipeline sequentially with state persistence."""
    wf_id = workflow_id if workflow_id else str(uuid.uuid4())

    # Initial state
    state: Dict[str, Any] = {
        "workflow_id": wf_id,
        "trip_id": trip_id,
        "objective": objective,
        "destination": destination,
        "budget_limit_lkr": budget_lkr,
        "total_estimated_lkr": 0.0,
        "status": "Running",
        "current_node": "security_checkpoint",
        "attractions": [],
        "businesses": [],
        "history_log": [],
    }

    ctx = WorkflowContext(state=state)

    # 1. Security Checkpoint
    sec_route = await execute_security_checkpoint(ctx)
    if sec_route == "SECURITY_EVENT":
        await execute_security_event(ctx)
        return state

    # 2. Planner Coordinator
    await execute_planner_coordinator(ctx)

    # 3. Tourism Discovery (Sub-Agent 1)
    await execute_tourism_discovery(ctx)

    # 4. Accommodation & Dining (Sub-Agent 2)
    await execute_accommodation_dining(ctx)

    # 5. Booking Feasibility & Constraint (Sub-Agent 3)
    await execute_booking_feasibility(ctx)

    # 6. Deterministic Validator
    val_route = await execute_deterministic_validator(ctx)
    if val_route == "VALIDATION_FAILED":
        await execute_failed_safe(ctx)
        return state

    # 7. Human-in-the-Loop Approval Gate
    await execute_human_approval_gate(ctx)

    # 8. Final Itinerary Assembly
    await execute_final_itinerary(ctx)

    return state
