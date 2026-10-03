"""Quick verification test for the multi-day pipeline fix."""
import asyncio
import sys
sys.path.insert(0, ".")
from app.agent import run_tourmate_pipeline, execute_booking_feasibility, WorkflowContext
from app.tools_catalog import search_accommodations_and_dining, search_attractions

async def test_budget_feasibility_5day():
    print("\n=== TEST: Budget feasibility scales correctly for 5-day trip ===")
    businesses = search_accommodations_and_dining(destination="Sigiriya", venue_type="all")
    attractions = search_attractions(destination="Sigiriya", category="all")
    state = {
        "destination": "Sigiriya",
        "budget_limit_lkr": 120000.0,
        "duration_days": 5,
        "businesses": businesses,
        "attractions": attractions,
        "history_log": [],
    }
    ctx = WorkflowContext(state=state)
    await execute_booking_feasibility(ctx)
    total = state.get("total_estimated_lkr", 0)
    print(f"  Total for 5-day: LKR {total:,.0f}")
    hotels = [b for b in businesses if b.get("type") == "Hotel"]
    if hotels:
        nightly = hotels[0]["cost_lkr"]
        nights = 4
        print(f"  Nightly hotel rate: LKR {nightly:,.0f} x {nights} nights = LKR {nightly*nights:,.0f}")
        assert total > nightly, "Total must be greater than a single night rate"
    print("  PASS!")

async def test_5day_sigiriya():
    print("\n=== TEST: 5-day Sigiriya trip LKR 120,000 ===")
    state = await run_tourmate_pipeline(
        trip_id="test_5d_sigiriya",
        objective="I want to go Sigiriya 5 day trip for LKR 120000",
        budget_lkr=120000.0,
        destination="Sigiriya",
    )
    it = state.get("final_itinerary", {})
    days = it.get("days", [])
    print(f"  Duration parsed: {state.get('duration_days')} days")
    print(f"  Title: {it.get('title', 'N/A')}")
    print(f"  Total Est LKR: {state.get('total_estimated_lkr'):,.0f}")
    print(f"  Status: {state.get('status')}")
    print(f"  Day count: {len(days)}")
    for d in days:
        print(f"    Day {d['day']}: {d['summary']}")
    assert state.get("duration_days") == 5, f"Expected 5 days, got {state.get('duration_days')}"
    assert len(days) == 5, f"Expected 5-day itinerary, got {len(days)}"
    print("  PASS!")

async def test_2day_ella():
    print("\n=== TEST: 2-day Ella trip ===")
    state = await run_tourmate_pipeline(
        trip_id="test_2d_ella",
        objective="Plan 2 day Ella trip LKR 40000",
        budget_lkr=40000.0,
        destination="Ella",
    )
    it = state.get("final_itinerary", {})
    days = it.get("days", [])
    print(f"  Duration parsed: {state.get('duration_days')} days")
    print(f"  Status: {state.get('status')}")
    print(f"  Day count: {len(days)}")
    for d in days:
        print(f"    Day {d['day']}: {d['summary']}")
    assert state.get("duration_days") == 2, f"Expected 2 days, got {state.get('duration_days')}"
    assert len(days) == 2, f"Expected 2-day itinerary, got {len(days)}"
    print("  PASS!")

asyncio.run(test_budget_feasibility_5day())
asyncio.run(test_5day_sigiriya())
asyncio.run(test_2day_ella())
print("\nAll tests passed!")
