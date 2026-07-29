# MedAssist AI

An educational AI health assistant. It never diagnoses, never prescribes, and never
claims certainty — every AI response ends with a medical disclaimer, and an
emergency-pattern check runs before any message reaches the AI.

**Stack:** Next.js 15 / React 19 / TypeScript / Tailwind / ShadCN-style UI (frontend) +
FastAPI / Python (backend) + Supabase (auth + Postgres) + Groq (AI) + OpenStreetMap
Overpass API (nearby care) + Leaflet (maps).

---

## 1. Prerequisites

- Node.js 20+
- Python 3.12+
- A free [Supabase](https://supabase.com) project
- A free [Groq](https://console.groq.com) API key

---

## 2. Supabase setup

1. Create a new Supabase project.
2. In the SQL editor, run `backend/supabase_schema.sql`. This creates the `users`,
   `chat_history`, `symptom_history`, and `saved_locations` tables, a trigger that
   auto-creates a `users` row on signup, and Row Level Security policies.
3. In **Authentication → Providers**, enable **Email** and **Google**.
   For Google, you'll need OAuth credentials from the Google Cloud Console; add the
   Supabase callback URL shown in the provider settings.
4. In **Authentication → URL Configuration**, add your frontend URL (e.g.
   `http://localhost:3000` for local dev, your Vercel URL for production) to the
   redirect URLs, and set the site URL.
5. Grab from **Project Settings → API**:
   - `Project URL` → `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (backend only — never expose this)
   - JWT secret (**Project Settings → API → JWT Settings**) → `SUPABASE_JWT_SECRET`

---

## 3. Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # then fill in real values
uvicorn app.main:app --reload
```

The API runs at `http://localhost:8000`. Interactive docs at `/docs` (disabled in
production).

**Required env vars** (see `backend/.env.example`): `SECRET_KEY`, `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `GROQ_API_KEY`, `FRONTEND_URL`.

---

## 4. Frontend setup

```bash
cd frontend
npm install
cp .env.example .env.local      # then fill in real values
npm run dev
```

Runs at `http://localhost:3000`.

**Required env vars** (see `frontend/.env.example`): `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL`.

---

## 5. Deployment

### Backend → Render
`backend/render.yaml` is ready to use with Render's Blueprint deploy. Push the repo,
create a new Blueprint from it, and fill in the secret env vars in the Render
dashboard (they're marked `sync: false` so Render will prompt for them).

### Frontend → Vercel
Import the repo, set the **root directory** to `frontend`, and add the three
`NEXT_PUBLIC_*` env vars in the Vercel project settings. `NEXT_PUBLIC_API_URL` should
point at your deployed Render backend URL.

After both are live, update `FRONTEND_URL` in the backend's env vars to your real
Vercel URL (for CORS), and add that same URL to Supabase's redirect URL allowlist.

---

## 6. Project structure

```
frontend/
  app/                 Next.js App Router pages, grouped by (marketing) / (auth) / (dashboard)
  components/          ui/ (primitives), layout/, landing/, chat/, symptom-checker/, doctors/
  hooks/               useAuth, useChat, useGeolocation, use-toast
  services/            typed API-calling functions per feature
  lib/                 supabase clients, axios instance, utils
  types/               shared TypeScript types

backend/
  app/
    api/routes/        auth, chat, symptom_checker, doctors, profile
    services/          groq_service, emergency_detector, specialist_mapper,
                        overpass_service, supabase_service
    core/               config, security (JWT), rate limiting
    middleware/         request logging
    models/             Pydantic schemas
  supabase_schema.sql   Full DB schema + RLS policies
```

---

## 7. Safety design notes

- **Emergency detection runs before every AI call**, in both chat and the symptom
  checker (`app/services/emergency_detector.py`). If a red-flag pattern matches, the
  request never reaches Groq — the user gets an immediate "seek emergency care"
  message instead. Self-harm language is routed to crisis-line messaging rather than
  generic ER guidance.
- **The Groq system prompt** (`app/services/groq_service.py`) hard-codes the "never
  diagnose, never prescribe, never claim certainty" rules and requires the model to
  phrase findings as possibilities.
- **Every symptom-check response carries the disclaimer** as a required field —
  it's not something the AI can omit.
- **Row Level Security** on every Supabase table means a user can only ever read or
  write their own rows, independent of what the backend enforces.

## 8. What's intentionally minimal

This is a real, working scaffold, not a finished commercial product — a few things
are simplified on purpose and worth hardening before real users touch it:

- Pricing is a placeholder (per the original spec) — no billing is wired up.
- The emergency-pattern detector is a regex/keyword layer, not a clinical triage
  system — it's tuned for high recall, but it is not a substitute for a real medical
  emergency system and should never be treated as one.
- Rate limiting is in-memory (`slowapi`) — fine for one instance, swap for a
  Redis-backed limiter before scaling horizontally.
- No automated test suite is included yet.
