"""
Rate limiting configuration. Applied per-route via the @limiter.limit()
decorator — AI endpoints (chat, symptom checker) get the tightest limits
since they're the most expensive to serve and the most abuse-prone.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import get_settings

settings = get_settings()

limiter = Limiter(key_func=get_remote_address)

DEFAULT_RATE = f"{settings.rate_limit_per_minute}/minute"
AI_RATE = f"{max(settings.rate_limit_per_minute // 2, 5)}/minute"
