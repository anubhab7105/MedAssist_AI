"""
pytest bootstrap.

Sets the environment BEFORE any app module is imported (several modules
bind `settings = get_settings()` at import time), and exposes shared
fixtures.

Note: variables are force-assigned (not setdefault) so that a real
backend/.env read from disk can never sneak test values from a local
developer machine into the assertions.
"""

import os
import sys
import pytest

BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

TEST_ENV = {
    "ENVIRONMENT": "test",
    "FRONTEND_URL": '["http://localhost:3000","http://localhost:3001"]',
    "SECRET_KEY": "test-secret-key-that-is-long-enough-for-hs256",
    "SUPABASE_URL": "https://test-project.supabase.co",
    "SUPABASE_SERVICE_ROLE_KEY": "test-service-role-key",
    "SUPABASE_JWT_SECRET": "test-jwt-secret-at-least-32-characters-long!!",
    "GROQ_API_KEY": "test-groq-key",
    "GROQ_MODEL": "llama3-8b-8192",
    "OVERPASS_API_URL": "https://overpass-api.de/api/interpreter",
    "RATE_LIMIT_PER_MINUTE": "20",
    "LOG_LEVEL": "INFO",
}
for key, value in TEST_ENV.items():
    os.environ[key] = value


@pytest.fixture(autouse=True)
def clear_overpass_cache():
    """Ensure the Overpass result cache never leaks between tests."""
    from app.services.overpass_service import clear_cache

    clear_cache()
    yield
    clear_cache()