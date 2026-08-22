"""
Centralized application configuration.

All secrets and environment-specific values are loaded here from
environment variables ONLY. Nothing in this file (or anywhere in the
backend) should ever be hardcoded with a real secret — see .env.example
for the full list of variables a deployment needs.

Startup hard-fails with a descriptive message (via get_settings) when a
required variable is missing, a placeholder value is still in place, or
a value fails validation (rate limits, CORS origins).
"""

import logging
from functools import lru_cache

from pydantic import ValidationError, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

# Placeholder values from .env.example that must be replaced before boot.
_PLACEHOLDER_MARKERS = ("your-", "replace-with")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # --- App ---
    environment: str = "development"
    frontend_url: list[str]
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    # --- Supabase ---
    supabase_url: str
    supabase_service_role_key: str
    supabase_jwt_secret: str

    # --- Groq ---
    groq_api_key: str
    groq_model: str = "groq/compound-mini"
    groq_vision_model: str = "llama-3.2-90b-vision-preview"

    # --- Recovery Mode ---
    recovery_trigger_threshold: float = 0.6

    # --- Overpass ---
    overpass_api_url: str = "https://overpass-api.de/api/interpreter"

    # --- Google Places ---
    google_places_api_key: str = ""
    google_places_timeout_seconds: float = 10.0

    # --- Feature flag ---
    use_google_places: bool = True

    # --- External service timeouts (seconds) ---
    groq_timeout_seconds: float = 60.0
    groq_json_timeout_seconds: float = 30.0
    overpass_timeout_seconds: float = 35.0

    # --- Rate limiting ---
    rate_limit_per_minute: int = 20

    # --- Logging ---
    log_level: str = "INFO"

    @field_validator("rate_limit_per_minute")
    @classmethod
    def validate_rate_limit(cls, v: int) -> int:
        if v < 1:
            raise ValueError("rate_limit_per_minute must be at least 1 (0 or negative disables protection)")
        if v > 1000:
            raise ValueError("rate_limit_per_minute must be 1000 or less")
        return v

    @field_validator("frontend_url")
    @classmethod
    def validate_cors_origins(cls, v: list[str]) -> list[str]:
        """Reject '*' and non-URL origins.

        CORS is enabled with allow_credentials=True, so a wildcard origin
        would make the API trivially callable cross-site with the user's
        session cookie/token — validate that every origin is an explicit
        scheme://host URL instead.
        """
        cleaned = [origin.strip() for origin in v if origin.strip()]
        if not cleaned:
            raise ValueError("FRONTEND_URL must list at least one allowed origin")
        for origin in cleaned:
            if origin == "*":
                raise ValueError(
                    "FRONTEND_URL must not contain '*': with allow_credentials=True a "
                    "wildcard origin is unsafe. List explicit http(s) origins."
                )
            if not (origin.startswith("http://") or origin.startswith("https://")):
                raise ValueError(
                    f"FRONTEND_URL origin '{origin}' must be a full URL (e.g. https://app.example.com)"
                )
        return cleaned

    @field_validator("log_level")
    @classmethod
    def validate_log_level(cls, v: str) -> str:
        level = v.strip().upper()
        if level not in {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}:
            raise ValueError(f"LOG_LEVEL '{v}' is invalid (DEBUG|INFO|WARNING|ERROR|CRITICAL)")
        return level

    @model_validator(mode="after")
    def require_real_secrets(self) -> "Settings":
        """Fail fast on missing or placeholder credentials with an
        actionable message instead of a confusing upstream error."""
        required = {
            "secret_key": self.secret_key,
            "supabase_url": self.supabase_url,
            "supabase_service_role_key": self.supabase_service_role_key,
            "supabase_jwt_secret": self.supabase_jwt_secret,
            "groq_api_key": self.groq_api_key,
        }
        missing = [
            name
            for name, value in required.items()
            if not value or value.strip().lower().startswith(_PLACEHOLDER_MARKERS)
        ]
        if missing:
            raise ValueError(
                "Missing or placeholder value(s) for: "
                + ", ".join(missing)
                + ". Fill them in backend/.env — see .env.example for the list."
            )
        return self

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    @property
    def cors_origins(self) -> list[str]:
        """Validated, whitespace-trimmed list of allowed browser origins."""
        return self.frontend_url

    @property
    def supabase_project_url(self) -> str:
        return (
            self.supabase_url.strip()
            .removesuffix("/")
            .removesuffix("/rest/v1")
            .removesuffix("/auth/v1")
        )


@lru_cache
def get_settings() -> "Settings":
    """Settings are cached so the environment is only parsed once.

    Wraps pydantic's raw ValidationError so that misconfiguration
    surfaces as a single actionable startup error rather than a stack
    trace from wherever Settings() happens to be constructed.
    """
    try:
        return Settings()
    except ValidationError as exc:
        details = "; ".join(
            f"{'.'.join(str(part) for part in err['loc'])}: {err['msg']}"
            for err in exc.errors()
        )
        raise RuntimeError(
            "Backend configuration error. Check backend/.env:\n  " + details
        ) from exc