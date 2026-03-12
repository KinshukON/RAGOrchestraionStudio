RAG Studio & Admin – Agent Guide
================================

## Project overview

- **RAG Studio**: Browser-based enterprise platform for designing, configuring, testing, and operating Retrieval-Augmented Generation (RAG) architectures (vector, vectorless, graph, temporal, hybrid) with a visual workflow builder, Query Studio, Integrations Hub, and an Admin section for auth/session management, users/roles/teams/sessions, preferences, views, data integration, and observability.

When working in this repo, optimize for **modularity, explainability, and governance**. Prefer configuration-first patterns, clear APIs, and reusable UI components.

## Tech stack & architecture

- **Frontend**
  - React 19 + TypeScript, Vite.
  - React Router for navigation.
  - TanStack Query for data fetching and caching.
  - Styling: modular CSS files imported per feature (no Tailwind unless explicitly added later).
  - Key modules: `WorkflowBuilderPage`, `QueryStudioPage`, `IntegrationsHubPage`, `AppShell` with left nav + right config panels, and Admin pages (Users, Preferences, Views, Data Integration, Integrations, Observability) built with the same stack.
- **Backend**
  - Python FastAPI app (`backend/main.py`) with routers such as:
    - `projects`, `workflows`, `integrations`, `environments`, `governance`, and future `admin`/`auth`-related routers.
  - In-memory stores for now; design APIs to be DB-ready (PostgreSQL-friendly) but stay within the FastAPI + SQLModel/SQLAlchemy stack.
  - Workflow simulation endpoints (`/api/workflows/{id}/simulate` and `/simulate-multi`) for Query Studio.

## Dev environment tips

- **RAG Studio (this repo)**
  - Frontend:
    - Install deps: `cd frontend && npm install`.
    - Run dev server: `npm run dev`.
  - Backend (FastAPI):
    - Create/activate virtualenv in `backend/.venv` (already created).
    - Run dev server (example): `uvicorn main:app --reload` from `backend/`.

## Code style & conventions

- **TypeScript & React**
  - Use function components and hooks.
  - Prefer feature modules under `frontend/src/modules/**` (e.g., `workflow-builder`, `query-studio`, `admin-integrations`, `ui`, and future admin-related modules).
  - Use TanStack Query for data loading, mutations, caching; keep API clients under `frontend/src/api/**`.
- **Python FastAPI**
  - Keep routers small and focused (`backend/routers/*.py`).
  - Use Pydantic models for request/response schemas; keep them DB-ready even if currently in-memory.
  - Avoid mixing routing logic with persistence/business logic when the code grows; introduce services/repositories as needed.
  - Implement admin-related features (auth, users, roles, teams, sessions, integrations, observability, data integration) in this FastAPI service using SQLModel/SQLAlchemy for persistence when a DB is introduced.

## Admin section guidelines

- **Scope**
  - The Admin section (auth/sessions, users/roles/teams, preferences, views, data integration, observability) is implemented inside this same FastAPI + React application.
  - For detailed Admin UX and API requirements, follow the dedicated plan documents under `.cursor/plans/` instead of expanding this guide.

## Testing & checks

- Prefer targeted tests:
  - FastAPI: `pytest`-style tests for routers and workflow simulation logic.
- Always keep lints passing:
  - Frontend: `npm run lint` in `frontend/`.
  - Backend (Python/FastAPI): run configured linters/formatters if present.
- After every meaningful change that affects the build (frontend or backend), commit and push to the primary GitHub branch so Vercel and other environments stay in sync with the latest code.

## Security & safety

- **Tokens & secrets**
  - Never log full JWTs, access tokens, refresh tokens, or API keys.
  - Refer to secrets by config key or environment variable name.
- **Database safety**
  - When a relational DB is added, prefer non-destructive schema evolution commands and avoid dropping databases or erasing volumes.
- **Governance**
  - Preserve audit logging hooks (or add them) on sensitive actions: role changes, integration reconfiguration, observability rule edits.
  - Make RAG workflows and admin actions explainable where possible (e.g., traces in Query Studio, admin activity logs).

