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

# slowapi validates rate strings lazily (at request time), so we parse
# them ourselves at boot to fail fast on misconfiguration.
_RATE_RE = r"^(?P<count>\d+)/(?P<unit>second|minute|hour|day)$"
import re as _re


def parse_rate_string(rate: str) -> tuple[int, str]:
    """Validate a slowapi rate string like '20/minute'. Returns (count, unit)."""
    match = _re.fullmatch(_RATE_RE, rate.strip())
    if not match:
        raise ValueError(f"'{rate}' is not a valid rate (expected e.g. '20/minute')")
    count = int(match.group("count"))
    if count < 1:
        raise ValueError("rate count must be at least 1")
    return count, match.group("unit")


def validate_rate_limit_config() -> None:
    """Belt-and-braces check at app boot: the rates derived from
    RATE_LIMIT_PER_MINUTE must parse as valid slowapi rate strings.
    Called from app.main before routes are served."""
    for label, rate in (("DEFAULT_RATE", DEFAULT_RATE), ("AI_RATE", AI_RATE)):
        try:
            parse_rate_string(rate)
        except ValueError as exc:
            raise RuntimeError(
                "Invalid rate limit configuration derived from "
                f"RATE_LIMIT_PER_MINUTE={settings.rate_limit_per_minute}: {exc}"
            ) from exc