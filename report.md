# Issues

## Backend

1. **Missing rate‑limit configuration validation**
   - `app/core/rate_limit.py` is imported but not inspected; if the limiter is mis‑configured the API could be exposed to abuse. Add validation of `settings.rate_limit_per_minute` and unit tests for rate‑limit behavior.
2. **Sparse error handling for external services**
   - `groq_service.py` and `overpass_service.py` call external APIs without retry or circuit‑breaker logic. Network failures will bubble up as unhandled exceptions, potentially crashing the endpoint.
3. **Potential over‑broad emergency detection**
   - The regex patterns in `services/emergency_detector.py` are deliberately high‑recall, which can lead to many false positives and degrade user experience. Consider a two‑stage approach: pattern match then a lightweight ML classifier.
4. **No explicit handling of missing environment variables**
   - `app/core/config.py` loads variables via `pydantic_settings`. If a required env var is absent, the app raises at import time, making startup failures opaque. Wrap `get_settings()` with graceful error messages.
5. **Logging configuration is minimal**
   - `middleware/logging_middleware.py` only logs method, path, status and latency. Sensitive data is omitted (good), but there is no structured logging, no correlation IDs, and no log rotation. Integrate `structlog` or configure log format for observability.
6. **No unit or integration tests**
   - The repository lacks a `tests/` directory. Critical pathways (e.g., emergency detection, symptom‑checker prompt builder, Overpass query) are untested, increasing risk of regression.
7. **No CI/CD pipeline**
   - No GitHub Actions / GitLab CI configuration to run linting, type‑checking, tests, or build Docker images automatically.
8. **Overpass service builds queries insecurely**
   - `_ci_regex` manually escapes characters, but constructing OSM queries via string interpolation can still lead to malformed queries if input contains unexpected characters. Use parameterised query building or stricter sanitisation.
9. **Potential CORS misconfiguration**
   - `settings.cors_origins` is taken directly from the environment. If the list contains `*` the API becomes vulnerable to CSRF. Validate that origins are explicit host URLs.
10. **Absence of API versioning**
    - All routers are mounted at `/api/...` without a version prefix. Future breaking changes will be hard to roll out without versioning.
11. **Hard‑coded HTTP timeouts**
    - Timeouts in `groq_service` (60 s) and `overpass_service` (35 s) are static. Consider making them configurable via env vars.
12. **Missing OpenAPI security schemes**
    - FastAPI docs are exposed, but there is no OAuth2 / JWT schema defined for the `/api/auth/me` endpoint, which could mislead client developers.
13. **Supabase service not audited**
    - The `services/supabase_service.py` file was not inspected; ensure it uses parameterised queries and does not expose raw SQL.

## Frontend

1. **SEO meta tags are absent**
   - The Next.js pages do not set `<title>`, `<meta name="description">`, or Open Graph tags, hurting discoverability.
2. **Accessibility gaps**
   - No `aria-` attributes on interactive components, and colour contrast is not verified. Run an axe audit.
3. **Styling inconsistencies**
   - Tailwind is included (`tailwind.config.ts`) but many components use hard‑coded CSS classes, leading to a mixed styling approach.
4. **No dark‑mode support**
   - The UI is static‑light; adding a dark theme would improve user experience.
5. **Missing error boundary**
   - React error boundaries are not present; runtime errors could crash the whole SPA.
6. **No type safety for API responses**
   - Types are defined in `types/` but not enforced when calling the backend; consider using `zod` or `io-ts` for runtime validation.
7. **No analytics or performance monitoring**
   - The app does not integrate with tools like Google Analytics, Sentry, or Lighthouse CI.

# Suggestions

## Backend Enhancements

- **Add a comprehensive test suite** (`pytest`) covering unit tests for services, integration tests for API routes, and end‑to‑end tests using `httpx`.
- **Introduce CI/CD** (GitHub Actions) to lint (`ruff`), type‑check (`mypy`), run tests, and build a multi‑stage Docker image.
- **Implement retry/circuit‑breaker** (e.g., `tenacity`) for external calls in `groq_service` and `overpass_service`.
- **Upgrade logging** to structured JSON logs, include request IDs (via `starlette.requests.Request.state`) and ship logs to a log aggregation service.
- **Version the API** (`/api/v1/...`) to allow backward‑compatible evolution.
- **Add OpenAPI security definitions** for JWT bearer tokens, and enforce authentication on all routes.
- **Create a health‑check endpoint** that also verifies connectivity to Supabase, Groq and Overpass services.
- **Cache expensive Overpass queries** (e.g., using `aiocache` or Redis) with a short TTL to reduce API load.
- **Refactor emergency detection** to a two‑step pipeline: regex pre‑filter → lightweight ML classifier for higher precision.
- **Document environment variables** in `README.md` and provide a script to generate a sample `.env` with defaults.
- **Add database migrations** (Alembic) if future relational data is added.
- **Enforce strict CORS origins** and add a middleware to reject any `*` origins.

## Frontend Improvements

- **Add SEO meta tags** and a fallback `robots.txt`.
- **Implement dark‑mode** using CSS variables or Tailwind's dark variant.
- **Run an accessibility audit** and fix colour contrast, focus outlines, and ARIA roles.
- **Standardise styling**: fully adopt Tailwind (or a design system) and remove mixed vanilla CSS.
- **Introduce error boundaries** and graceful fallback UI.
- **Validate API responses** with a runtime schema validator (e.g., `zod`).
- **Add analytics and error tracking** (Google Analytics, Sentry) with consent handling.
- **Implement client‑side caching** for static lookups (e.g., nearby places) using SWR or React Query.
- **Write component documentation** (Storybook) to aid future UI development.
- **Add unit tests** for React components using Jest and React Testing Library.
- **Setup a CI pipeline** for linting (`eslint`), type‑checking (`typescript`), and running frontend tests.

---

*This audit was generated automatically. Review each item for relevance to your product roadmap before implementation.*

<!-- GOAL_COMPLETE -->