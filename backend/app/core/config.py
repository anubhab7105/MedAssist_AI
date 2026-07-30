"""
Centralized application configuration.

All secrets and environment-specific values are loaded here from
environment variables ONLY. Nothing in this file (or anywhere in the
backend) should ever be hardcoded with a real secret — see .env.example
for the full list of variables a deployment needs.
"""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


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
    groq_model: str = "llama-3.3-70b-versatile"

    # --- Overpass ---
    overpass_api_url: str = "https://overpass-api.de/api/interpreter"

    # --- Rate limiting ---
    rate_limit_per_minute: int = 20

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    @property
    def cors_origins(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.frontend_url
            if origin.strip()
        ]

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
    """Settings are cached so the environment is only parsed once."""
    return Settings()
