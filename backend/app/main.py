"""
MedAssist AI — FastAPI entrypoint.

Run locally:
    uvicorn app.main:app --reload

Deploy on Render:
    gunicorn app.main:app -k uvicorn.workers.UvicornWorker
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded

from app.core.config import get_settings
from app.core.rate_limit import validate_rate_limit_config, limiter
from app.api.routes import auth, chat, checkin, symptom_checker, doctors, profile
from app.middleware.logging_middleware import RequestLoggingMiddleware, configure_logging

settings = get_settings()

# Root logger must be configured before anything else imports/binds it.
configure_logging(settings.log_level)

app = FastAPI(
    title="MedAssist AI API",
    description=(
        "Educational medical-information API. This service never diagnoses "
        "conditions or prescribes medication — see /api/v1/symptom-checker and "
        "/api/v1/chat for the safety layers applied to every AI response.\n\n"
        "Authenticate with a Supabase-issued JWT: `Authorization: Bearer <access_token>`."
    ),
    version="1.0.0",
    docs_url="/docs" if not settings.is_production else None,
    redoc_url=None,
)

# Fail fast with a clear message if the rate limit configuration is invalid.
validate_rate_limit_config()

app.state.limiter = limiter

API_PREFIX = "/api/v1"  # reserved; routers are mounted with a versioned prefix


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Too many requests. Please slow down and try again shortly."},
    )


app.add_middleware(RequestLoggingMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)

app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(symptom_checker.router)
app.include_router(doctors.router)
app.include_router(profile.router)
app.include_router(checkin.router)


def custom_openapi():
    """Document the Supabase JWT bearer scheme in the OpenAPI spec so
    /docs shows the 'Authorize' button for every protected route."""
    if app.openapi_schema:
        return app.openapi_schema
    schema = get_openapi(
        title="MedAssist AI API",
        version="1.0.0",
        description=app.description,
        routes=app.routes,
    )
    schema.setdefault("components", {}).setdefault("securitySchemes", {})[
        "BearerAuth"
    ] = {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT",
        "description": "Supabase-issued access token. Attach as `Authorization: Bearer <token>`.",
    }
    # Every endpoint (except /health, /docs) requires the Supabase JWT, so
    # apply it as the document-wide default — /docs shows the Authorize
    # button without per-route security args on every operation.
    schema["security"] = [{"BearerAuth": []}]
    app.openapi_schema = schema
    return schema


app.openapi = custom_openapi


@app.get("/")
async def root():
    return {
        "service": "MedAssist AI API",
        "status": "ok",
        "docs": "/docs" if not settings.is_production else None,
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}