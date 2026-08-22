"""
Thin wrapper around the Groq chat-completions API (OpenAI-compatible).

Two entry points:
- stream_chat_completion(): token-by-token streaming for the AI Chat feature.
- get_symptom_analysis(): a single non-streamed, JSON-mode completion for
  the Symptom Checker, parsed straight into SymptomCheckResponse fields.

Every call is anchored by SYSTEM_PROMPT, which is the one place the
"never diagnose, never prescribe, never claim certainty" rules live for
the model itself (the emergency short-circuit in emergency_detector.py
is a separate, non-AI safety layer that runs before this is ever called).

External calls go through app.core.http_client (circuit breaker + retry)
and timeouts are configurable via GROQ_TIMEOUT_SECONDS /
GROQ_JSON_TIMEOUT_SECONDS.
"""

import json
from typing import AsyncGenerator

import httpx

from app.core.config import get_settings
from app.core.http_client import request_with_retry, CircuitOpenError

settings = get_settings()

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

SYSTEM_PROMPT = """You are a medical educational assistant. Your name is MedAssist.
If anyone asks your name, always reply that your name is MedAssist.

You never diagnose diseases.
You never prescribe medicine.
You never claim certainty.
Only provide educational information.
Always recommend consulting a licensed doctor.
If symptoms indicate an emergency, immediately advise emergency medical care.
End every response with a medical disclaimer.

When discussing possible causes, always phrase them as possibilities,
never certainties — say "possible conditions include..." and never make
a definitive statement like "you have X". Keep language calm, clear, and
free of jargon where possible."""

SYMPTOM_JSON_INSTRUCTIONS = """Respond ONLY with a single JSON object (no markdown, no
preamble) with exactly these keys:
{
  "symptom_summary": "one short paragraph restating what the user described",
  "possible_conditions": ["possibility one", "possibility two", "..."],
  "severity": "low" | "moderate" | "high",
  "lifestyle_suggestions": ["suggestion one", "suggestion two", "..."],
  "emergency_warnings": ["warning sign to watch for", "..."],
  "recommended_specialist": "one specialist title"
}
Never phrase possible_conditions as certainties. Never include medication
dosages or prescriptions in lifestyle_suggestions."""


class GroqAPIError(Exception):
    pass


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {settings.groq_api_key}",
        "Content-Type": "application/json",
    }


async def stream_chat_completion(
    messages: list[dict],
    image: str | None = None
) -> AsyncGenerator[str, None]:
    """Yields raw text chunks as they arrive from Groq, for SSE relay
    to the frontend chat UI.

    Streaming payloads are NOT retried (a retried stream would replay
    tokens the client already received) — failures surface promptly as
    GroqAPIError after the circuit-breaker check.
    """
    model_to_use = settings.groq_model
    formatted_messages = list(messages)

    if image:
        model_to_use = settings.groq_vision_model
        if formatted_messages and formatted_messages[-1].get("role") == "user":
            user_text = formatted_messages[-1]["content"]
            formatted_messages[-1]["content"] = [
                {"type": "text", "text": user_text},
                {"type": "image_url", "image_url": {"url": image}}
            ]

    payload = {
        "model": model_to_use,
        "messages": [{"role": "system", "content": SYSTEM_PROMPT}, *formatted_messages],
        "temperature": 0.4,
        "stream": True,
        "max_tokens": 1024,
    }

    timeout = httpx.Timeout(settings.groq_timeout_seconds, connect=5.0)
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            async with client.stream(
                "POST", GROQ_API_URL, headers=_headers(), json=payload
            ) as response:
                if response.status_code != 200:
                    body = await response.aread()
                    raise GroqAPIError(f"Groq API error {response.status_code}: {body!r}")

                async for line in response.aiter_lines():
                    if not line or not line.startswith("data:"):
                        continue
                    data = line[len("data:"):].strip()
                    if data == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data)
                        delta = chunk["choices"][0]["delta"].get("content")
                        if delta:
                            yield delta
                    except (json.JSONDecodeError, KeyError, IndexError):
                        continue
    except CircuitOpenError as exc:
        raise GroqAPIError(str(exc)) from exc
    except httpx.HTTPError as exc:
        raise GroqAPIError(f"Could not reach the AI provider: {exc}") from exc


async def get_symptom_analysis(prompt: str) -> dict:
    payload = {
        "model": settings.groq_model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT + "\n\n" + SYMPTOM_JSON_INSTRUCTIONS},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.3,
        "max_tokens": 900,
        "response_format": {"type": "json_object"},
    }

    timeout = httpx.Timeout(settings.groq_json_timeout_seconds, connect=5.0)
    try:
        response = await request_with_retry(
            "POST",
            GROQ_API_URL,
            timeout=timeout,
            headers=_headers(),
            json=payload,
        )
    except httpx.HTTPError as exc:
        raise GroqAPIError(f"Could not reach the AI provider: {exc}") from exc

    if response.status_code != 200:
        raise GroqAPIError(f"Groq API error {response.status_code}: {response.text}")

    data = response.json()
    content = data["choices"][0]["message"]["content"]
    try:
        return json.loads(content)
    except json.JSONDecodeError as exc:
        raise GroqAPIError("Groq returned non-JSON content for symptom analysis") from exc


def build_symptom_prompt(payload) -> str:
    """payload is a SymptomCheckRequest — builds the user-turn prompt sent to Groq."""
    lines = [
        f"Age: {payload.age}",
        f"Gender: {payload.gender.value}",
        f"Weight: {payload.weight_kg} kg" if payload.weight_kg else None,
        f"Height: {payload.height_cm} cm" if payload.height_cm else None,
        f"Symptoms: {payload.symptoms}",
        f"Duration: {payload.duration}",
        f"Pain level (0-10): {payload.pain_level}",
        f"Temperature: {payload.temperature_celsius} C" if payload.temperature_celsius else None,
        f"Current medication: {payload.current_medication}" if payload.current_medication else None,
        f"Known conditions: {payload.known_diseases}" if payload.known_diseases else None,
        f"Allergies: {payload.allergies}" if payload.allergies else None,
    ]
    return "Patient-reported information:\n" + "\n".join(l for l in lines if l)