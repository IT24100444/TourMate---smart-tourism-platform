# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import contextlib
import os
from collections.abc import AsyncIterator

from a2a.server.tasks import InMemoryTaskStore
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from google.adk.cli.fast_api import get_fast_api_app
from google.adk.runners import Runner

from app.app_utils import services
from app.app_utils.a2a import attach_a2a_routes
from app.app_utils.reasoning_engine_adapter import (
    attach_reasoning_engine_routes,
)

load_dotenv()
allow_origins = (
    os.getenv("ALLOW_ORIGINS", "").split(",") if os.getenv("ALLOW_ORIGINS") else None
)
otel_to_cloud = os.environ.get(
    "GOOGLE_CLOUD_AGENT_ENGINE_ENABLE_TELEMETRY", ""
).lower() in ("true", "1")

AGENT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


@contextlib.asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    from app.agent import app as adk_app
    from app.agent import root_agent

    runner = Runner(
        app=adk_app,
        session_service=services.get_session_service(),
        artifact_service=services.get_artifact_service(),
        auto_create_session=True,
    )
    app.state.runner = runner
    app.state.agent_app_name = adk_app.name
    await attach_a2a_routes(
        app,
        agent=root_agent,
        runner=runner,
        task_store=InMemoryTaskStore(),
        rpc_path=f"/a2a/{adk_app.name}",
    )
    yield


app: FastAPI = get_fast_api_app(
    agents_dir=AGENT_DIR,
    web=True,
    artifact_service_uri=services.ARTIFACT_SERVICE_URI,
    allow_origins=allow_origins,
    session_service_uri=services.SESSION_SERVICE_URI,
    otel_to_cloud=otel_to_cloud,
    lifespan=lifespan,
)
app.title = "tourmate-ai"
app.description = "API for interacting with the Agent tourmate-ai"

# ─── Explicit CORS middleware — fixes 403 OPTIONS preflight from mobile app ───
# Must be added AFTER get_fast_api_app() so it wraps all routes including ADK's.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # Allow all origins (mobile, web, emulator)
    allow_credentials=False,      # False required when allow_origins=["*"]
    allow_methods=["*"],          # Allow GET, POST, OPTIONS, etc.
    allow_headers=["*"],          # Allow Content-Type, Authorization, etc.
)

# Proxy routes so the Vertex AI Console Playground (reasoning_engine SDK) can
# talk to this agent alongside the native adk_api routes.
attach_reasoning_engine_routes(app)

# ═══════════════════════════════════════════════════════════════════════════════
# TOURMATE PLATFORM MICROSERVICE ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

from fastapi import HTTPException
from pydantic import BaseModel
from app.schemas import PlanRequest, ResumeRequest
from app.agent import run_tourmate_pipeline, app as adk_app, root_agent
from app.database import (
    get_workflow_state,
    save_workflow_state,
    list_recent_workflows,
    list_audit_logs,
    get_db_connection,
    record_audit_log
)


# ─── Conversational Chat Schema ────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str
    session_id: str = ""
    user_id: str = "tourist"


# ─── Shared ADK Runner for Conversational Chat ──────────────────────────────
# We create one runner per process and reuse it (session state is per session_id).
import uuid
from google.genai import types as genai_types

_chat_runner: Runner | None = None

async def _get_chat_runner() -> Runner:
    global _chat_runner
    if _chat_runner is None:
        from app.agent import app as _adk_app
        _chat_runner = Runner(
            app=_adk_app,
            session_service=services.get_session_service(),
            artifact_service=services.get_artifact_service(),
            auto_create_session=True,
        )
    return _chat_runner


@app.post("/api/v1/ai/chat")
async def conversational_chat(request: ChatRequest):
    """
    Multi-turn Conversational AI Endpoint.
    Routes each message through the real ADK Runner with Gemini, maintaining
    session memory so the agent can ask follow-up questions across turns.
    Returns: { session_id, reply, tools_called }
    """
    import json
    session_id = request.session_id or f"sess_{uuid.uuid4().hex[:16]}"
    user_id = request.user_id or "tourist"

    runner = await _get_chat_runner()

    new_message = genai_types.Content(
        role="user",
        parts=[genai_types.Part.from_text(text=request.message)]
    )

    tools_called = []
    text_parts = []

    try:
        async for event in runner.run_async(
            user_id=user_id,
            session_id=session_id,
            new_message=new_message,
        ):
            if event.content and event.content.parts:
                for p in event.content.parts:
                    if getattr(p, "function_call", None):
                        tools_called.append(p.function_call.name)
                    if getattr(p, "text", None):
                        text_parts.append(p.text)
    except Exception as e:
        error_msg = str(e)
        # Detect quota / rate limit / temporary demand spikes and return friendly message
        if any(term in error_msg.upper() for term in ("RESOURCE_EXHAUSTED", "429", "503", "UNAVAILABLE", "HIGH DEMAND")):
            return {
                "session_id": session_id,
                "reply": "I'm experiencing high demand right now. Please try again in 10-20 seconds. The TourMate AI pipeline is ready for your Sri Lanka adventure!",
                "tools_called": [],
                "error": "rate_limit"
            }
        return {
            "session_id": session_id,
            "reply": f"An error occurred: {error_msg[:200]}",
            "tools_called": [],
            "error": "pipeline_error"
        }

    reply = "\n\n".join(text_parts).strip()
    return {
        "session_id": session_id,
        "reply": reply,
        "tools_called": tools_called,
        "error": None
    }


@app.get("/api/v1/health")
async def health_check():
    """Health check endpoint listing all active specialist AI agents."""
    return {
        "status": "Healthy",
        "service": "TourMate.AIService",
        "framework": "Google ADK 2.0 Multi-Agent Workflow",
        "model": os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite"),
        "specialist_agents": [
            "Planner / Coordinator (Member 4 - Lead)",
            "Tourism Discovery Agent (Member 1)",
            "Accommodation & Dining Agent (Member 2)",
            "Booking Feasibility & Constraint Agent (Member 3)",
            "Deterministic Safety Validator",
            "Security Checkpoint & Guardrails Gate"
        ],
        "mcp_server": "Enabled (5 Sri Lanka tourism tools)"
    }


@app.post("/api/v1/ai/plan")
async def start_planning_workflow(request: PlanRequest):
    """
    Flagship Agentic AI Workflow trigger.
    Orchestrates Security Checkpoint, Planner, Discovery, Accommodation, Feasibility,
    and Deterministic Validator, pausing at WaitingApproval for human review.
    """
    state = await run_tourmate_pipeline(
        trip_id=request.trip_id,
        objective=request.objective,
        budget_lkr=request.budget_lkr,
        destination=request.destination,
        workflow_id=request.workflow_id
    )

    status_code_map = {
        "Running": 1,
        "WaitingApproval": 2,
        "Succeeded": 3,
        "FailedSafe": 4,
        "Rejected": 5
    }

    import json
    return {
        "id": state["workflow_id"],
        "tripId": state.get("trip_id", request.trip_id),
        "objective": state.get("objective", request.objective),
        "destination": state.get("destination", request.destination),
        "status": status_code_map.get(state["status"], 1),
        "statusName": state["status"],
        "currentNode": state["current_node"],
        "totalEstimatedLkr": state.get("total_estimated_lkr", 0.0),
        "stateJson": json.dumps(state),
        "finalSummaryJson": json.dumps(state.get("final_itinerary", {}))
    }


@app.post("/api/v1/ai/resume")
async def resume_workflow(request: ResumeRequest):
    """
    Human-In-The-Loop resume endpoint.
    Receives user decision: Approved, Rejected, or RevisionRequested.
    """
    state = get_workflow_state(request.workflow_id)
    if not state:
        raise HTTPException(status_code=404, detail=f"Workflow run '{request.workflow_id}' not found in database.")

    import json
    if request.decision == "Approved":
        state["status"] = "Succeeded"
        state["current_node"] = "human_approval_gate"
        state.setdefault("history_log", []).append({
            "node": "human_approval_gate",
            "action": "Proposal APPROVED by authorized user. Bookings and reservations committed."
        })
        record_audit_log("INFO", "HITL_APPROVED", f"Workflow {request.workflow_id} approved by user.", request.workflow_id)
    elif request.decision == "Rejected":
        state["status"] = "Rejected"
        state["current_node"] = "human_approval_gate"
        state.setdefault("history_log", []).append({
            "node": "human_approval_gate",
            "action": f"Proposal REJECTED by user. Reason: {request.notes or 'None provided'}."
        })
        record_audit_log("WARNING", "HITL_REJECTED", f"Workflow {request.workflow_id} rejected by user.", request.workflow_id)
    elif request.decision == "RevisionRequested":
        state["status"] = "Running"
        state["current_node"] = "planner"
        state.setdefault("history_log", []).append({
            "node": "planner",
            "action": f"Re-planning initiated with user feedback: '{request.notes}'."
        })
        record_audit_log("INFO", "HITL_REVISION", f"Workflow {request.workflow_id} revision requested.", request.workflow_id)
    else:
        raise HTTPException(status_code=400, detail=f"Invalid decision '{request.decision}'. Expected Approved, Rejected, or RevisionRequested.")

    # Save updated state
    save_workflow_state(
        workflow_id=state["workflow_id"],
        trip_id=state.get("trip_id", "trip_unknown"),
        objective=state.get("objective", ""),
        destination=state.get("destination", ""),
        budget_limit_lkr=state.get("budget_limit_lkr", 0.0),
        total_estimated_lkr=state.get("total_estimated_lkr", 0.0),
        status=state["status"],
        current_node=state["current_node"],
        state_data=state
    )

    status_code_map = {
        "Running": 1,
        "WaitingApproval": 2,
        "Succeeded": 3,
        "FailedSafe": 4,
        "Rejected": 5
    }

    return {
        "id": state["workflow_id"],
        "tripId": state.get("trip_id", ""),
        "status": status_code_map.get(state["status"], 1),
        "statusName": state["status"],
        "currentNode": state["current_node"],
        "stateJson": json.dumps(state)
    }


@app.get("/api/v1/ai/status/{workflow_id}")
async def get_workflow_status(workflow_id: str):
    """Queries current workflow execution state from persistent storage."""
    state = get_workflow_state(workflow_id)
    if not state:
        raise HTTPException(status_code=404, detail=f"Workflow '{workflow_id}' not found.")
    return state


@app.get("/api/v1/ai/history")
async def get_workflow_history(limit: int = 10):
    """Retrieves recent workflow executions from persistent SQLite database."""
    return list_recent_workflows(limit=limit)


@app.get("/api/v1/ai/audit")
async def get_audit_records(limit: int = 20):
    """Retrieves security audit logs."""
    return list_audit_logs(limit=limit)


# Main execution
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run(app, host=host, port=port)

