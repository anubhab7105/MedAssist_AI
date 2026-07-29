"""
Server-side Supabase client, using the service role key so the backend
can write chat/symptom history rows on the user's behalf after verifying
their JWT itself (see app.core.security). The service role key must
NEVER be exposed to the frontend — only used here, server-side.
"""

from functools import lru_cache

from supabase import create_client, Client

from app.core.config import get_settings

settings = get_settings()


@lru_cache
def get_supabase() -> Client:
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


async def save_chat_message(user_id: str, conversation_id: str | None, role: str, content: str) -> dict:
    client = get_supabase()
    row = {
        "user_id": user_id,
        "conversation_id": conversation_id,
        "role": role,
        "content": content,
    }
    result = client.table("chat_history").insert(row).execute()
    return result.data[0] if result.data else row


async def save_symptom_check(user_id: str, request_payload: dict, response_payload: dict) -> dict:
    client = get_supabase()
    row = {
        "user_id": user_id,
        "request_payload": request_payload,
        "response_payload": response_payload,
    }
    result = client.table("symptom_history").insert(row).execute()
    return result.data[0] if result.data else row


async def save_location(user_id: str, label: str, latitude: float, longitude: float) -> dict:
    client = get_supabase()
    row = {"user_id": user_id, "label": label, "latitude": latitude, "longitude": longitude}
    result = client.table("saved_locations").insert(row).execute()
    return result.data[0] if result.data else row
