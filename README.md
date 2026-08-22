# MedAssist AI

MedAssist AI is a hackathon-built healthcare assistant that helps users ask health questions, check symptoms, save health context, and find nearby care options. It is designed as an educational support tool, not a replacement for clinicians.

Live demo: https://medassist-ctrlv.vercel.app

## What It Does

- AI chat for general health questions with cautious, educational responses
- Symptom checker that summarizes symptoms, suggests possible next steps, estimates severity, and recommends a relevant specialist
- Emergency-aware safety layer that detects urgent symptoms before calling the AI model
- Authenticated user profiles with persisted chat and symptom history
- Nearby healthcare lookup using OpenStreetMap/Overpass data and an interactive map
- Account deletion and profile management
- Responsive dashboard experience built for desktop and mobile

## Tech Stack

Frontend:
- Next.js App Router
- React 19 and TypeScript
- Tailwind CSS
- Supabase Auth
- React Query, Axios, React Hook Form, Zod
- Leaflet / React Leaflet maps

Backend:
- FastAPI
- Pydantic settings and schemas
- Supabase Postgres and Auth integration
- Groq API for AI responses
- OpenStreetMap Overpass API for nearby places
- SlowAPI rate limiting
- Pytest test suite

## Architecture

```text
frontend/
  app/                 Next.js routes for marketing, auth, and dashboard pages
  components/          UI, landing, chat, doctors, layout, and symptom checker components
  hooks/               Auth, chat, geolocation, and toast hooks
  lib/                 Supabase clients, API client, utilities, local history
  services/            Frontend API wrappers

backend/
  app/main.py          FastAPI app entrypoint
  app/api/routes/      Auth, chat, symptom checker, doctors, and profile routes
  app/core/            Config, security, HTTP client, and rate limiting
  app/services/        Groq, Supabase, emergency detection, Overpass, specialist mapping
  app/models/          Pydantic request/response schemas
  tests/               Backend tests
```

## API Overview

The backend mounts versioned routes under `/api/v1`:

- `POST /api/v1/chat` streams AI chat responses over Server-Sent Events
- `POST /api/v1/symptom-checker` returns structured symptom guidance
- `POST /api/v1/doctors/nearby` returns nearby clinics, hospitals, pharmacies, or doctors
- `GET /api/v1/auth/me` verifies the current Supabase session
- `GET /api/v1/profile` reads the signed-in user's profile
- `PUT /api/v1/profile` updates profile fields
- `GET /api/v1/profile/chat-history` returns recent chat history
- `GET /api/v1/profile/symptom-history` returns recent symptom checks
- `DELETE /api/v1/profile/account` deletes the user's stored data and Supabase auth user
- `GET /health` returns backend health status

Most API routes require a Supabase access token in `Authorization: Bearer <token>`. Sign up, login, and password reset run through Supabase Auth from the frontend so the backend never handles user passwords.

## Local Setup

Prerequisites:
- Node.js and npm
- Python 3.11+
- Supabase project
- Groq API key

### 1. Backend

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Create `backend/.env`:

```env
ENVIRONMENT=development
FRONTEND_URL=["http://localhost:3000"]
SECRET_KEY=replace-with-a-local-secret
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-supabase-jwt-secret
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=llama-3.3-70b-versatile
OVERPASS_API_URL=https://overpass-api.de/api/interpreter
GOOGLE_PLACES_API_KEY=your-google-places-api-key
USE_GOOGLE_PLACES=true
RATE_LIMIT_PER_MINUTE=20
LOG_LEVEL=INFO
```

Initialize the Supabase tables with [backend/supabase_schema.sql](backend/supabase_schema.sql).

Start the API:

```powershell
uvicorn app.main:app --reload
```

The backend runs at `http://localhost:8000`. In development, API docs are available at `http://localhost:8000/docs`.

### 2. Frontend

```powershell
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Start the app:

```powershell
npm run dev
```

Open `http://localhost:3000`.

## Verification

Frontend:

```powershell
cd frontend
npm run type-check
npm run lint
npm run build
```

Backend:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Deployment Notes

- Frontend is configured for Vercel-style deployment.
- Backend includes `Dockerfile` and `render.yaml` for Render deployment.
- In production, FastAPI docs are disabled when `ENVIRONMENT=production`.
- CORS is intentionally restricted through `FRONTEND_URL`; do not use `*` because authenticated requests include credentials/tokens.

## Safety Disclaimer

MedAssist AI is a hackathon prototype for educational and informational use. It does not diagnose, prescribe medication, or replace emergency care. Users with urgent symptoms should contact local emergency services or a qualified medical professional.
