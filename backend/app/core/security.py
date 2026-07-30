"""
JWT verification for requests authenticated via Supabase Auth.

The frontend signs users in through Supabase directly (email/password)
and attaches the resulting access token as a Bearer token
on every API request. The backend never issues its own session tokens —
it only verifies the ones Supabase already issued, using the project's
JWT secret.
"""

from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import httpx
import logging

from app.core.config import get_settings

settings = get_settings()
bearer_scheme = HTTPBearer(auto_error=False)
logger = logging.getLogger(__name__)


class AuthenticatedUser:
    def __init__(self, user_id: str, email: str | None):
        self.user_id = user_id
        self.email = email


def decode_supabase_token(token: str) -> dict:
    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session. Please log in again.",
        ) from exc


async def verify_supabase_token(token: str) -> dict:
    try:
        header = jwt.get_unverified_header(token)
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session. Please log in again.",
        ) from exc

    if header.get("alg") == "HS256":
        return decode_supabase_token(token)

    auth_url = f"{settings.supabase_project_url}/auth/v1/user"
    headers = {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {token}",
    }

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(auth_url, headers=headers)
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unable to verify session. Please try again.",
        ) from exc

    if response.status_code != status.HTTP_200_OK:
        logger.warning(
            "Supabase Auth rejected user token with status %s: %s",
            response.status_code,
            response.text,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session. Please log in again.",
        )

    user = response.json()
    return {"sub": user.get("id"), "email": user.get("email")}


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> AuthenticatedUser:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token.",
        )
    payload = await verify_supabase_token(credentials.credentials)
    user_id = payload.get("sub")
    email = payload.get("email")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject claim.",
        )
    return AuthenticatedUser(user_id=user_id, email=email)


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> AuthenticatedUser | None:
    """Used by endpoints that behave differently for guests vs logged-in users."""
    if credentials is None:
        return None
    try:
        payload = await verify_supabase_token(credentials.credentials)
        return AuthenticatedUser(user_id=payload.get("sub"), email=payload.get("email"))
    except HTTPException:
        return None
