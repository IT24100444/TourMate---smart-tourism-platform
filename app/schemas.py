"""
Pydantic Schemas for TourMate AI Microservice API Endpoints.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class PlanRequest(BaseModel):
    workflow_id: Optional[str] = Field(default=None, description="Optional pre-assigned workflow GUID")
    trip_id: str = Field(default="trip_001", description="Unique identifier for the trip")
    objective: str = Field(
        default="Plan a 2-day Ella trip for LKR 40,000. I like nature, hiking and local food.",
        description="Tourist objective or travel intent"
    )
    budget_lkr: float = Field(default=40000.0, description="Tourist budget in Sri Lankan Rupees (LKR)")
    destination: str = Field(default="Ella", description="Destination city or region in Sri Lanka")


class ResumeRequest(BaseModel):
    workflow_id: str = Field(..., description="ID of the workflow run awaiting human review")
    decision: str = Field(..., description="Human decision: 'Approved', 'Rejected', or 'RevisionRequested'")
    notes: Optional[str] = Field(default=None, description="Optional revision instructions or comments")


class PlanResponse(BaseModel):
    id: str
    tripId: str
    objective: str
    destination: str
    status: int
    statusName: str
    currentNode: str
    totalEstimatedLkr: float
    stateJson: str
    finalSummaryJson: str
