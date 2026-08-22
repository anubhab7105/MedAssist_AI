import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from dateutil.parser import isoparse
from fastapi import APIRouter, Depends, HTTPException, Query
from postgrest.exceptions import APIError

from app.core.security import get_current_user, AuthenticatedUser
from app.models.schemas import ProfileUpdateRequest
from app.services.supabase_service import ensure_user_profile, get_supabase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/profile", tags=["profile"])

# Recovery mode auto-expires after this many hours without a new check-in.
_RECOVERY_EXPIRY_HOURS = 24


def _days_cutoff(days: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()


def _should_expire_recovery(profile: dict) -> bool:
    """Phase 0 decision 3: lazy auto-expiry. Recovery mode expires if
    last_recovery_date is more than 24 hours in the past."""
    if not profile.get("is_recovery_mode"):
        return False
    last_recovery = profile.get("last_recovery_date")
    if not last_recovery:
        # No recovery date recorded but mode is on — expire it.
        return True
    if isinstance(last_recovery, str):
        last_recovery = isoparse(last_recovery)
    cutoff = datetime.now(timezone.utc) - timedelta(hours=_RECOVERY_EXPIRY_HOURS)
    return last_recovery < cutoff


@router.get("")
async def get_profile(user: AuthenticatedUser = Depends(get_current_user)):
    await ensure_user_profile(user.user_id, user.email)
    client = get_supabase()
    try:
        result = client.table("users").select("*").eq("id", user.user_id).single().execute()
        profile = result.data
    except APIError:
        profile = await ensure_user_profile(user.user_id, user.email)

    # Lazy auto-expiry: clear recovery mode if it's stale (Phase 0, decision 3).
    if profile and _should_expire_recovery(profile):
        try:
            client.table("users").update({
                "is_recovery_mode": False,
            }).eq("id", user.user_id).execute()
            profile["is_recovery_mode"] = False
            logger.info("Auto-expired recovery mode for user=%s", user.user_id)
        except APIError as exc:
            logger.warning(
                "Unable to auto-expire recovery mode for user=%s: %s",
                user.user_id, exc,
            )

    return profile



@router.put("")
async def update_profile(
    payload: ProfileUpdateRequest, user: AuthenticatedUser = Depends(get_current_user)
):
    client = get_supabase()
    await ensure_user_profile(user.user_id, user.email)
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update.")
    result = client.table("users").update(updates).eq("id", user.user_id).execute()
    return result.data[0] if result.data else updates


@router.get("/chat-history")
async def chat_history(
    user: AuthenticatedUser = Depends(get_current_user),
    limit: int = Query(200, ge=1, le=1000),
    days: int = Query(10, ge=1, le=90),
):
    client = get_supabase()
    try:
        result = (
            client.table("chat_history")
            .select("*")
            .eq("user_id", user.user_id)
            .gte("created_at", _days_cutoff(days))
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return result.data
    except APIError:
        return []


@router.get("/chat-conversation/{conversation_id}")
async def chat_conversation(
    conversation_id: str, user: AuthenticatedUser = Depends(get_current_user)
):
    """All messages of one conversation, oldest first — used to reopen a
    chat from the dashboard even when it isn't in local storage."""
    client = get_supabase()
    try:
        result = (
            client.table("chat_history")
            .select("role", "content", "created_at")
            .eq("user_id", user.user_id)
            .eq("conversation_id", conversation_id)
            .order("created_at", asc=True)
            .execute()
        )
        return result.data
    except APIError:
        return []


@router.get("/symptom-history")
async def symptom_history(
    user: AuthenticatedUser = Depends(get_current_user),
    limit: int = Query(200, ge=1, le=1000),
    days: int = Query(10, ge=1, le=90),
):
    client = get_supabase()
    try:
        result = (
            client.table("symptom_history")
            .select("*")
            .eq("user_id", user.user_id)
            .gte("created_at", _days_cutoff(days))
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return result.data
    except APIError:
        return []


@router.get("/symptom-check/{check_id}")
async def symptom_check(check_id: str, user: AuthenticatedUser = Depends(get_current_user)):
    """One symptom check record — used to reopen a check from the dashboard."""
    client = get_supabase()
    try:
        result = (
            client.table("symptom_history")
            .select("*")
            .eq("id", check_id)
            .eq("user_id", user.user_id)
            .maybe_single()
            .execute()
        )
    except APIError:
        result = None
    if not result or not result.data:
        raise HTTPException(status_code=404, detail="Symptom check not found")
    return result.data


@router.delete("/account")
async def delete_account(user: AuthenticatedUser = Depends(get_current_user)):
    """Deletes the user's row data, then the Supabase auth user itself
    (requires the service-role client, which is why this must happen
    server-side and can't be done from the frontend)."""
    client = get_supabase()
    client.table("chat_history").delete().eq("user_id", user.user_id).execute()
    client.table("symptom_history").delete().eq("user_id", user.user_id).execute()
    client.table("saved_locations").delete().eq("user_id", user.user_id).execute()
    client.table("users").delete().eq("id", user.user_id).execute()
    client.auth.admin.delete_user(user.user_id)
    return {"status": "deleted"}
