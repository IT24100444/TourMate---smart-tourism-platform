"""
Excel Search Tool for TourMate AI Subsystem.
Searches the internal partner discount database (hotels_and_restaurants_offers.xlsx)
for exclusive partner deals, room discounts, and dining offers across Sri Lanka.
"""

import os
import logging
from typing import Any, Dict, List, Optional
import pandas as pd

logger = logging.getLogger("tourmate.tools.excel_search")

DEFAULT_EXCEL_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "hotels_and_restaurants_offers.xlsx")
_CACHED_EXCEL_RECORDS: Optional[List[Dict[str, Any]]] = None
_CACHED_EXCEL_PATH: Optional[str] = None


def search_excel_offers(
    query: str,
    location: Optional[str] = None,
    file_path: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Searches the internal Excel discount database by keyword, location, amenity, or category.

    Args:
        query: General search term (e.g., 'Ella', 'seafood', 'spa', 'luxury', 'cafe')
        location: Optional location filter (e.g., 'Kandy', 'Colombo', 'Ella')
        file_path: Path to Excel file (defaults to data/hotels_and_restaurants_offers.xlsx)

    Returns:
        List of dicts representing matching partner records with discount details.
    """
    path_to_use = file_path if file_path else DEFAULT_EXCEL_PATH

    if not os.path.exists(path_to_use):
        logger.warning(f"Excel discount file not found at path: {path_to_use}")
        return [{
            "error": f"Internal discount database file not found at path: {path_to_use}",
            "is_partner_offer": False,
            "status_message": "Excel database missing. Proceeding to live web search fallback."
        }]

    global _CACHED_EXCEL_RECORDS, _CACHED_EXCEL_PATH
    if _CACHED_EXCEL_RECORDS is not None and _CACHED_EXCEL_PATH == path_to_use:
        all_records = _CACHED_EXCEL_RECORDS
    else:
        try:
            excel_file = pd.ExcelFile(path_to_use)
            all_records = []
            for sheet in excel_file.sheet_names:
                df = excel_file.parse(sheet).fillna("")
                for _, row in df.iterrows():
                    name = str(row.get("Hotel Name", "") or row.get("Name of Business", "") or row.get("Name", "")).strip()
                    if not name or name.lower().startswith("unnamed"):
                        continue
                    loc = str(row.get("Hotel Address", "") or row.get("Location ", "") or row.get("Location", "")).strip()
                    cat = str(row.get("Business Type ", "") or row.get("Category", "") or ("Hotel" if "hotel" in sheet.lower() else sheet.strip())).strip()
                    raw_offer = str(row.get("Offer percentage", "") or row.get("Offer Type ", "") or row.get("Discount_Offer", "")).strip()
                    contact = str(row.get("phone Number", "") or row.get("Contact Person ", "") or row.get("Contact", "")).strip()
                    details = str(row.get("Use Credit card ", "") or row.get("Bank ", "") or row.get("Description", "") or row.get("Offer_Details", "")).strip()

                    # Format discount percentage if numeric float like 0.25 -> 25% OFF
                    try:
                        f_offer = float(raw_offer)
                        if 0.0 < f_offer <= 1.0:
                            discount_str = f"{int(round(f_offer * 100))}% OFF"
                        else:
                            discount_str = f"{int(f_offer)}% OFF"
                    except (ValueError, TypeError):
                        discount_str = raw_offer if raw_offer else "Exclusive Partner Deal"

                    promo_code = f"TOURMATE{cat[:3].upper()}" if cat else "TOURMATEPARTNER"
                    std_rate = 18000.0 if "hotel" in cat.lower() else 3500.0

                    all_records.append({
                        "name": name,
                        "category": cat,
                        "location": loc,
                        "cuisine_or_amenities": details,
                        "standard_rate_lkr": std_rate,
                        "discount_offer": discount_str,
                        "promo_code": promo_code,
                        "offer_details": f"Partner offer: {details}" if details else "Direct verified booking",
                        "contact": contact if contact else "Via TourMate Concierge",
                        "is_partner_offer": True
                    })
            _CACHED_EXCEL_RECORDS = all_records
            _CACHED_EXCEL_PATH = path_to_use
        except Exception as e:
            logger.error(f"Failed to read Excel discount database: {e}")
            return [{
                "error": f"Failed to read Excel discount database: {str(e)}",
                "is_partner_offer": False,
                "status_message": "Error accessing internal offers spreadsheet."
            }]

    if not all_records:
        return [{
            "message": "No internal partner offers available in database.",
            "is_partner_offer": False
        }]

    # Normalize search terms
    clean_query = (query or "").strip().lower()
    clean_location = (location or "").strip().lower()

    matches = []
    for rec in all_records:
        searchable_text = f"{rec['name']} {rec['category']} {rec['location']} {rec['cuisine_or_amenities']} {rec['discount_offer']} {rec['offer_details']}".lower()

        # Check location filter if provided
        loc_matched = True
        if clean_location:
            loc_matched = clean_location in rec["location"].lower() or clean_location in searchable_text

        # Check general query match
        query_matched = True
        if clean_query and clean_query != "all":
            query_terms = clean_query.split()
            query_matched = any(term in searchable_text for term in query_terms)

        if loc_matched and query_matched:
            matches.append(rec)

    if not matches:
        return [{
            "message": f"No exclusive partner discounts found for query '{query}' in '{location or 'all locations'}'.",
            "is_partner_offer": False,
            "query": query,
            "location": location
        }]

    return matches[:15]

