"""
Model Context Protocol (MCP) Server for TourMate Sri Lanka Tourism Platform.
Exposes 5 standardized tools over stdio transport using the official MCP Python SDK.
"""

from typing import Any, Dict, List, Optional
from mcp.server.fastmcp import FastMCP
from .tools_catalog import (
    search_attractions as _search_attractions,
    search_accommodations_and_dining as _search_accommodations_and_dining,
    calculate_budget_feasibility as _calculate_budget_feasibility,
    check_weather_and_seasonality as _check_weather_and_seasonality,
    get_destination_insights as _get_destination_insights,
)

# Initialize MCP Server
mcp = FastMCP("tourmate_tourism_mcp")


@mcp.tool()
def search_attractions(destination: str, category: str = "all", max_entry_fee: Optional[float] = None) -> List[Dict[str, Any]]:
    """
    Search approved tourist attractions in Sri Lanka (e.g. Ella, Kandy, Galle, Sigiriya)
    filtered by destination, activity category, and maximum entry fee in LKR.
    """
    return _search_attractions(destination=destination, category=category, max_entry_fee=max_entry_fee)


@mcp.tool()
def search_accommodations_and_dining(destination: str, venue_type: str = "all", max_cost_lkr: Optional[float] = None) -> List[Dict[str, Any]]:
    """
    Find verified hotels, eco-resorts, and authentic dining venues in Sri Lanka.
    venue_type can be 'Hotel', 'Restaurant', or 'all'.
    """
    return _search_accommodations_and_dining(destination=destination, venue_type=venue_type, max_cost_lkr=max_cost_lkr)


@mcp.tool()
def calculate_budget_feasibility(hotel_cost: float, dining_cost: float, activities_cost: float,
                                 budget_limit_lkr: float, transport_buffer_lkr: float = 5500.0) -> Dict[str, Any]:
    """
    Calculates total proposed trip expenses including local transport/tuk-tuk buffer
    and verifies strict compliance with the tourist's budget ceiling in LKR.
    """
    return _calculate_budget_feasibility(
        hotel_cost=hotel_cost,
        dining_cost=dining_cost,
        activities_cost=activities_cost,
        budget_limit_lkr=budget_limit_lkr,
        transport_buffer_lkr=transport_buffer_lkr
    )


@mcp.tool()
def check_weather_and_seasonality(destination: str, travel_month: str = "current") -> Dict[str, Any]:
    """
    Retrieves climate profile, monsoon patterns, recommended gear, and best visiting hours
    for any destination in Sri Lanka.
    """
    return _check_weather_and_seasonality(destination=destination, travel_month=travel_month)


@mcp.tool()
def get_destination_insights(destination: str) -> Dict[str, Any]:
    """
    Retrieves cultural etiquette guidelines, local emergency contact numbers (Tourist Police 1912),
    and transit recommendations for a Sri Lankan destination.
    """
    return _get_destination_insights(destination=destination)


if __name__ == "__main__":
    # Runs the MCP Server using stdio transport
    mcp.run()
