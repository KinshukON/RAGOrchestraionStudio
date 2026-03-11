RAG Studio & Admin – Agent Guide
================================

## Project overview

- **RAG Studio**: Browser-based enterprise platform for designing, configuring, testing, and operating Retrieval-Augmented Generation (RAG) architectures (vector, vectorless, graph, temporal, hybrid) with a visual workflow builder, Query Studio, and Integrations Hub.
- **Admin Console (TVC-style)**: Enterprise admin area for auth/session management, users/roles/teams/sessions, integrations, data integration, views/preferences, and observability. The detailed spec you saw applies to an Express + Prisma + PostgreSQL service that may coexist with this RAG Studio repo.

When working in this repo, optimize for **modularity, explainability, and governance**. Prefer configuration-first patterns, clear APIs, and reusable UI components.

## Tech stack & architecture

- **Frontend**
  - React 19 + TypeScript, Vite.
  - React Router for navigation.
  - TanStack Query for data fetching and caching.
  - Styling: modular CSS files imported per feature (no Tailwind unless explicitly added later).
  - Key modules: `WorkflowBuilderPage`, `QueryStudioPage`, `IntegrationsHubPage`, `AppShell` with left nav + right config panels.
- **Backend (RAG Studio)**
  - Python FastAPI app (`backend/main.py`) with routers:
    - `projects`, `workflows`, `integrations`, `environments`, `governance`.
  - In-memory stores for now; design APIs to be DB-ready.
  - Workflow simulation endpoints (`/api/workflows/{id}/simulate` and `/simulate-multi`) for Query Studio.
- **Admin backend (TVC-style, separate service)**
  - Express + Prisma + PostgreSQL (per spec), not yet present in this repo.
  - When implementing those features here or in a sibling service, keep Express + Postgres and extend existing models instead of replatforming.

## Dev environment tips

- **RAG Studio (this repo)**
  - Frontend:
    - Install deps: `cd frontend && npm install`.
    - Run dev server: `npm run dev`.
  - Backend (FastAPI):
    - Create/activate virtualenv in `backend/.venv` (already created).
    - Run dev server (example): `uvicorn main:app --reload` from `backend/`.
- **Admin service (Express + Prisma + Postgres) – when added**
  - Use `npx prisma db push` for schema evolution.
  - Avoid destructive commands (`prisma migrate reset`, dropping DBs, `docker compose down -v`, etc.).

## Code style & conventions

- **TypeScript & React**
  - Use function components and hooks.
  - Prefer feature modules under `frontend/src/modules/**` (e.g., `workflow-builder`, `query-studio`, `admin-integrations`, `ui`).
  - Use TanStack Query for data loading, mutations, caching; keep API clients under `frontend/src/api/**`.
- **Python FastAPI**
  - Keep routers small and focused (`backend/routers/*.py`).
  - Use Pydantic models for request/response schemas; keep them DB-ready even if currently in-memory.
  - Avoid mixing routing logic with persistence/business logic when the code grows; introduce services/repositories as needed.
- **Express + Prisma (admin)**
  - Extend Prisma models to match the spec (User, Role, Team, Session, Integration, View, Preferences, Data Integration, Observability models).
  - Keep routes organized by concern: `auth`, `admin` (users/roles/teams/sessions), `integrations`, `observability`, `data-integration`, etc.

## Admin section guidelines

- **Auth & sessions**
  - Access token: 15-minute JWT with `{ id, email, role, sessionId }`.
  - Refresh token: 7-day JWT or DB-backed token with `{ id, sessionId }`.
  - Include `touchSession(sessionId)` call on every authenticated request to update `lastActivity`.
- **Roles & users**
  - Roles: Admin, PM, Editor, Viewer (or a compatible mapping from existing enums).
  - Extend `User` with profile fields (name, job title, department, company, location, team, microsoftId).
  - Implement `/auth/me`, `/auth/profile`, `/auth/refresh`, `/auth/register` as per spec.
- **Admin UI**
  - `/admin` landing with subpages: Users, Preferences, Views, Data Integration, Integrations, Observability.
  - Use dropdown in the header for Admin navigation; protect routes by role.
  - User Management: table-based UX with filters, tabs (Users, Roles & Permissions, Teams, Active Sessions).
  - Integrations: grid of integration cards; configuration modals; test & disconnect actions.
  - Observability: 12-tab dashboard for metrics/logs/alerts, using charts and stat cards.

## Testing & checks

- Prefer targeted tests:
  - FastAPI: `pytest`-style tests for routers and workflow simulation logic.
  - Express/Prisma (when present): route and service tests for auth, admin, integrations, observability.
- Always keep lints passing:
  - Frontend: `npm run lint` in `frontend/`.
  - Backend (Python/Express): run configured linters/formatters if present.
- After every meaningful change that affects the build (frontend or backend), commit and push to the primary GitHub branch so Vercel and other environments stay in sync with the latest code.

## Security & safety

- **Tokens & secrets**
  - Never log full JWTs, access tokens, refresh tokens, or API keys.
  - Refer to secrets by config key or environment variable name.
- **Database safety**
  - Use **only** `npx prisma db push` for schema changes in Prisma-based services.
  - Do **not** run destructive operations like `migrate reset`, dropping DBs, or erasing volumes.
- **Governance**
  - Preserve audit logging hooks (or add them) on sensitive actions: role changes, integration reconfiguration, observability rule edits.
  - Make RAG workflows and admin actions explainable where possible (e.g., traces in Query Studio, admin activity logs).

