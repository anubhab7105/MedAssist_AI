from fastapi import APIRouter, Depends, HTTPException
from postgrest.exceptions import APIError

from app.core.security import get_current_user, AuthenticatedUser
from app.models.schemas import ProfileUpdateRequest
from app.services.supabase_service import ensure_user_profile, get_supabase

router = APIRouter(prefix="/api/profile", tags=["profile"])


@router.get("")
async def get_profile(user: AuthenticatedUser = Depends(get_current_user)):
    await ensure_user_profile(user.user_id, user.email)
    client = get_supabase()
    try:
        result = client.table("users").select("*").eq("id", user.user_id).single().execute()
        return result.data
    except APIError:
        return await ensure_user_profile(user.user_id, user.email)


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
async def chat_history(user: AuthenticatedUser = Depends(get_current_user), limit: int = 50):
    client = get_supabase()
    try:
        result = (
            client.table("chat_history")
            .select("*")
            .eq("user_id", user.user_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return result.data
    except APIError:
        return []


@router.get("/symptom-history")
async def symptom_history(user: AuthenticatedUser = Depends(get_current_user), limit: int = 50):
    client = get_supabase()
    try:
        result = (
            client.table("symptom_history")
            .select("*")
            .eq("user_id", user.user_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return result.data
    except APIError:
        return []


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
