"""
Accommodation & Dining Agent for TourMate AI Sri Lanka Platform.

This agent acts as a Principal Travel Assistant that queries internal partner Excel discount databases
and live web listings to deliver merged, high-value accommodation and dining recommendations.
"""

import logging
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from tools.excel_search_tool import search_excel_offers
from tools.web_search_tool import search_live_accommodation_and_dining

logger = logging.getLogger("tourmate.agents.accommodation_dining")


class SpecialPartnerOffer(BaseModel):
    name: str = Field(description="Name of partner hotel or restaurant")
    category: str = Field(description="Category e.g. Resort, Hotel, Restaurant, Cafe")
    location: str = Field(description="Town or region in Sri Lanka")
    standard_rate_lkr: float = Field(description="Original standard rate in LKR")
    discount_offer: str = Field(description="Discount summary e.g. 30% OFF")
    promo_code: str = Field(description="Exclusive TourMate promo code")
    offer_details: str = Field(description="Full terms and perks of the offer")
    contact: str = Field(description="Contact telephone number")


class GeneralWebRecommendation(BaseModel):
    title: str = Field(description="Listing title or hotel name")
    snippet: str = Field(description="Key highlights, amenities, or menu specialty")
    rating: Optional[str] = Field(default="N/A", description="Customer review rating")
    operating_hours: Optional[str] = Field(default="N/A", description="Opening hours")
    price_range: Optional[str] = Field(default="N/A", description="Estimated price range")
    source: str = Field(description="Data source e.g. Live Web Search")


class AccommodationDiningResult(BaseModel):
    query: str = Field(description="Original search query")
    location: str = Field(description="Target location")
    total_partner_deals_found: int = Field(description="Number of special partner offers found")
    special_partner_offers: List[Dict[str, Any]] = Field(default_factory=list, description="Exclusive partner deals from Excel DB")
    general_web_recommendations: List[Dict[str, Any]] = Field(default_factory=list, description="Live web search recommendations")
    synthesis_summary: str = Field(description="Merged executive recommendation summary")


ACCOMMODATION_DINING_SYSTEM_PROMPT = """
You are the Principal Accommodation & Dining Agent for the TourMate Smart Tourism Platform (Sri Lanka).

Your mission is to understand tourist lodging and dining preferences, retrieve data from both internal partner
discount databases and live web search feeds, and deliver a merged, high-value response.

CRITICAL ORDER OF OPERATIONS:
1. QUERY EXCEL DATABASE: Search internal partner spreadsheet (hotels_and_restaurants_offers.xlsx) for exclusive partner deals, room discounts, or dining promos.
2. QUERY LIVE WEB SEARCH: Search live web sources for real-time customer reviews, operating hours, and popular public recommendations.
3. SYNTHESIZE & CROSS-REFERENCE: Consolidate both data sources into a unified structure clearly separating 'Exclusive Partner Deals (Special Offers)' from 'General Live Web Recommendations'. Emphasize exact savings, promo codes, and contact details.
"""


class AccommodationDiningAgent:
    """
    Principal Agent class handling accommodation & dining requests via multi-source retrieval.
    """

    def __init__(self, excel_path: Optional[str] = None):
        self.excel_path = excel_path

    def run(self, query: str, location: str = "") -> Dict[str, Any]:
        """
        Executes the 3-step workflow:
        Step 1: Internal Excel Query
        Step 2: Live Web Search Query
        Step 3: Synthesis into combined response payload
        """
        logger.info(f"AccommodationDiningAgent processing query='{query}', location='{location}'")

        # Step 1: Query internal Excel discount database
        excel_results = search_excel_offers(query=query, location=location, file_path=self.excel_path)
        partner_offers = [r for r in excel_results if r.get("is_partner_offer")]

        # Step 2: Query live web search
        web_results = search_live_accommodation_and_dining(query=query, location=location)

        # Step 3: Synthesize combined output payload
        synthesis_lines = []
        loc_str = location.title() if location else "Sri Lanka"
        synthesis_lines.append(f"### TourMate Accommodation & Dining Guide for {loc_str}\n")

        if partner_offers:
            synthesis_lines.append(f"🌟 **Exclusive TourMate Partner Deals ({len(partner_offers)} Found):**")
            for deal in partner_offers:
                synthesis_lines.append(
                    f"- **{deal['name']}** ({deal['category']} in {deal['location']})\n"
                    f"  - **Discount:** {deal['discount_offer']} | **Promo Code:** `{deal['promo_code']}`\n"
                    f"  - **Standard Rate:** LKR {deal['standard_rate_lkr']:,.2f}\n"
                    f"  - **Perks:** {deal['offer_details']}\n"
                    f"  - **Contact:** {deal['contact']}"
                )
            synthesis_lines.append("")
        else:
            synthesis_lines.append("ℹ️ *No exclusive partner promo codes were found for this specific query, but top live web recommendations are listed below.* \n")

        if web_results:
            synthesis_lines.append("🌐 **Live Web Recommendations & Top Rated Options:**")
            for web_item in web_results:
                rating_info = f" | Rating: {web_item.get('rating')}" if web_item.get('rating') else ""
                price_info = f" | Price: {web_item.get('price_range')}" if web_item.get('price_range') else ""
                synthesis_lines.append(
                    f"- **{web_item['title']}**{rating_info}{price_info}\n"
                    f"  - {web_item['snippet']}"
                )
            synthesis_lines.append("")

        synthesis_lines.append("💡 **TourMate Tip:** Quote the promo code directly at partner venues during check-in or reservation to claim your discount!")

        summary_text = "\n".join(synthesis_lines)

        result_payload = AccommodationDiningResult(
            query=query,
            location=location,
            total_partner_deals_found=len(partner_offers),
            special_partner_offers=partner_offers,
            general_web_recommendations=web_results,
            synthesis_summary=summary_text
        )

        return result_payload.model_dump()


def process_accommodation_and_dining_request(query: str, location: str = "") -> Dict[str, Any]:
    """
    Functional helper entrypoint for the Accommodation & Dining Agent.
    """
    agent = AccommodationDiningAgent()
    return agent.run(query=query, location=location)
