"""
Request logging with correlation IDs.

Each request gets a correlation ID (honoring an inbound X-Request-ID, else
generated), stored in a contextvar so logs emitted anywhere in the request
stack can carry it. Log lines are emitted in a structured key=value format
that is parseable by log aggregators, and request bodies are NEVER logged
— symptom/chat payloads contain sensitive health information.
"""

import logging
import sys
import time
import uuid
from contextvars import ContextVar

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

logger = logging.getLogger("medassist.requests")

correlation_id: ContextVar[str] = ContextVar("correlation_id", default="-")


def get_correlation_id() -> str:
    return correlation_id.get()


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Logs method, path, status, latency, and client IP with a
    correlation ID. Never logs request bodies."""

    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex[:16]
        correlation_id.set(request_id)

        start = time.perf_counter()
        try:
            response = await call_next(request)
            duration_ms = (time.perf_counter() - start) * 1000
            logger.info(
                "request method=%s path=%s status=%d duration_ms=%.1f correlation_id=%s ip=%s",
                request.method,
                request.url.path,
                response.status_code,
                duration_ms,
                request_id,
                request.client.host if request.client else "-",
            )
            response.headers["X-Request-ID"] = request_id
            return response
        except Exception:
            duration_ms = (time.perf_counter() - start) * 1000
            logger.exception(
                "request_failed method=%s path=%s duration_ms=%.1f correlation_id=%s",
                request.method,
                request.url.path,
                duration_ms,
                request_id,
            )
            raise


def configure_logging(level: str) -> None:
    """Configure root logging once, in a structured key=value format.

    JSON output would need structlog; a flat `key=value` line is zero-
    dependency, greppable, and forwards cleanly to most log services.
    """
    root = logging.getLogger("medassist")
    if root.handlers:
        return

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        logging.Formatter(
            "%(asctime)s level=%(levelname)s logger=%(name)s %(message)s"
        )
    )
    root.addHandler(handler)
    root.setLevel(level.upper())
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)