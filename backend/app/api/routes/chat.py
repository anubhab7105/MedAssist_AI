"""
AI Chat endpoint. Streams tokens back to the frontend over
Server-Sent Events so the UI can render them as they arrive.

Flow per request:
  1. Rate limit check.
  2. Emergency pattern check on the raw user message — if triggered,
     short-circuit with the emergency banner and never call Groq.
  3. Stream the Groq response.
  4. Persist both turns to chat_history once streaming completes.
"""

import json

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse

from app.core.rate_limit import limiter, AI_RATE
from app.core.security import get_current_user, AuthenticatedUser
from app.models.schemas import ChatMessageIn
from app.services.emergency_detector import detect_emergency, get_emergency_message
from app.services.groq_service import stream_chat_completion
from app.services import supabase_service

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("")
@limiter.limit(AI_RATE)
async def chat(
    request: Request,
    payload: ChatMessageIn,
    user: AuthenticatedUser = Depends(get_current_user),
):
    match = detect_emergency(payload.message)

    if match.triggered:
        message = get_emergency_message(match)

        async def emergency_stream():
            yield f"data: {json.dumps({'type': 'emergency', 'content': message})}\n\n"
            yield "data: [DONE]\n\n"

        await supabase_service.save_chat_message(user.user_id, payload.conversation_id, "user", payload.message)
        await supabase_service.save_chat_message(user.user_id, payload.conversation_id, "assistant", message)

        return StreamingResponse(emergency_stream(), media_type="text/event-stream")

    await supabase_service.save_chat_message(user.user_id, payload.conversation_id, "user", payload.message)

    async def token_stream():
        full_response = ""
        try:
            async for chunk in stream_chat_completion([{"role": "user", "content": payload.message}]):
                full_response += chunk
                yield f"data: {json.dumps({'type': 'token', 'content': chunk})}\n\n"
        finally:
            if full_response:
                await supabase_service.save_chat_message(
                    user.user_id, payload.conversation_id, "assistant", full_response
                )
        yield "data: [DONE]\n\n"

    return StreamingResponse(token_stream(), media_type="text/event-stream")
