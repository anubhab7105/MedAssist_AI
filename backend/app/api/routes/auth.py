"""
Actual sign-up / sign-in / password reset all happen directly
between the frontend and Supabase Auth (that's what the Supabase JS SDK
is for — the backend never sees passwords). This route only exposes what
the backend needs: a way to confirm a token is valid and see who it
belongs to, used by the frontend after login to hydrate user state and
by protected pages to verify a session server-side.
"""

from fastapi import APIRouter, Depends

from app.core.security import get_current_user, AuthenticatedUser

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/me")
async def me(user: AuthenticatedUser = Depends(get_current_user)):
    return {"user_id": user.user_id, "email": user.email}
