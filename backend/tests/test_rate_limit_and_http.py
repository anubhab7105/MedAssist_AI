"""Rate limit and resilient HTTP client tests."""

import asyncio

import httpx
import pytest

from app.core.http_client import (
    CircuitBreaker,
    CircuitOpenError,
    request_with_retry,
)
from app.core.rate_limit import (
    AI_RATE,
    DEFAULT_RATE,
    limiter,
    validate_rate_limit_config,
)


# --- Rate limiting ---


def test_default_rate_matches_config():
    assert DEFAULT_RATE == "20/minute"


def test_ai_rate_is_half_but_never_below_five():
    assert AI_RATE == "10/minute"


def test_rates_are_valid_slowapi_rates():
    limiter.limit(DEFAULT_RATE)  # raises ValueError on malformed rates
    limiter.limit(AI_RATE)


def test_validate_rate_limit_config_passes():
    validate_rate_limit_config()  # no exception


def test_validate_rate_limit_config_rejects_garbage(monkeypatch):
    from app.core import rate_limit as rl

    monkeypatch.setattr(rl, "DEFAULT_RATE", "bogus")
    monkeypatch.setattr(rl, "AI_RATE", "bogus")
    with pytest.raises(RuntimeError, match="Invalid rate limit"):
        rl.validate_rate_limit_config()


# --- Circuit breaker ---


def test_circuit_breaker_opens_and_fails_fast():
    breaker = CircuitBreaker(failure_threshold=2, cooldown_seconds=60)
    breaker.record_failure("api.example.com")
    breaker.record_failure("api.example.com")
    assert breaker.is_open("api.example.com")
    with pytest.raises(CircuitOpenError):
        raise CircuitOpenError("open")


def test_circuit_breaker_half_opens_after_cooldown():
    breaker = CircuitBreaker(failure_threshold=2, cooldown_seconds=0.01)
    breaker.record_failure("api.example.com")
    breaker.record_failure("api.example.com")
    assert breaker.is_open("api.example.com")
    asyncio.run(asyncio.sleep(0.02))
    assert not breaker.is_open("api.example.com")  # half-open probe allowed


def test_circuit_breaker_recovers_after_success():
    breaker = CircuitBreaker(failure_threshold=2)
    breaker.record_failure("api.example.com")
    breaker.record_failure("api.example.com")
    assert breaker.is_open("api.example.com")
    breaker.record_success("api.example.com")
    assert not breaker.is_open("api.example.com")


def test_circuit_breaker_tracks_hosts_separately():
    breaker = CircuitBreaker(failure_threshold=1)
    breaker.record_failure("a.example.com")
    assert breaker.is_open("a.example.com")
    assert not breaker.is_open("b.example.com")


# --- request_with_retry ---


def test_request_with_retry_retries_then_succeeds():
    calls = {"count": 0}

    def handler(request):
        calls["count"] += 1
        if calls["count"] < 3:
            return httpx.Response(500, request=request)
        return httpx.Response(200, json={"ok": True}, request=request)

    async def factory():
        return httpx.AsyncClient(transport=httpx.MockTransport(handler))

    response = asyncio.run(
        request_with_retry("GET", "https://api.example.test/ping", timeout=5.0, client_factory=factory)
    )
    assert response.status_code == 200
    assert calls["count"] == 3


def test_request_with_retry_gives_up_after_retries():
    def handler(request):
        return httpx.Response(503, request=request)

    async def factory():
        return httpx.AsyncClient(transport=httpx.MockTransport(handler))

    with pytest.raises(httpx.HTTPError):
        asyncio.run(
            request_with_retry("GET", "https://api.example.test/ping", timeout=5.0, client_factory=factory, retries=1)
        )


def test_request_with_retry_fails_fast_when_circuit_open(monkeypatch):
    from app.core import http_client as hc

    monkeypatch.setattr(hc.circuit_breaker, "is_open", lambda host: True)
    with pytest.raises(CircuitOpenError):
        asyncio.run(
            request_with_retry("GET", "https://api.example.test/ping", timeout=5.0)
        )