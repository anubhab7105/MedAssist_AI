"""
Recovery-mode AI service.

Two entry points:
- evaluate_checkin(): classifies free-text check-in input as strained or
  not, after first running the existing emergency-detection layer (which
  short-circuits to the emergency path if triggered).
- generate_recovery_activity(): produces a short, low-effort activity
  suggestion tailored to the check-in context.

Both reuse the shared Groq client infrastructure in groq_service.py
(headers, URL, settings, error type) and follow the same
request_with_retry / JSON-mode pattern used by get_symptom_analysis().
"""

import json
import logging

import httpx

from app.core.config import get_settings
from app.core.http_client import request_with_retry
from app.models.schemas import CheckInResponse, RecoveryActivityResponse
from app.services.emergency_detector import detect_emergency, EmergencyMatch
from app.services.groq_service import GROQ_API_URL, _headers, GroqAPIError

logger = logging.getLogger(__name__)

settings = get_settings()

# -------------------------------------------------------------------------
# Prompts
# -------------------------------------------------------------------------

_CHECKIN_SYSTEM_PROMPT = """\
You are a wellness strain classifier for a health-tracking app.

Given a user's free-text check-in message, evaluate how much physical or
emotional strain the user is experiencing RIGHT NOW.

Respond ONLY with a single JSON object (no markdown, no preamble) with
exactly these keys:
{
  "confidence": <float between 0.0 and 1.0 — how confident you are that \
the user is currently under significant strain>,
  "summary": "<one sentence summarising their state>"
}

Scoring guidance:
- 0.0–0.3 = clearly fine, positive or neutral mood
- 0.3–0.6 = mild stress, minor discomfort, manageable
- 0.6–0.8 = notable strain — sleep-deprived, unwell, anxious, overwhelmed
- 0.8–1.0 = severe strain — acute illness, extreme exhaustion, distress

Be calibrated. Most everyday messages should score below 0.4. Only score
above 0.6 when the message contains clear signals of impaired wellbeing."""

_ACTIVITY_SYSTEM_PROMPT = """\
You are a recovery-activity coach for a health-tracking app. The user is
in Recovery Mode because they reported feeling unwell or strained.

Given the context of what they reported, suggest ONE short, low-effort
recovery activity (roughly 3 minutes) appropriate for someone who is
tired, unwell, or stressed.

Respond ONLY with a single JSON object (no markdown, no preamble) with
exactly these keys:
{
  "activity": "<short, friendly description of the activity>",
  "duration_minutes": <integer, typically 3>,
  "category": "<one of: hydration, rest, breathing, stretching, mindfulness, nutrition>"
}

Keep the activity realistic and achievable. Prefer calming activities.
Do NOT suggest exercise, medication, or anything requiring effort."""


# -------------------------------------------------------------------------
# Public API
# -------------------------------------------------------------------------

class EmergencyDetected(Exception):
    """Raised when the emergency detector fires on check-in text.

    The route layer catches this and redirects to the existing emergency
    response path instead of continuing with recovery-mode logic.
    """

    def __init__(self, match: EmergencyMatch):
        self.match = match
        super().__init__(f"Emergency detected: {match.matched_categories}")


async def evaluate_checkin(text: str) -> CheckInResponse:
    """Classify a check-in message as strained or not.

    Runs the existing emergency detector FIRST (Phase 0, decision 4).
    If it fires, raises EmergencyDetected so the route can short-circuit
    to the existing emergency path.

    Otherwise, calls Groq for a strain confidence score and compares it
    against RECOVERY_TRIGGER_THRESHOLD.
    """
    # Stage 0: emergency short-circuit
    emergency = detect_emergency(text)
    if emergency.triggered:
        raise EmergencyDetected(emergency)

    # Stage 1: Groq strain classification (JSON mode)
    payload = {
        "model": settings.groq_json_model,
        "messages": [
            {"role": "system", "content": _CHECKIN_SYSTEM_PROMPT},
            {"role": "user", "content": text},
        ],
        "temperature": 0.3,
        "max_tokens": 200,
        "response_format": {"type": "json_object"},
    }

    timeout = httpx.Timeout(settings.groq_json_timeout_seconds, connect=5.0)
    try:
        response = await request_with_retry(
            "POST",
            GROQ_API_URL,
            timeout=timeout,
            headers=_headers(),
            json=payload,
        )
    except httpx.HTTPError as exc:
        raise GroqAPIError(f"Could not reach the AI provider: {exc}") from exc

    if response.status_code != 200:
        raise GroqAPIError(f"Groq API error {response.status_code}: {response.text}")

    data = response.json()
    content = data["choices"][0]["message"]["content"]
    try:
        result = json.loads(content)
    except json.JSONDecodeError as exc:
        raise GroqAPIError("Groq returned non-JSON content for check-in evaluation") from exc

    confidence = float(result.get("confidence", 0.0))
    confidence = max(0.0, min(1.0, confidence))  # clamp to [0, 1]
    summary = result.get("summary", "")

    return CheckInResponse(
        recovery_triggered=confidence >= settings.recovery_trigger_threshold,
        confidence=confidence,
        summary=summary,
    )


async def generate_recovery_activity(context: str) -> RecoveryActivityResponse:
    """Generate a short recovery activity tailored to the check-in context."""
    payload = {
        "model": settings.groq_json_model,
        "messages": [
            {"role": "system", "content": _ACTIVITY_SYSTEM_PROMPT},
            {"role": "user", "content": f"User's check-in: {context}"},
        ],
        "temperature": 0.5,
        "max_tokens": 200,
        "response_format": {"type": "json_object"},
    }

    timeout = httpx.Timeout(settings.groq_json_timeout_seconds, connect=5.0)
    try:
        response = await request_with_retry(
            "POST",
            GROQ_API_URL,
            timeout=timeout,
            headers=_headers(),
            json=payload,
        )
    except httpx.HTTPError as exc:
        raise GroqAPIError(f"Could not reach the AI provider: {exc}") from exc

    if response.status_code != 200:
        raise GroqAPIError(f"Groq API error {response.status_code}: {response.text}")

    data = response.json()
    content = data["choices"][0]["message"]["content"]
    try:
        result = json.loads(content)
    except json.JSONDecodeError as exc:
        raise GroqAPIError("Groq returned non-JSON content for recovery activity") from exc

    return RecoveryActivityResponse(
        activity=result.get("activity", "Take a short rest"),
        duration_minutes=int(result.get("duration_minutes", 3)),
        category=result.get("category", "rest"),
    )
