"""Groq service tests: prompt building, JSON parsing, error surfacing."""

import pytest

from app.models.schemas import Gender, SymptomCheckRequest
from app.services import groq_service


def make_request(**overrides) -> SymptomCheckRequest:
    base = {
        "age": 35,
        "gender": Gender.male,
        "symptoms": "dry cough and fever",
        "duration": "3 days",
        "pain_level": 2,
    }
    base.update(overrides)
    return SymptomCheckRequest(**base)


def test_build_symptom_prompt_includes_fields():
    prompt = groq_service.build_symptom_prompt(
        make_request(weight_kg=70, temperature_celsius=38.5, known_diseases="asthma")
    )
    assert "Age: 35" in prompt
    assert "Gender: male" in prompt
    assert "Symptoms: dry cough and fever" in prompt
    assert "Weight: 70.0 kg" in prompt
    assert "Temperature: 38.5 C" in prompt
    assert "Known conditions: asthma" in prompt


def test_build_symptom_prompt_omits_missing_optionals():
    prompt = groq_service.build_symptom_prompt(make_request())
    assert "Weight:" not in prompt
    assert "Temperature:" not in prompt
    assert "Known conditions:" not in prompt


class FakeResponse:
    def __init__(self, status_code=200, text="", payload=None):
        self.status_code = status_code
        self.text = text
        self._payload = payload

    def json(self):
        return self._payload


def test_get_symptom_analysis_parses_json(monkeypatch):
    content = json.dumps(
        {
            "symptom_summary": "summary",
            "possible_conditions": ["cold"],
            "severity": "low",
            "lifestyle_suggestions": ["rest"],
            "emergency_warnings": [],
            "recommended_specialist": "GP",
        }
    )
    payload = {"choices": [{"message": {"content": content}}]}

    async def fake_request(*args, **kwargs):
        return FakeResponse(payload=payload)

    monkeypatch.setattr(groq_service, "request_with_retry", fake_request)
    result = asyncio_run(groq_service.get_symptom_analysis("prompt"))
    assert result["possible_conditions"] == ["cold"]
    assert result["severity"] == "low"


def test_get_symptom_analysis_surfaces_api_error(monkeypatch):
    async def fake_request(*args, **kwargs):
        return FakeResponse(status_code=500, text="upstream exploded")

    monkeypatch.setattr(groq_service, "request_with_retry", fake_request)
    with pytest.raises(groq_service.GroqAPIError, match="500"):
        asyncio_run(groq_service.get_symptom_analysis("prompt"))


def test_get_symptom_analysis_rejects_non_json_content(monkeypatch):
    payload = {"choices": [{"message": {"content": "not json at all"}}]}

    async def fake_request(*args, **kwargs):
        return FakeResponse(payload=payload)

    monkeypatch.setattr(groq_service, "request_with_retry", fake_request)
    with pytest.raises(groq_service.GroqAPIError, match="non-JSON"):
        asyncio_run(groq_service.get_symptom_analysis("prompt"))


def test_get_symptom_analysis_wraps_fetch_failures(monkeypatch):
    import httpx

    async def fake_request(*args, **kwargs):
        raise httpx.ConnectError("boom")

    monkeypatch.setattr(groq_service, "request_with_retry", fake_request)
    with pytest.raises(groq_service.GroqAPIError, match="AI provider"):
        asyncio_run(groq_service.get_symptom_analysis("prompt"))


def asyncio_run(coro):
    import asyncio
    return asyncio.run(coro)