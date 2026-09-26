"""
Unit Tests for Accommodation & Dining Agent & Tools in TourMate AI.
Tests Excel query search, live web search fallback, edge cases (missing file, no matches),
and combined output payload synthesis.
"""

import os
import pytest
from tools.excel_search_tool import search_excel_offers
from tools.web_search_tool import search_live_accommodation_and_dining
from agents.accommodation_dining_agent import AccommodationDiningAgent, process_accommodation_and_dining_request

TEST_EXCEL_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "hotels_and_restaurants_offers.xlsx")


def test_excel_search_valid_query():
    """Test searching Excel database for Ella luxury resort deals."""
    results = search_excel_offers(query="luxury resort", location="Ella", file_path=TEST_EXCEL_PATH)
    assert isinstance(results, list)
    assert len(results) > 0
    match = results[0]
    assert match.get("is_partner_offer") is True
    assert "98 Acres" in match.get("name")
    assert match.get("location") == "Ella"
    assert "TOURMATE30" in match.get("promo_code")


def test_excel_search_restaurant_query():
    """Test searching Excel database for Colombo seafood restaurants."""
    results = search_excel_offers(query="crab seafood", location="Colombo", file_path=TEST_EXCEL_PATH)
    assert len(results) > 0
    match = results[0]
    assert "Ministry of Crab" in match.get("name")
    assert "CRAB20" in match.get("promo_code")


def test_excel_search_no_matches():
    """Test searching for a non-existent amenity or location."""
    results = search_excel_offers(query="underwater glass hotel", location="NonExistentTown", file_path=TEST_EXCEL_PATH)
    assert len(results) > 0
    assert results[0].get("is_partner_offer") is False
    assert "No exclusive partner discounts found" in results[0].get("message", "")


def test_excel_search_missing_file():
    """Test graceful handling when Excel file does not exist."""
    fake_path = "data/non_existent_file_12345.xlsx"
    results = search_excel_offers(query="hotel", location="Ella", file_path=fake_path)
    assert len(results) > 0
    assert "error" in results[0] or "Internal discount database file not found" in results[0].get("error", "")


def test_web_search_execution():
    """Test live web search execution with location enrichment."""
    web_results = search_live_accommodation_and_dining(query="best cafes", location="Ella")
    assert isinstance(web_results, list)
    assert len(web_results) > 0
    assert "title" in web_results[0]
    assert "snippet" in web_results[0]


def test_accommodation_dining_agent_full_workflow():
    """Test end-to-end Accommodation & Dining Agent execution and synthesis output."""
    agent = AccommodationDiningAgent(excel_path=TEST_EXCEL_PATH)
    res = agent.run(query="resort spa", location="Ella")

    assert res["query"] == "resort spa"
    assert res["location"] == "Ella"
    assert res["total_partner_deals_found"] >= 1
    assert len(res["special_partner_offers"]) >= 1
    assert len(res["general_web_recommendations"]) >= 1
    assert "TOURMATE30" in res["synthesis_summary"]
    assert "TourMate Accommodation & Dining Guide for Ella" in res["synthesis_summary"]


def test_functional_entrypoint():
    """Test the functional entrypoint process_accommodation_and_dining_request."""
    res = process_accommodation_and_dining_request(query="cafe woodfired pizza", location="Galle")
    assert isinstance(res, dict)
    assert res["location"] == "Galle"
    assert "special_partner_offers" in res
    assert "general_web_recommendations" in res
    assert "synthesis_summary" in res
