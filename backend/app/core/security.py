"""
JWT verification for requests authenticated via Supabase Auth.

The frontend signs users in through Supabase directly (email/password or
Google OAuth) and attaches the resulting access token as a Bearer token
on every API request. The backend never issues its own session tokens —
it only verifies the ones Supabase already issued, using the project's
JWT secret.
"""

from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.config import get_settings

settings = get_settings()
bearer_scheme = HTTPBearer(auto_error=False)


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


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> AuthenticatedUser:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token.",
        )
    payload = decode_supabase_token(credentials.credentials)
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
        payload = decode_supabase_token(credentials.credentials)
        return AuthenticatedUser(user_id=payload.get("sub"), email=payload.get("email"))
    except HTTPException:
        return None
