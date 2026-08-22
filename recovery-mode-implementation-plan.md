# AI-Powered Recovery Mode — Implementation Plan

**Project:** MedAssist AI
**Feature:** AI-Powered Recovery Mode (per `problem.md`, `PRD.md`, `fixes.md`)
**Stack:** FastAPI + Supabase (backend), Next.js 15 + TypeScript (frontend), Groq (AI)

---

## Phase 0 — Decisions (locked)

These were open questions across the three source docs. Decisions below, with reasoning, so later phases can be implemented without re-litigating them.

### 1. Trigger logic → confidence score internally, boolean externally
`recovery_service.py` will have the Groq prompt return a numeric strain confidence (0–1), compared against a constant threshold (e.g. `RECOVERY_TRIGGER_THRESHOLD = 0.6`) defined in one place (`app/core/config.py`). The API only exposes a boolean (`recovery_triggered`) plus the raw `confidence` in `CheckInResponse`.
**Why:** costs nothing extra to build now, and gives the "Coach/Admin configures trigger thresholds" future-scope item (PRD §4) a ready hook — that becomes a config change, not a rewrite.

### 2. Streak math → freeze, don't increment
On a day where recovery mode is triggered, `current_streak` is **left unchanged** (not incremented as if the goal were met, not reset to 0). `last_recovery_date` is logged, and streak-reset logic (wherever it currently lives) treats that date as an exempt day — a missed normal-goal day on `last_recovery_date` does not break the streak.
**Why:** incrementing the streak on a day nothing was done invites gaming the feature; freezing keeps the streak meaningful for users while still doing exactly what PRD §6.3 asks ("not penalized for missing normal targets").

### 3. Exit condition → lazy auto-expiry + manual override
Two paths out of Recovery Mode, no cron/background job required:
- **Manual:** user (or `RecoveryDashboard` UI) calls `PUT /api/v1/profile { is_recovery_mode: false }` at any time — already supported per `fixes.md` §2.
- **Auto:** on every `GET /api/v1/profile` read, if `is_recovery_mode` is `true` and `last_recovery_date` is more than 24 hours in the past, the route clears `is_recovery_mode` server-side before returning the profile (lazy expiry — evaluated on read, no scheduler needed).
**Why:** avoids a user getting stuck in Recovery Mode indefinitely if they never manually exit, without the operational overhead of a background job for a hackathon-scale project.

### 4. Safety-layer integration → run emergency detection first
`recovery_service.evaluate_checkin()` runs the check-in text through the **existing emergency-detection service** (already used by the symptom checker) *before* the recovery-classification prompt. If the emergency layer fires, the route short-circuits to your existing emergency-response path and skips recovery-mode logic entirely.
**Why:** a check-in is free-text health/emotional input — treating every message as a "strain to soothe" risks missing a message the app already knows how to escalate. Reusing the existing layer costs one extra function call and closes that gap.

### 5. Input mode → text-first
`CheckInWidget` ships text-only. Audio transcription (mentioned in `fixes.md`/PRD as "text or transcribed audio") is deferred — the request schema (`CheckInRequest.text: str`) doesn't change either way, so this can be added later without breaking the API contract.
**Why:** smallest scope that satisfies the core requirement; transcription is a separable, addable-later concern.

---

## Phase 1 — Database (Supabase)

1. Write a migration in `supabase_schema.sql` adding to `public.users`:
   - `is_recovery_mode boolean default false`
   - `daily_goal_target integer`
   - `current_streak integer default 0`
   - `last_recovery_date timestamptz`
2. Backfill existing rows with sane defaults for `daily_goal_target` (match whatever your current hardcoded/default target is).
3. Apply via Supabase SQL editor or CLI migration.
4. Confirm `GET /api/v1/profile` still returns cleanly with the new nullable columns before touching any route logic.

## Phase 2 — Backend schemas (`app/models/schemas.py`)

1. `CheckInRequest` — `text: str`.
2. `CheckInResponse` — `recovery_triggered: bool`, `confidence: float`, `summary: str`.
3. `RecoveryActivityResponse` — `activity: str`, `duration_minutes: int`, `category: Literal["hydration", "rest", "breathing", ...]`.
4. Extend `ProfileUpdateRequest` with the four new optional fields.
5. Extend `ProfileResponse` (or equivalent) to serialize the new fields.

## Phase 3 — AI service (`app/services/recovery_service.py`, new)

1. `async def evaluate_checkin(text: str) -> CheckInResponse`:
   - First, call the existing emergency-detection service on `text` (Phase 0, decision 4). If it fires, return/raise in a way the route can catch and redirect to the existing emergency path.
   - Otherwise, Groq call with a prompt that returns structured JSON: `{ confidence: float, summary: str }`. Compare `confidence` against `RECOVERY_TRIGGER_THRESHOLD` to set `recovery_triggered`.
   - Mirror the structured-output pattern your symptom-checker service already uses with Groq, for consistency.
2. `async def generate_recovery_activity(context: str) -> RecoveryActivityResponse`:
   - Separate Groq call, prompted for a short (3-minute), low-effort activity tailored to the check-in context.
3. Reuse the existing Groq client/config (`GROQ_API_KEY`, `GROQ_MODEL`) — don't instantiate a new client.
4. Add `RECOVERY_TRIGGER_THRESHOLD` to `app/core/config.py`.

## Phase 4 — Routes

1. New `app/api/routes/checkin.py`:
   - `POST /api/v1/checkin` — auth-protected (same Supabase bearer pattern as existing routes). Calls `evaluate_checkin`; if triggered, updates the user row (`is_recovery_mode=true`, lowers `daily_goal_target`, sets `last_recovery_date`, leaves `current_streak` untouched per Phase 0 decision 2).
   - `GET /api/v1/checkin/recovery-activity` — calls `generate_recovery_activity`, keyed off the user's most recent check-in (store the last check-in text, or accept context as a query param).
2. Modify `app/api/routes/profile.py`:
   - `GET /api/v1/profile` — implement the lazy auto-expiry check (Phase 0, decision 3) before returning the profile.
   - `PUT /api/v1/profile` — accept the new fields, including manual `is_recovery_mode` toggling.
3. Register `checkin.router` in `app/main.py` under `/api/v1` (easy to miss — not explicitly called out in `fixes.md`).
4. Add rate limiting via the existing SlowAPI setup, matching other AI-backed routes.

## Phase 5 — Frontend types & services

1. Extend the profile TypeScript interface (in `lib`/`types`) with the four new fields.
2. New `services/checkin.ts` — Axios wrappers: `postCheckIn(text: string)`, `getRecoveryActivity()`, following the pattern of existing `services/` wrappers.

## Phase 6 — Frontend components

Build in this order (each depends on the previous, except the bonus widgets):

1. `CheckInWidget.tsx` — text input only (Phase 0, decision 5).
2. `RecoveryDashboard.tsx` — simplified layout, reduced targets, hides normal goal widgets; includes the manual "I'm feeling better" exit action (`PUT /profile { is_recovery_mode: false }`).
3. `RecoveryActivityCard.tsx` — renders the AI-generated activity.
4. Bonus — `BreathingWidget.tsx`: pure CSS/JS animation, no AI dependency; can be built in parallel with anything above.
5. Bonus — `EnergyForecast.tsx`: simple visual (e.g. a short "expected energy in ~3 min" indicator) — no strict data contract required from the backend, so define its input shape when you get here.

## Phase 7 — Routing

1. `dashboard/page.tsx`:
   ```tsx
   if (profile.is_recovery_mode) return <RecoveryDashboard />;
   ```
2. Confirm the auto-expiry (Phase 0, decision 3) means this check will naturally resolve back to the normal dashboard on next profile fetch, with no extra frontend polling logic needed.

## Phase 8 — Verification

1. Run the exact PRD §8 test scenario end-to-end:
   - Input: *"Exams start in two hours, I slept 3 hours, have a headache and feel sick."*
   - Confirm: recovery mode activates, dashboard swaps, activity card shows hydration/relaxation, `daily_goal_target` drops, `current_streak` is untouched, `last_recovery_date` is set.
2. Add a second test case with clearly *non*-strain text (e.g. "had a great walk today") to confirm recovery mode does **not** trigger.
3. Add a test case with emergency-flagged text to confirm the Phase 0 decision-4 short-circuit routes to the existing emergency path instead of the recovery path.
4. Run standard verification:
   - Frontend: `npm run type-check`, `npm run lint`, `npm run build`
   - Backend: `pytest`
