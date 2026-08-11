"""Configuration validation tests — rate limits, CORS origins, graceful boot."""

import pytest
from pydantic import ValidationError

from app.core.config import Settings, get_settings

_BASE = {
    "secret_key": "test-secret-key-that-is-long-enough-for-hs256",
    "supabase_url": "https://test-project.supabase.co",
    "supabase_service_role_key": "test-service-role-key",
    "supabase_jwt_secret": "test-jwt-secret-at-least-32-characters-long!!",
    "groq_api_key": "test-groq-key",
    "overpass_api_url": "https://overpass-api.de/api/interpreter",
}

_CORS_DEFAULT = {"frontend_url": ["http://localhost:3000", "http://localhost:3001"]}


def test_settings_load_from_environment():
    s = get_settings()
    assert s.rate_limit_per_minute == 20
    assert "http://localhost:3000" in s.cors_origins


@pytest.mark.parametrize("bad", [0, -5, 1001])
def test_rate_limit_validation_rejects_out_of_bounds(bad):
    with pytest.raises(ValidationError, match="rate_limit_per_minute"):
        Settings(rate_limit_per_minute=bad, **_BASE, **_CORS_DEFAULT)


def test_rate_limit_upper_bound_accepted():
    s = Settings(rate_limit_per_minute=1000, **_BASE, **_CORS_DEFAULT)
    assert s.rate_limit_per_minute == 1000


def test_cors_rejects_wildcard_origin():
    with pytest.raises(ValidationError, match=r"\*"):
        Settings(frontend_url=["*"], **_BASE)


def test_cors_rejects_non_url_origin():
    with pytest.raises(ValidationError, match="full URL"):
        Settings(frontend_url=["localhost:3000"], **_BASE)


def test_cors_trims_whitespace():
    s = Settings(frontend_url=["  http://localhost:3000  "], **_BASE)
    assert s.cors_origins == ["http://localhost:3000"]


def test_placeholder_secrets_rejected():
    with pytest.raises(ValidationError, match="placeholder"):
        Settings(**_BASE | {"supabase_service_role_key": "your-service-role-key"}, **_CORS_DEFAULT)


def test_graceful_boot_error_names_missing_var(monkeypatch):
    from app.core import config as config_module

    monkeypatch.setenv("SUPABASE_URL", "your-project.supabase.co")
    config_module.get_settings.cache_clear()
    with pytest.raises(RuntimeError, match="supabase_url"):
        config_module.get_settings()


def test_supabase_project_url_normalizes_suffixes():
    s = Settings(**_BASE | {"supabase_url": "https://proj.supabase.co/rest/v1"}, **_CORS_DEFAULT)
    assert s.supabase_project_url == "https://proj.supabase.co"