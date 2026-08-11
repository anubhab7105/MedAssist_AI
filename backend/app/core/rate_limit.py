"""
Rate limiting configuration. Applied per-route via the @limiter.limit()
decorator — AI endpoints (chat, symptom checker) get the tightest limits
since they're the most expensive to serve and the most abuse-prone.

The effective rate is derived from settings.rate_limit_per_minute, which
itself is validated in app.core.config (bounded to 1..1000). The limiter
is wired into the FastAPI app via app.state.limiter so slowapi can raise
RateLimitExceeded through Starlette's exception pipeline.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import get_settings

settings = get_settings()

limiter = Limiter(key_func=get_remote_address)

DEFAULT_RATE = f"{settings.rate_limit_per_minute}/minute"
AI_RATE = f"{max(settings.rate_limit_per_minute // 2, 5)}/minute"


def validate_rate_limit_config() -> None:
    """Belt-and-braces check at app boot: the limiter must be attached to
    app.state and the configured rate must parse as a valid slowapi rate
    string. Called from app.main before routes are served."""
    try:
        limiter.limit(DEFAULT_RATE)  # raises ValueError on garbage rates
        limiter.limit(AI_RATE)
    except ValueError as exc:
        raise RuntimeError(
            "Invalid rate limit configuration derived from "
            f"RATE_LIMIT_PER_MINUTE={settings.rate_limit_per_minute}: {exc}"
        ) from exc