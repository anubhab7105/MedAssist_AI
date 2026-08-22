# Product Requirements Document (PRD): AI-Powered Recovery Mode

## 1. Overview
MedAssist AI is an existing healthcare assistant platform that helps users with health questions and symptom checking. The **AI-Powered Recovery Mode** feature aims to make the platform more adaptive and empathetic to a user's current physical and mental state. It introduces a mechanism to detect when a user is under high strain or exhaustion and dynamically adjusts the application's interface and goals to prioritize recovery over demanding targets.

## 2. Problem Statement
Wellness applications typically encourage users to follow rigid daily targets (e.g., step counts, active minutes). However, these targets can become overwhelming when a user is exhausted, stressed, or sick. A smart application should recognize these situations, reduce unnecessary pressure, and offer simplified recovery support rather than treating every day equally.

## 3. Goals & Objectives
* **Reduce User Pressure**: Dynamically hide or lower demanding goals when the user is in distress.
* **Simplify the Experience**: Offer a triaged, low-effort user interface during high-strain periods.
* **Provide Immediate Value**: Generate actionable, short (3-minute) recovery plans.
* **Maintain Engagement**: Protect user streaks so they do not feel penalized for taking necessary rest days.

## 4. User Personas
* **User**: An individual using the application for personal wellness and health tracking, who occasionally experiences days of high stress, fatigue, or illness.
* **Coach/Admin**: (Future Scope) A professional or administrator who views aggregated recovery trends and configures system-wide trigger thresholds.

## 5. Application Workflow
1. **Check-in**: User provides a quick text or audio health/energy check-in.
2. **Analysis**: AI processes the check-in and identifies the user's current energy/stress state.
3. **Mode Switching**: If high strain is detected, the app automatically switches to "Recovery Mode" (a simplified UI).
4. **Actionable Plan**: AI creates and displays a short, context-aware recovery activity (e.g., hydration, breathing).
5. **Goal Adjustment**: Normal daily goals are reduced, and the user's activity streak is protected.
6. **Resumption**: The user can return to normal mode once they have recovered.

## 6. Functional Requirements

### 6.1. Check-In & AI Triage
* The system must provide a UI component (`CheckInWidget`) for users to submit a text (or transcribed audio) check-in.
* The backend must use an AI model (via Groq) to analyze the check-in and determine if the user is in a state of high stress or exhaustion.

### 6.2. Recovery Mode & UI Adjustments
* If triggered, the user's profile must be updated to enable `is_recovery_mode`.
* The frontend must conditionally render a `RecoveryDashboard` instead of the standard dashboard when `is_recovery_mode` is active.
* The Recovery Dashboard must hide demanding metrics and present a simplified, low-stress interface.

### 6.3. Goal Adjustment & Streak Protection
* The system must temporarily reduce the user's `daily_goal_target`.
* The system must protect the `current_streak` by logging a `last_recovery_date` so the user is not penalized for missing normal targets.

### 6.4. AI Recovery Plan Generation
* The AI must generate a short, 3-minute, low-effort recovery activity tailored to the specific issues mentioned in the check-in (e.g., rest, hydration, breathing exercises).
* The frontend must display this plan in a `RecoveryActivityCard`.

### 6.5. Bonus Features
* **Breathing Widget**: An animated widget to guide breathing exercises during recovery mode.
* **Energy Forecast**: A visual element showing expected energy levels after completing the recovery activity.

## 7. Technical Architecture Impacts

### 7.1. Database (Supabase)
Add the following columns to the `public.users` table:
* `is_recovery_mode` (boolean, default false)
* `daily_goal_target` (integer)
* `current_streak` (integer, default 0)
* `last_recovery_date` (timestamptz)

### 7.2. Backend (FastAPI)
* **New Routes**:
  * `POST /api/v1/checkin`: Receives check-in, calls AI service, updates user profile if recovery mode is triggered.
  * `GET /api/v1/checkin/recovery-activity`: Returns the AI-generated 3-minute recovery plan.
* **Modified Routes**:
  * `GET /api/v1/profile` & `PUT /api/v1/profile`: Must support reading and toggling the new recovery-related fields.
* **Services**:
  * `recovery_service.py`: Contains prompts and logic for Groq AI to evaluate check-ins and generate activities.

### 7.3. Frontend (Next.js)
* **API Integration**: Update profile interfaces and add wrappers for the new `/checkin` endpoints.
* **Components**: Create `CheckInWidget`, `RecoveryDashboard`, `RecoveryActivityCard`, `BreathingWidget`, and `EnergyForecast`.
* **Routing**: Modify `dashboard/page.tsx` to conditionally render `RecoveryDashboard` based on the user's `is_recovery_mode` status.

## 8. Test Scenarios
**Scenario 1: High Stress Check-in**
* **Action**: User inputs, "Exams start in two hours, I slept 3 hours, have a headache and feel sick."
* **Expected Result**: The backend AI detects high strain. The system updates the user's profile to activate Recovery Mode. The frontend dynamically switches to the Recovery Dashboard, hiding normal daily goals. A simple recovery card is displayed suggesting hydration and a short relaxation activity. The daily activity target is reduced, and the streak is maintained.
