"""
AI Chat endpoint. Streams tokens back to the frontend over
Server-Sent Events so the UI can render them as they arrive.

Flow per request:
  1. Rate limit check.
  2. Emergency pattern check on the raw user message — if triggered,
     short-circuit with the emergency banner and never call Groq.
  3. If PDF uploaded, extract text and prepend as context.
  4. Stream the Groq response (vision model if image, text model otherwise).
  5. Persist both turns to chat_history once streaming completes.
"""

import json
import logging

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse

from app.core.rate_limit import limiter, AI_RATE
from app.core.security import get_current_user, AuthenticatedUser
from app.models.schemas import ChatMessageIn
from app.services.emergency_detector import detect_emergency, get_emergency_message
from app.services.groq_service import stream_chat_completion
from app.services import supabase_service
from app.services.pdf_service import extract_text_from_pdf, is_pdf_base64

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/chat", tags=["chat"])


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

        await supabase_service.save_chat_message(
            user_id=user.user_id,
            conversation_id=payload.conversation_id,
            role="user",
            content=payload.message,
            email=user.email,
            image=payload.image
        )
        await supabase_service.save_chat_message(
            user.user_id, payload.conversation_id, "assistant", message, user.email
        )

        return StreamingResponse(emergency_stream(), media_type="text/event-stream")

    # Process PDF if present
    pdf_text = None
    if payload.image and is_pdf_base64(payload.image):
        logger.info("PDF detected, extracting text...")
        pdf_text = await extract_text_from_pdf(payload.image)
        logger.info(f"PDF extraction complete, text length: {len(pdf_text) if pdf_text else 0}")
        # For PDFs, we don't send the image to Groq (vision model doesn't support PDF)
        # Instead we include extracted text as context
        image_for_groq = None
    else:
        image_for_groq = payload.image

    # Build message with PDF context if available
    user_message = payload.message
    if pdf_text:
        user_message = f"{payload.message}\n\n--- PDF Content ---\n{pdf_text}\n--- End PDF ---"
        logger.info(f"Total message length with PDF: {len(user_message)}")

    await supabase_service.save_chat_message(
        user_id=user.user_id,
        conversation_id=payload.conversation_id,
        role="user",
        content=payload.message,
        email=user.email,
        image=payload.image
    )

    async def token_stream():
        full_response = ""
        try:
            messages = [{"role": "user", "content": user_message}]
            logger.info(f"Calling Groq with model: {'vision' if image_for_groq else 'text'}, has_image: {bool(image_for_groq)}")
            async for chunk in stream_chat_completion(messages, image=image_for_groq):
                full_response += chunk
                yield f"data: {json.dumps({'type': 'token', 'content': chunk})}\n\n"
            logger.info("Groq stream completed")
        except Exception as e:
            logger.error(f"Groq stream error: {e}")
            raise
        finally:
            if full_response:
                await supabase_service.save_chat_message(
                    user.user_id, payload.conversation_id, "assistant", full_response, user.email
                )
        yield "data: [DONE]\n\n"

    return StreamingResponse(token_stream(), media_type="text/event-stream")
