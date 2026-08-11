"""
Resilient HTTP calls for external services (Groq, Overpass).

Provides:
- CircuitBreaker: per-host, consecutive-failure based, with an automatic
  cooldown window. Once a host trips, requests fail fast (CircuitOpenError)
  instead of hammering a down service.
- request_with_retry(): sends a request through the breaker, retrying with
  exponential backoff on network errors and 5xx responses.

Used by groq_service and overpass_service so transient outages do not
bubble up as unhandled exceptions that crash endpoints.
"""

import asyncio
import logging
import time
from typing import Any, Awaitable, Callable
from urllib.parse import urlparse

import httpx

logger = logging.getLogger(__name__)


class CircuitOpenError(httpx.HTTPError):
    """Raised when the targeted host is in its cooldown window."""


def _host_of(url: str) -> str:
    return urlparse(url).netloc or url


class CircuitBreaker:
    """Tracks consecutive failures per host and opens after a threshold.

    State is intentionally simple and in-process: good enough to protect
    a single instance from retry storms, and self-healing via cooldown.
    """

    def __init__(self, failure_threshold: int = 3, cooldown_seconds: float = 30.0):
        self.failure_threshold = failure_threshold
        self.cooldown_seconds = cooldown_seconds
        # host -> (consecutive_failures, opened_at)
        self._state: dict[str, tuple[int, float]] = {}

    def is_open(self, host: str) -> bool:
        state = self._state.get(host)
        if state is None:
            return False
        failures, opened_at = state
        if failures >= self.failure_threshold:
            if time.monotonic() - opened_at >= self.cooldown_seconds:
                self._state.pop(host, None)  # half-open: allow one probe attempt
                return False
            return True
        return False

    def record_failure(self, host: str) -> None:
        failures, opened_at = self._state.get(host, (0, 0.0))
        failures += 1
        opened_at = time.monotonic() if failures >= self.failure_threshold else opened_at
        self._state[host] = (failures, opened_at)
        if failures == self.failure_threshold:
            logger.warning("Circuit opened for %s after %d consecutive failures", host, failures)

    def record_success(self, host: str) -> None:
        if host in self._state:
            self._state.pop(host)


# Module-level singleton shared by all services.
circuit_breaker = CircuitBreaker()

_RETRYABLE_STATUS = {429, 500, 502, 503, 504}


async def request_with_retry(
    method: str,
    url: str,
    *,
    timeout: httpx.Timeout | float,
    retries: int = 2,
    backoff: float = 1.5,
    client_factory: Callable[[], Awaitable[httpx.AsyncClient]] | None = None,
    **kwargs: Any,
) -> httpx.Response:
    """Perform a request through the circuit breaker, retrying on
    network errors and retryable status codes. Raises httpx.HTTPError
    (or CircuitOpenError) when the request ultimately fails."""
    host = _host_of(url)
    errors: list[str] = []

    if client_factory is None:
        async def default_factory() -> httpx.AsyncClient:
            return httpx.AsyncClient(timeout=timeout)

        client_factory = default_factory

    for attempt in range(retries + 1):
        if circuit_breaker.is_open(host):
            raise CircuitOpenError(
                f"Circuit breaker open for {host} — service is in cooldown after repeated failures."
            )

        try:
            client = await client_factory()
            async with client:
                response = await client.request(method, url, **kwargs)
            if response.status_code in _RETRYABLE_STATUS:
                raise httpx.HTTPStatusError(
                    f"Retryable status {response.status_code} from {url}",
                    request=response.request,
                    response=response,
                )
            circuit_breaker.record_success(host)
            return response
        except (httpx.HTTPError, asyncio.TimeoutError) as exc:
            circuit_breaker.record_failure(host)
            errors.append(f"{type(exc).__name__}: {exc}")
            if attempt < retries:
                delay = backoff * (2**attempt)
                logger.debug("Retrying %s %s in %.1fs (%s)", method, host, delay, errors[-1])
                await asyncio.sleep(delay)

    raise httpx.HTTPError(
        f"Request to {host} failed after {retries + 1} attempt(s): {' | '.join(errors)}"
    )