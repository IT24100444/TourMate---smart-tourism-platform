"""
Security Checkpoint & Guardrails Layer for TourMate AI.
Enforces PII redaction, prompt injection detection, and domain policy limits.
"""

import json
import logging
import re
from typing import Any, Dict, List, Tuple
from .database import record_audit_log

logger = logging.getLogger("tourmate.security")

# Regex patterns for PII scrubbing
PII_PATTERNS = {
    "CREDIT_CARD": re.compile(r"\b(?:\d{4}[ -]?){3}\d{4}\b"),
    "PASSPORT": re.compile(r"\b[A-Z]{1,2}[0-9]{7,8}\b"),
    "SL_NIC_OLD": re.compile(r"\b[0-9]{9}[vVxX]\b"),
    "SL_NIC_NEW": re.compile(r"\b[0-9]{12}\b"),
    "EMAIL": re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b"),
    "PHONE": re.compile(r"\b(?:\+?94|0)?7[0-9]{8}\b"),
}

# Prompt injection adversarial keywords & attack signatures
PROMPT_INJECTION_KEYWORDS = [
    "ignore previous instructions",
    "ignore all instructions",
    "disregard prior prompt",
    "system prompt override",
    "jailbreak",
    "dan mode",
    "developer mode enabled",
    "reveal secret keys",
    "show api key",
    "bypass safety",
    "drop table",
    "execute shell",
    "rm -rf",
    "format c:",
    "admin override",
]

# Supported Sri Lanka tourism destination hubs
APPROVED_DESTINATIONS = [
    "ella", "kandy", "galle", "colombo", "sigiriya", "nuwara eliya",
    "mirissa", "trincomalee", "yala", "bentota", "anuradhapura", "jaffna", "dambulla"
]

# Business rules
MAX_BUDGET_LKR = 50_000_000.0  # LKR 50M maximum tourist ceiling
MIN_BUDGET_LKR = 5_000.0       # Minimum realistic budget for day trip


def scrub_pii(text: str) -> Tuple[str, List[str]]:
    """Redacts PII items and returns redacted text plus list of detected types."""
    redacted = text
    detected_types = []

    for pii_type, pattern in PII_PATTERNS.items():
        if pattern.search(redacted):
            detected_types.append(pii_type)
            redacted = pattern.sub(f"[REDACTED_{pii_type}]", redacted)

    return redacted, detected_types


def detect_prompt_injection(text: str) -> Tuple[bool, List[str]]:
    """Checks for prompt injection patterns and adversarial prompt overrides."""
    lower_text = text.lower()
    matched_patterns = []

    for kw in PROMPT_INJECTION_KEYWORDS:
        if kw in lower_text:
            matched_patterns.append(kw)

    return len(matched_patterns) > 0, matched_patterns


def validate_domain_rules(destination: str, budget_lkr: float) -> Tuple[bool, List[str]]:
    """Validates domain-specific rules (destination existence, realistic budget bounds)."""
    errors = []

    if budget_lkr < MIN_BUDGET_LKR:
        errors.append(f"Budget LKR {budget_lkr:,.2f} is below minimum feasible trip limit of LKR {MIN_BUDGET_LKR:,.2f}.")
    elif budget_lkr > MAX_BUDGET_LKR:
        errors.append(f"Budget LKR {budget_lkr:,.2f} exceeds platform ceiling of LKR {MAX_BUDGET_LKR:,.2f}.")

    dest_lower = destination.strip().lower()
    matched = any(d in dest_lower for d in APPROVED_DESTINATIONS)
    if not matched:
        errors.append(
            f"Destination '{destination}' is not in approved Sri Lanka tourism catalog. "
            f"Supported: {', '.join(d.title() for d in APPROVED_DESTINATIONS[:6])}..."
        )

    return len(errors) == 0, errors


def run_security_checkpoint(objective: str, destination: str, budget_lkr: float,
                            workflow_id: str = "temp") -> Dict[str, Any]:
    """
    Executes the full Security Checkpoint:
    1. Redacts PII
    2. Checks for Prompt Injections
    3. Validates domain business rules
    4. Records structured JSON audit logs
    """
    # 1. PII Redaction
    sanitized_objective, detected_pii = scrub_pii(objective)
    if detected_pii:
        record_audit_log(
            severity="WARNING",
            event_type="PII_DETECTED",
            message=f"PII scrubbed from user input: {', '.join(detected_pii)}",
            workflow_id=workflow_id,
            details={"detected_pii": detected_pii}
        )

    # 2. Prompt Injection Detection
    has_injection, injection_terms = detect_prompt_injection(objective)
    if has_injection:
        record_audit_log(
            severity="CRITICAL",
            event_type="PROMPT_INJECTION_DETECTED",
            message=f"Prompt injection attempt detected: {', '.join(injection_terms)}",
            workflow_id=workflow_id,
            details={"matched_terms": injection_terms}
        )
        return {
            "passed": False,
            "route": "SECURITY_EVENT",
            "reason": f"Security violation: Prompt injection attempt detected ({', '.join(injection_terms)}).",
            "sanitized_objective": sanitized_objective,
            "detected_pii": detected_pii
        }

    # 3. Domain Rules Validation
    domain_ok, domain_errors = validate_domain_rules(destination, budget_lkr)
    if not domain_ok:
        record_audit_log(
            severity="WARNING",
            event_type="DOMAIN_RULE_VIOLATION",
            message=f"Domain rules violation: {'; '.join(domain_errors)}",
            workflow_id=workflow_id,
            details={"errors": domain_errors}
        )
        return {
            "passed": False,
            "route": "DOMAIN_VIOLATION",
            "reason": "; ".join(domain_errors),
            "sanitized_objective": sanitized_objective,
            "detected_pii": detected_pii
        }

    # Success audit
    record_audit_log(
        severity="INFO",
        event_type="SECURITY_CHECKPOINT_PASSED",
        message="Request cleared all security and domain policy gates.",
        workflow_id=workflow_id,
        details={"destination": destination, "budget_lkr": budget_lkr, "pii_scrubbed": len(detected_pii) > 0}
    )

    return {
        "passed": True,
        "route": "PROCEED",
        "reason": "Security and domain validation passed.",
        "sanitized_objective": sanitized_objective,
        "detected_pii": detected_pii
    }
