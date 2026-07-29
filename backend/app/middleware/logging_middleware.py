import logging
import time

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

logger = logging.getLogger("medassist.requests")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Logs method, path, status, and latency for every request. Never
    logs request bodies — symptom/chat payloads can contain sensitive
    health information and must not end up in log output."""

    async def dispatch(self, request: Request, call_next):
        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = (time.perf_counter() - start) * 1000
        logger.info(
            "%s %s -> %s (%.1fms)",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
        )
        return response
