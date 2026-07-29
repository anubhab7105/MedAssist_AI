"""
MedAssist AI — FastAPI entrypoint.

Run locally:
    uvicorn app.main:app --reload

Deploy on Render:
    gunicorn app.main:app -k uvicorn.workers.UvicornWorker
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded

from app.core.config import get_settings
from app.core.rate_limit import limiter
from app.api.routes import auth, chat, symptom_checker, doctors, profile
from app.middleware.logging_middleware import RequestLoggingMiddleware

settings = get_settings()

app = FastAPI(
    title="MedAssist AI API",
    description=(
        "Educational medical-information API. This service never diagnoses "
        "conditions or prescribes medication — see /api/symptom-checker and "
        "/api/chat for the safety layers applied to every AI response."
    ),
    version="1.0.0",
    docs_url="/docs" if not settings.is_production else None,
    redoc_url=None,
)

app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Too many requests. Please slow down and try again shortly."},
    )


app.add_middleware(RequestLoggingMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(symptom_checker.router)
app.include_router(doctors.router)
app.include_router(profile.router)


@app.get("/")
async def root():
    return {"service": "MedAssist AI API", "status": "ok"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
