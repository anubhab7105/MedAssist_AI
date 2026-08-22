"""
Server-side Supabase client, using the service role key so the backend
can write chat/symptom history rows on the user's behalf after verifying
their JWT itself (see app.core.security). The service role key must
NEVER be exposed to the frontend — only used here, server-side.

Security audit notes:
- No raw SQL is ever constructed. All access goes through the official
  `supabase` client, which speaks to PostgREST; table names and column
  names below are fixed string literals, and every user-supplied value
  arrives as a structured query parameter in the PostgREST payload.
- No user input is interpolated into filters, keys, or column names.
- Persistence failures on the history rows are non-fatal by design (the
  AI response is still returned), but they are logged with enough detail
  to distinguish "table missing" from transient failures.
"""

from functools import lru_cache
import logging

from supabase import create_client, Client
from postgrest.exceptions import APIError

from app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

# History rows are diagnostics, not a data lake — bound lengths avoid
# oversized rows when a model response runs away with itself.
_MAX_CONTENT_CHARS = 100_000


@lru_cache
def get_supabase() -> Client:
    return create_client(settings.supabase_project_url, settings.supabase_service_role_key)


async def ensure_user_profile(user_id: str, email: str | None = None) -> dict:
    client = get_supabase()
    row = {"id": user_id, "email": email or ""}
    result = client.table("users").upsert(row, on_conflict="id").execute()
    return result.data[0] if result.data else row


def _truncate(value: str, limit: int) -> str:
    return value if len(value) <= limit else value[:limit]


async def save_chat_message(
    user_id: str, conversation_id: str | None, role: str, content: str, email: str | None = None, image: str | None = None
) -> dict:
    client = get_supabase()
    await ensure_user_profile(user_id, email)
    row = {
        "user_id": user_id,
        "role": role,
        "content": _truncate(content, _MAX_CONTENT_CHARS),
    }
    if image:
        row["image"] = image
    if conversation_id:
        row["conversation_id"] = conversation_id
    try:
        result = client.table("chat_history").insert(row).execute()
        return result.data[0] if result.data else row
    except APIError as exc:
        logger.warning(
            "Unable to save chat message to Supabase (user=%s, role=%s): %s",
            user_id, role, exc,
        )
        return row


async def save_symptom_check(
    user_id: str, request_payload: dict, response_payload: dict, email: str | None = None
) -> dict:
    client = get_supabase()
    await ensure_user_profile(user_id, email)
    row = {
        "user_id": user_id,
        "request_payload": request_payload,
        "response_payload": response_payload,
    }
    try:
        result = client.table("symptom_history").insert(row).execute()
        return result.data[0] if result.data else row
    except APIError as exc:
        logger.warning(
            "Unable to save symptom check to Supabase (user=%s): %s",
            user_id, exc,
        )
        return row


async def save_location(
    user_id: str, label: str, latitude: float, longitude: float, email: str | None = None
) -> dict:
    client = get_supabase()
    await ensure_user_profile(user_id, email)
    row = {
        "user_id": user_id,
        "label": _truncate(label, 200),
        "latitude": latitude,
        "longitude": longitude,
    }
    try:
        result = client.table("saved_locations").insert(row).execute()
        return result.data[0] if result.data else row
    except APIError as exc:
        logger.warning(
            "Unable to save location to Supabase (user=%s): %s",
            user_id, exc,
        )
        return row