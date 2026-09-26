"""
Database & Persistence Layer for TourMate AI Subsystem.

Now uses SQLAlchemy with a PostgreSQL connection (via DATABASE_URL) and falls back to SQLite for local development.
"""

import json
import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import Column, DateTime, Float, Integer, String, Text, create_engine
from sqlalchemy.orm import declarative_base, Session, sessionmaker

logger = logging.getLogger("tourmate.database")

# Load environment variables (fast_api_app already calls load_dotenv())
SQLITE_URL = f"sqlite:///{os.path.join(os.path.dirname(__file__), '..', 'tourmate_ai.db')}"
DATABASE_URL = os.getenv("DATABASE_URL", SQLITE_URL)

# Create SQLAlchemy engine with graceful SQLite fallback if external PostgreSQL is unreachable
def init_engine():
    try:
        eng = create_engine(DATABASE_URL, echo=False, future=True, pool_pre_ping=True)
        with eng.connect() as conn:
            pass
        return eng
    except Exception as ex:
        logger.warning(f"Unable to connect to primary DATABASE_URL ({ex}). Falling back to local SQLite at {SQLITE_URL}")
        return create_engine(SQLITE_URL, echo=False, future=True, pool_pre_ping=True)

engine = init_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
Base = declarative_base()

# ORM models matching the original schema
class Workflow(Base):
    __tablename__ = "workflows"
    workflow_id = Column(String, primary_key=True)
    trip_id = Column(String, nullable=False)
    objective = Column(String, nullable=False)
    destination = Column(String, nullable=False)
    budget_limit_lkr = Column(Float, nullable=False)
    total_estimated_lkr = Column(Float, default=0.0)
    status = Column(String, nullable=False)
    current_node = Column(String, nullable=False)
    state_json = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    workflow_id = Column(String, nullable=True)
    severity = Column(String, nullable=False)
    event_type = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    details_json = Column(Text, nullable=True)

# Initialize tables (creates if not exist)
Base.metadata.create_all(bind=engine)

# Helper to get a session
def get_session() -> Session:
    return SessionLocal()

def save_workflow_state(
    workflow_id: str,
    trip_id: str,
    objective: str,
    destination: str,
    budget_limit_lkr: float,
    total_estimated_lkr: float,
    status: str,
    current_node: str,
    state_data: Dict[str, Any],
) -> None:
    """Insert or update a workflow record using SQLAlchemy."""
    session = get_session()
    try:
        state_json = json.dumps(state_data)
        wf = session.get(Workflow, workflow_id)
        if wf is None:
            wf = Workflow(
                workflow_id=workflow_id,
                trip_id=trip_id,
                objective=objective,
                destination=destination,
                budget_limit_lkr=budget_limit_lkr,
                total_estimated_lkr=total_estimated_lkr,
                status=status,
                current_node=current_node,
                state_json=state_json,
            )
            session.add(wf)
        else:
            wf.total_estimated_lkr = total_estimated_lkr
            wf.status = status
            wf.current_node = current_node
            wf.state_json = state_json
            wf.updated_at = datetime.now(timezone.utc)
        session.commit()
    finally:
        session.close()

def get_workflow_state(workflow_id: str) -> Optional[Dict[str, Any]]:
    """Return the stored workflow state as a dictionary, or None if not found."""
    session = get_session()
    try:
        wf = session.get(Workflow, workflow_id)
        if wf:
            return json.loads(wf.state_json)
        return None
    finally:
        session.close()

def list_recent_workflows(limit: int = 10) -> List[Dict[str, Any]]:
    """Return a list of recent workflow summaries ordered by update time descending."""
    session = get_session()
    try:
        rows = (
            session.query(
                Workflow.workflow_id,
                Workflow.trip_id,
                Workflow.destination,
                Workflow.budget_limit_lkr,
                Workflow.total_estimated_lkr,
                Workflow.status,
                Workflow.updated_at,
            )
            .order_by(Workflow.updated_at.desc())
            .limit(limit)
            .all()
        )
        return [
            {
                "workflow_id": r.workflow_id,
                "trip_id": r.trip_id,
                "destination": r.destination,
                "budget_limit_lkr": r.budget_limit_lkr,
                "total_estimated_lkr": r.total_estimated_lkr,
                "status": r.status,
                "updated_at": r.updated_at.isoformat(),
            }
            for r in rows
        ]
    finally:
        session.close()

def record_audit_log(
    severity: str,
    event_type: str,
    message: str,
    workflow_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
) -> None:
    """Insert an audit log entry."""
    session = get_session()
    try:
        details_json = json.dumps(details or {})
        log = AuditLog(
            workflow_id=workflow_id,
            severity=severity,
            event_type=event_type,
            message=message,
            details_json=details_json,
        )
        session.add(log)
        session.commit()
    finally:
        session.close()

def list_audit_logs(limit: int = 20) -> List[Dict[str, Any]]:
    """Retrieve the most recent audit log entries."""
    session = get_session()
    try:
        rows = session.query(AuditLog).order_by(AuditLog.id.desc()).limit(limit).all()
        return [
            {
                "id": r.id,
                "timestamp": r.timestamp.isoformat() if r.timestamp else None,
                "workflow_id": r.workflow_id,
                "severity": r.severity,
                "event_type": r.event_type,
                "message": r.message,
                "details_json": r.details_json,
            }
            for r in rows
        ]
    finally:
        session.close()

def get_db_connection():
    """Returns a raw DB-API connection for compatibility."""
    return engine.raw_connection()
