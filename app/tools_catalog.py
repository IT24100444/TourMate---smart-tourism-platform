"""
Sri Lanka Tourism Tools Catalog & Knowledge Base for TourMate AI.
Powers both direct agent calls and the external Model Context Protocol (MCP) Server.
"""

from typing import Any, Dict, List, Optional
import contextvars

# Bi-directional shared context across sub-agents
_shared_context: contextvars.ContextVar[Optional[Dict[str, Any]]] = contextvars.ContextVar("_shared_context", default=None)

def set_shared_context(ctx_dict: Dict[str, Any]) -> None:
    """Sets the thread-local context dictionary for current sub-agent execution."""
    _shared_context.set(ctx_dict)

def get_shared_context() -> Optional[Dict[str, Any]]:
    """Returns the current shared context dictionary if active."""
    return _shared_context.get()


# Comprehensive Sri Lanka Attractions Database
ATTRACTIONS_CATALOG: List[Dict[str, Any]] = [
    # Ella (Badulla District)
    {
        "name": "Nine Arch Bridge, Demodara",
        "destination": "Ella",
        "district": "Badulla",
        "category": "Historical / Scenic",
        "duration_mins": 90,
        "entry_fee_lkr": 0.0,
        "time_slot": "Morning (09:00 - 11:00)",
        "rating": 4.8,
        "description": "Iconic British colonial stone train viaduct surrounded by dense jungle and tea fields."
    },
    {
        "name": "Little Adam's Peak Hike",
        "destination": "Ella",
        "district": "Badulla",
        "category": "Hiking / Nature",
        "duration_mins": 120,
        "entry_fee_lkr": 0.0,
        "time_slot": "Late Afternoon (15:30 - 18:00)",
        "rating": 4.7,
        "description": "Easy scenic trek through tea plantations with breathtaking 360-degree views of Ella Gap."
    },
    {
        "name": "Ella Rock Guided Trail",
        "destination": "Ella",
        "district": "Badulla",
        "category": "Adventure / Trekking",
        "duration_mins": 240,
        "entry_fee_lkr": 1000.0,
        "time_slot": "Early Morning (07:00 - 11:30)",
        "rating": 4.9,
        "description": "Challenging morning mountain climb through eucalyptus groves and railway tracks to cliff-top views."
    },
    {
        "name": "Ravana Falls & Cave",
        "destination": "Ella",
        "district": "Badulla",
        "category": "Waterfall / Mythological",
        "duration_mins": 75,
        "entry_fee_lkr": 300.0,
        "time_slot": "Afternoon (14:00 - 15:30)",
        "rating": 4.6,
        "description": "Famous 25m cascading waterfall linked to the legendary Ramayana epic."
    },
    # Kandy (Central Province)
    {
        "name": "Temple of the Sacred Tooth Relic (Sri Dalada Maligawa)",
        "destination": "Kandy",
        "district": "Kandy",
        "category": "Culture / UNESCO Heritage",
        "duration_mins": 120,
        "entry_fee_lkr": 2000.0,
        "time_slot": "Morning (08:30 - 10:30)",
        "rating": 4.9,
        "description": "Venerable Buddhist temple housing Sri Lanka's most sacred relic, the tooth of Gautama Buddha."
    },
    {
        "name": "Royal Botanical Gardens, Peradeniya",
        "destination": "Kandy",
        "district": "Kandy",
        "category": "Botanical / Leisure",
        "duration_mins": 150,
        "entry_fee_lkr": 3000.0,
        "time_slot": "Afternoon (14:00 - 16:30)",
        "rating": 4.8,
        "description": "Historic 147-acre garden renowned for orchid collection, giant Javan fig trees, and palm avenues."
    },
    {
        "name": "Kandy Lake Scenic Walk & Viewpoint",
        "destination": "Kandy",
        "district": "Kandy",
        "category": "Scenic / Leisure",
        "duration_mins": 60,
        "entry_fee_lkr": 0.0,
        "time_slot": "Evening (17:30 - 18:30)",
        "rating": 4.5,
        "description": "Serene waterfront promenade in the center of the hill capital, bordered by the Cloud Wall."
    },
    # Galle (Southern Province)
    {
        "name": "Galle Dutch Fort Ramparts Walk",
        "destination": "Galle",
        "district": "Galle",
        "category": "Historical / UNESCO Heritage",
        "duration_mins": 150,
        "entry_fee_lkr": 0.0,
        "time_slot": "Late Afternoon (16:00 - 18:30)",
        "rating": 4.9,
        "description": "17th-century oceanfront fortified garrison with Dutch architecture, lighthouse, and ocean sunset."
    },
    {
        "name": "Jungle Beach & Rumassala Sanctuary",
        "destination": "Galle",
        "district": "Galle",
        "category": "Beach / Snorkeling",
        "duration_mins": 180,
        "entry_fee_lkr": 0.0,
        "time_slot": "Morning (09:00 - 12:00)",
        "rating": 4.6,
        "description": "Secluded bay tucked into a forested headland with calm turquoise waters ideal for swimming and coral viewing."
    },
    # Sigiriya & Dambulla (Cultural Triangle)
    {
        "name": "Sigiriya Ancient Lion Rock Citadel",
        "destination": "Sigiriya",
        "district": "Matale",
        "category": "Historical / UNESCO Heritage",
        "duration_mins": 210,
        "entry_fee_lkr": 11000.0,
        "time_slot": "Early Morning (07:00 - 10:30)",
        "rating": 5.0,
        "description": "5th-century fortress palace built by King Kashyapa on a sheer 200m granite column with frescoes and water gardens."
    },
    {
        "name": "Pidurangala Rock Sunrise Summit",
        "destination": "Sigiriya",
        "district": "Matale",
        "category": "Hiking / Photography",
        "duration_mins": 120,
        "entry_fee_lkr": 1000.0,
        "time_slot": "Dawn (05:30 - 07:30)",
        "rating": 4.8,
        "description": "Adventurous boulder climb facing Sigiriya with famous panoramic sunrise views of Lion Rock."
    },
    {
        "name": "Dambulla Royal Cave Temple",
        "destination": "Sigiriya",
        "district": "Matale",
        "category": "Culture / UNESCO Heritage",
        "duration_mins": 120,
        "entry_fee_lkr": 2500.0,
        "time_slot": "Afternoon (14:30 - 16:30)",
        "rating": 4.8,
        "description": "Living Buddhist temple complex spanning five vast caves with over 150 gold statues and ceiling murals."
    }
]

# Accommodations and Dining Catalog
BUSINESSES_CATALOG: List[Dict[str, Any]] = [
    # Ella
    {
        "name": "Ella Gap Panoramic Eco Resort",
        "destination": "Ella",
        "type": "Hotel",
        "district": "Badulla",
        "cost_lkr": 18000.0,
        "description": "Certified eco-lodge with private balcony overlooking the Ella Gap ravine. Includes breakfast.",
        "verified": True
    },
    {
        "name": "Nine Arch View Homestay",
        "destination": "Ella",
        "type": "Hotel",
        "district": "Badulla",
        "cost_lkr": 9500.0,
        "description": "Charming family-run guest house situated 500m from the railway bridge with homemade rice & curry.",
        "verified": True
    },
    {
        "name": "Cafe Chill Ella & Artisan Kitchen",
        "destination": "Ella",
        "type": "Restaurant",
        "district": "Badulla",
        "cost_lkr": 3500.0,
        "description": "Buzzing hotspot offering wood-fired pizzas, clay-pot curries, smoothie bowls, and locally roasted coffee.",
        "verified": True
    },
    {
        "name": "Matey Hut Authentic Cooking School & Eatery",
        "destination": "Ella",
        "type": "Restaurant",
        "district": "Badulla",
        "cost_lkr": 4000.0,
        "description": "Intimate eatery serving traditional Sri Lankan curries prepared fresh on wood stoves.",
        "verified": True
    },
    # Kandy
    {
        "name": "Kandy Heritage Grand View Residence",
        "destination": "Kandy",
        "type": "Hotel",
        "district": "Kandy",
        "cost_lkr": 16500.0,
        "description": "Colonial-style hillside hotel with direct views of Kandy Lake and the Temple of the Tooth.",
        "verified": True
    },
    {
        "name": "Slightly Chilled Lounge & Bamboo Garden",
        "destination": "Kandy",
        "type": "Restaurant",
        "district": "Kandy",
        "cost_lkr": 4500.0,
        "description": "Popular sunset rooftop restaurant serving fusion Asian dishes and overlooking Kandy valley.",
        "verified": True
    },
    {
        "name": "Kandyan Muslim Hotel (Biryani & Kottu)",
        "destination": "Kandy",
        "type": "Restaurant",
        "district": "Kandy",
        "cost_lkr": 2000.0,
        "description": "Historic eatery serving legendary cheese chicken kottu and spiced mutton biryani.",
        "verified": True
    },
    # Galle
    {
        "name": "Galle Fort Heritage Villa",
        "destination": "Galle",
        "type": "Hotel",
        "district": "Galle",
        "cost_lkr": 22000.0,
        "description": "Restored Dutch colonial mansion inside the fortified city with courtyard pool and high timber ceilings.",
        "verified": True
    },
    {
        "name": "Poonies Kitchen Galle Fort",
        "destination": "Galle",
        "type": "Restaurant",
        "district": "Galle",
        "cost_lkr": 4500.0,
        "description": "Organic courtyard cafe famous for vibrant thali salads and tropical passion fruit cheesecakes.",
        "verified": True
    },
    # Sigiriya
    {
        "name": "Sigiriya Rock Eco Haven Lodge",
        "destination": "Sigiriya",
        "type": "Hotel",
        "district": "Matale",
        "cost_lkr": 15000.0,
        "description": "Cottage chalets situated within lush forest canopy featuring unobstructed views of Sigiriya Rock.",
        "verified": True
    },
    {
        "name": "Pradeep Restaurant Sigiriya",
        "destination": "Sigiriya",
        "type": "Restaurant",
        "district": "Matale",
        "cost_lkr": 2800.0,
        "description": "Warm village family restaurant renowned for 7-curry banana leaf feasts.",
        "verified": True
    }
]


# Tool 1: Search Attractions
def search_attractions(destination: str, category: str = "all", max_entry_fee: Optional[float] = None) -> List[Dict[str, Any]]:
    """
    Finds verified Sri Lanka attractions by destination, category, and budget ceiling.
    """
    dest_clean = destination.strip().lower()
    results = []

    for attr in ATTRACTIONS_CATALOG:
        match_dest = (dest_clean in attr["destination"].lower() or dest_clean in attr["district"].lower())
        match_cat = (category.lower() == "all" or category.lower() in attr["category"].lower())
        match_fee = (max_entry_fee is None or attr["entry_fee_lkr"] <= max_entry_fee)

        if match_dest and match_cat and match_fee:
            results.append(attr)

    # Fallback to destination match if category is too narrow
    if not results:
        results = [a for a in ATTRACTIONS_CATALOG if dest_clean in a["destination"].lower()]

    ctx = get_shared_context()
    if ctx is not None:
        ctx["attractions"] = results

    return results


# Tool 2: Search Accommodations & Dining
def search_accommodations_and_dining(destination: str, venue_type: str = "all", max_cost_lkr: Optional[float] = None) -> List[Dict[str, Any]]:
    """
    Finds verified tourist hotels, guest houses, and restaurants for a destination.
    """
    dest_clean = destination.strip().lower()
    results = []

    for biz in BUSINESSES_CATALOG:
        match_dest = (dest_clean in biz["destination"].lower() or dest_clean in biz["district"].lower())
        match_type = (venue_type.lower() == "all" or venue_type.lower() == biz["type"].lower())
        match_cost = (max_cost_lkr is None or biz["cost_lkr"] <= max_cost_lkr)

        if match_dest and match_type and match_cost:
            results.append(biz)

    # Fallback if filtered list empty
    if not results:
        results = [b for b in BUSINESSES_CATALOG if dest_clean in b["destination"].lower()]

    ctx = get_shared_context()
    if ctx is not None:
        ctx["businesses"] = results

    return results


# Tool 3: Calculate Budget Feasibility
def calculate_budget_feasibility(hotel_cost: float, dining_cost: float, activities_cost: float,
                                 budget_limit_lkr: float, transport_buffer_lkr: float = 5500.0) -> Dict[str, Any]:
    """
    Performs deterministic financial math including local tuk-tuk / vehicle transport buffer.
    """
    subtotal = hotel_cost + dining_cost + activities_cost
    estimated_total = subtotal + transport_buffer_lkr
    is_feasible = estimated_total <= budget_limit_lkr
    remaining = budget_limit_lkr - estimated_total

    res = {
        "is_feasible": is_feasible,
        "budget_limit_lkr": budget_limit_lkr,
        "estimated_total_lkr": estimated_total,
        "remaining_buffer_lkr": remaining,
        "savings_percentage": round((remaining / budget_limit_lkr) * 100, 1) if budget_limit_lkr > 0 else 0,
        "breakdown": {
            "accommodation_lkr": hotel_cost,
            "dining_lkr": dining_cost,
            "activities_entry_fees_lkr": activities_cost,
            "local_transport_buffer_lkr": transport_buffer_lkr
        },
        "status_message": "Within budget" if is_feasible else f"Budget exceeded by LKR {-remaining:,.2f}"
    }
    ctx = get_shared_context()
    if ctx is not None:
        ctx["feasibility"] = res
    return res


# Tool 4: Check Weather & Seasonality
def check_weather_and_seasonality(destination: str, travel_month: str = "current") -> Dict[str, Any]:
    """
    Provides climate, monsoon patterns, and packing advice for Sri Lankan regions.
    """
    dest_lower = destination.lower()
    if "ella" in dest_lower or "kandy" in dest_lower:
        return {
            "region": "Central Highlands (Hill Country)",
            "average_temp_c": "18°C - 24°C",
            "climate_summary": "Cool mountain breeze with occasional afternoon mist or showers.",
            "recommended_gear": "Light sweater or fleece for evenings, hiking shoes, light rain jacket.",
            "prime_hiking_hours": "06:30 - 11:00 AM (best visibility before afternoon clouds form)."
        }
    elif "galle" in dest_lower or "mirissa" in dest_lower:
        return {
            "region": "Southern Coastline",
            "average_temp_c": "28°C - 32°C",
            "climate_summary": "Tropical sunshine with refreshing coastal sea breezes.",
            "recommended_gear": "Sunscreen (SPF 50), sunglasses, swimwear, light breathable linen.",
            "prime_hours": "Morning swimming (07:00 - 10:00) and golden hour sunset (17:30 - 18:30)."
        }
    elif "sigiriya" in dest_lower:
        return {
            "region": "Cultural Triangle / Dry Zone",
            "average_temp_c": "30°C - 34°C",
            "climate_summary": "Sunny and warm; midday heat can be intense.",
            "recommended_gear": "Wide-brim hat, hydration pack (minimum 1.5L), modest temple attire (shoulders & knees covered).",
            "prime_hours": "Early morning climb (07:00 AM) or sunset climb (04:30 PM)."
        }
    res = {
        "region": "Sri Lanka General",
        "average_temp_c": "27°C",
        "climate_summary": "Pleasant tropical weather.",
        "recommended_gear": "Comfortable walking footwear and rain umbrella.",
        "prime_hours": "Early morning and late afternoon."
    }
    ctx = get_shared_context()
    if ctx is not None:
        ctx["weather"] = res
    return res


# Tool 5: Get Destination Insights
def get_destination_insights(destination: str) -> Dict[str, Any]:
    """
    Returns cultural etiquette, emergency numbers, and transit tips.
    """
    res = {
        "destination": destination.title(),
        "currency": "Sri Lankan Rupee (LKR)",
        "tourist_police_hotline": "1912",
        "emergency_ambulance": "1990 (Suwa Seriya)",
        "cultural_etiquette": [
            "Remove shoes and headwear before entering Buddhist temples and sacred sites.",
            "Dress modestly covering shoulders and knees at all religious shrines.",
            "Do not pose with your back turned directly to a Buddha statue for photographs."
        ],
        "local_transit_tip": "For scenic journeys, reserve 2nd class observation train seats in advance."
    }
    ctx = get_shared_context()
    if ctx is not None:
        ctx["destination_insights"] = res
    return res


# Tool 6: Search Excel Partner Discounts
def search_excel_partner_offers_tool(query: str, location: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Searches internal partner discount database (hotels_and_restaurants_offers.xlsx) for exclusive deals.
    """
    from tools.excel_search_tool import search_excel_offers
    return search_excel_offers(query=query, location=location)


# Tool 7: Search Live Web Accommodation & Dining
def search_live_web_accommodation_tool(query: str, location: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Performs live web search for hotels, resorts, restaurants, ratings, and operating hours in Sri Lanka.
    """
    from tools.web_search_tool import search_live_accommodation_and_dining
    return search_live_accommodation_and_dining(query=query, location=location)

