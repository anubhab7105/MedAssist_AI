"""
Check-in and Recovery Mode endpoints.

POST /api/v1/checkin         — evaluate a free-text check-in for strain.
GET  /api/v1/checkin/recovery-activity — generate a recovery activity.

Both are AI-backed and rate-limited at AI_RATE, matching the symptom
checker and chat routes.
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from postgrest.exceptions import APIError

from app.core.rate_limit import limiter, AI_RATE
from app.core.security import get_current_user, AuthenticatedUser
from app.models.schemas import (
    CheckInRequest,
    CheckInResponse,
    RecoveryActivityResponse,
    SymptomCheckResponse,
    Severity,
)
from app.services.emergency_detector import get_emergency_message
from app.services.groq_service import GroqAPIError
from app.services.recovery_service import (
    evaluate_checkin,
    generate_recovery_activity,
    EmergencyDetected,
)
from app.services.supabase_service import ensure_user_profile, get_supabase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/checkin", tags=["checkin"])

# Recovery mode halves the user's daily goal (floor of 1).
_RECOVERY_GOAL_DIVISOR = 2


@router.post("", response_model=CheckInResponse)
@limiter.limit(AI_RATE)
async def post_checkin(
    request: Request,
    payload: CheckInRequest,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Evaluate a free-text check-in for strain.

    If the emergency detector fires, returns an emergency response
    (same shape as the symptom checker) and skips recovery logic.

    If recovery mode is triggered, updates the user's profile row:
    is_recovery_mode=true, daily_goal_target halved, last_recovery_date
    set to now. current_streak is left untouched (Phase 0 decision 2).
    """
    await ensure_user_profile(user.user_id, user.email)

    try:
        result = await evaluate_checkin(payload.text)
    except EmergencyDetected as exc:
        # Short-circuit to the existing emergency response path
        # (Phase 0, decision 4). Return the same shape the symptom
        # checker uses so the frontend can handle it uniformly.
        return CheckInResponse(
            recovery_triggered=False,
            confidence=exc.match.confidence,
            summary=get_emergency_message(exc.match),
        )
    except GroqAPIError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"AI analysis is temporarily unavailable: {exc}",
        ) from exc

    # If recovery triggered, update user profile
    if result.recovery_triggered:
        client = get_supabase()
        try:
            # Fetch current profile to compute halved goal
            profile = (
                client.table("users")
                .select("daily_goal_target")
                .eq("id", user.user_id)
                .single()
                .execute()
            )
            current_goal = profile.data.get("daily_goal_target", 8000)
            reduced_goal = max(current_goal // _RECOVERY_GOAL_DIVISOR, 1)

            client.table("users").update({
                "is_recovery_mode": True,
                "daily_goal_target": reduced_goal,
                "last_recovery_date": datetime.now(timezone.utc).isoformat(),
            }).eq("id", user.user_id).execute()
        except APIError as exc:
            logger.warning(
                "Unable to update recovery state for user=%s: %s",
                user.user_id, exc,
            )

    return result


@router.get("/recovery-activity", response_model=RecoveryActivityResponse)
@limiter.limit(AI_RATE)
async def get_recovery_activity(
    request: Request,
    context: str = Query(..., min_length=1, max_length=4000),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Generate a short recovery activity tailored to the check-in context."""
    try:
        return await generate_recovery_activity(context)
    except GroqAPIError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"AI analysis is temporarily unavailable: {exc}",
        ) from exc
