## 1. Executive Summary

**What this project is.**  
RAG Studio is an early-stage, but non-trivial, single-tenant web application consisting of a React 19 + TypeScript frontend and a FastAPI + SQLModel backend intended as a **control plane for Retrieval-Augmented Generation (RAG) architectures**. It exposes a visual workflow builder, a query simulation studio, an integrations + environments hub, and an in-app admin console (users/roles/teams/views/preferences/sessions/observability), all wired end-to-end.

**What problem it solves.**  
It aims to provide an **enterprise RAG orchestration platform** where different retrieval strategies (vector, lexical, graph, temporal, hybrid) can be modeled as workflows, simulated, associated with integrations/environments, and governed through RBAC and observability. Today, it mostly delivers **configuration and simulation scaffolding**, not full RAG execution.

**Current stage.**  
Implementation is between **MVP and early internal platform**:

- A real **PostgreSQL-backed persistence layer** for projects, integrations, environments, workflow runs, admin entities, and observability is wired via SQLModel (`backend/db.py`, `backend/models_core.py`, `backend/models_admin.py`, `backend/repositories.py`), but most admin CRUD uses **in-memory dicts** instead of the DB.  
- RAG workflows and simulation endpoints are implemented, but **RAG retrieval and LLM calls are stubbed** (`backend/retrieval.py`, simulation in `backend/routers/workflows.py` returns synthetic traces and answers).  
- Frontend surfaces for workflow builder, query studio, integrations hub, and admin pages are implemented and connected to the backend APIs.

**Real vs aspirational.**

- **Real / Implemented:**  
  - Google-based sign-in on the frontend and a backend **Google ID token → JWT** exchange (`backend/routers/auth.py`, `frontend/src/modules/auth/AuthContext.tsx`, `.env` files).  
  - Workflow CRUD and simulation APIs + corresponding React UI for building and simulating workflows.  
  - Integrations and environments CRUD backed by PostgreSQL via SQLModel repositories.  
  - An admin console for users, roles, teams, views, preferences, sessions, and observability, with working HTTP APIs and basic UI, mostly using **in-memory stores**.  
  - Observability metrics and audit log scaffolding.
- **Aspirational / Planned:**  
  - Actual RAG retrieval against vector/graph/temporal backends and real LLM/model orchestration (currently only abstracted and stubbed).  
  - Full governance (approval workflows, lineage, fine-grained RBAC enforcement, evaluation modules, monitoring dashboards) as described in `README.md` and `.cursor/plans/*.plan.md`.  
  - Production-grade multi-tenancy, full security hardening, and mature evaluation pipelines.

---

## 2. Project Identity

- **Project name:** RAG Studio – Enterprise RAG Orchestration Platform (`README.md`).  
- **One-sentence definition:** A browser-based control plane for designing, configuring, and simulating retrieval‑augmented generation workflows with admin‑grade integrations and governance scaffolding.  
- **Primary domain:** Applied AI infrastructure / RAG orchestration systems.  
- **Target users:** Enterprise AI teams (AI architects, MLOps, knowledge engineers, platform teams) managing RAG deployments at scale (implied by `README.md` and admin/RBAC design).  
- **Likely deployment context:** Single FastAPI service + SPA frontend, with PostgreSQL; local dev assumed via `uvicorn` and `npm run dev`; no explicit cloud/IaC present, but structure is suitable for containerization / typical SaaS deployment.  
- **Maturity classification:** **MVP / internal platform prototype** – architecture is relatively clean and DB-ready, APIs and UIs are functional, but RAG execution, RBAC enforcement, security, and evaluation are still heavily stubbed.

---

## 3. Evidence-Based Feature Inventory

**Legend:**  
- Status: **Implemented** (end-to-end usable), **Partial**, **Placeholder**, **Planned**, **Unclear**.

| Feature / Capability | Status | Evidence Found | Files / Paths | Notes |
| --- | --- | --- | --- | --- |
| SPA shell with navigation (Dashboard, Workflow Builder, Query Studio, Admin) | Implemented | React Router routes with layout and protected auth; left nav structure | `frontend/src/App.tsx`, `frontend/src/modules/layout/AppShell.tsx` | Dashboard content is placeholder text. |
| Google-based sign-in (frontend) | Implemented | Google Identity Services script loader, JWT parsing on client, localStorage persistence | `frontend/src/modules/auth/AuthContext.tsx`, `LandingPage` uses `signInWithGoogle` | Frontend currently does not call backend `/api/auth/google`; it uses the Google ID token purely client-side. |
| Google ID token verification → app JWT (backend) | Implemented but unused by current frontend | HTTP endpoint `/api/auth/google`, calls Google tokeninfo, issues JWT via PyJWT | `backend/routers/auth.py`, `backend/main.py` | Frontend does not yet consume this access token or attach it to `apiClient`. |
| Basic auth state + protected routes | Implemented | ProtectedRoute component gating `/app/*` | `frontend/src/App.tsx` | Protection is purely client-side (no backend auth enforcement). |
| Workflow definitions (schema) | Implemented | Pydantic models for `WorkflowNode`, `WorkflowEdge`, `WorkflowDefinition` with rich `NodeType` enum | `backend/routers/workflows.py` | Node types cover many RAG concepts (vector, lexical, graph, temporal, reranker, guardrail, etc.). |
| Workflow CRUD API | Implemented (in-memory) | `_WORKFLOWS` dict, GET/POST/PUT/DELETE | `backend/routers/workflows.py` | No DB persistence: workflows vanish on restart. |
| Workflow simulation API (single workflow) | Implemented (stub) | `/api/workflows/{id}/simulate` creates `WorkflowRun` and `TaskExecution` rows, returns synthetic `WorkflowSimulationTrace` | `backend/routers/workflows.py`, `backend/models_core.py`, `backend/db.py` | RAG internals are placeholders; no retrieval or LLM calls. |
| Multi-strategy workflow simulation | Implemented (stub) | `/simulate-multi` wraps base simulate, tweaks latency/confidence per strategy | `backend/routers/workflows.py` | Strategy IDs like `vector`, `vectorless`, `hybrid` are accepted but do not affect retrieval logic. |
| Retrieval provider abstractions | Partial | `RetrievalProvider` protocol; `VectorRetrievalProvider` and `LexicalRetrievalProvider` return empty lists | `backend/retrieval.py` | Provides interface, but no actual backend integrations. |
| Workflow builder UI (graph canvas) | Implemented | ReactFlow-based canvas, node palette, configurable initial nodes, mapping to workflow definition, save buttons | `WorkflowBuilderPage.tsx`, `WorkflowCanvas.tsx`, `NodePalette.tsx` | Save/publish trigger POST/PUT via `useSaveWorkflow` to `/api/workflows`. |
| Workflow templates for vector/vectorless/graph/temporal/hybrid | Implemented (empty graphs) | `workflowTemplates` for 5 architecture types with metadata but no nodes/edges | `workflowTemplates.ts` | They seed metadata, not yet concrete topologies. |
| Query Studio UI | Implemented | Form for workflow ID, query, strategies, top_k; uses `simulateWorkflowMulti`; displays multi-card results + trace panels | `QueryStudioPage.tsx`, `TracePanels.tsx` | Depends on stubbed backend simulation. |
| Projects API | Implemented (DB-backed) | SQLModel `Project` table, repository, list/create endpoints | `backend/models_core.py`, `backend/repositories.py`, `backend/routers/projects.py` | No frontend usage yet. |
| Integrations model & CRUD (backend) | Implemented (DB-backed, no delete) | SQLModel `Integration`, repository with list/get/upsert, CRUD API with soft-delete not implemented | `models_core.py`, `repositories.py`, `routers/integrations.py` | `DELETE` always returns 501. |
| Environments model & CRUD (backend) | Implemented (DB-backed, no delete) | SQLModel `Environment`, repository, CRUD API with 501 on delete | `models_core.py`, `repositories.py`, `routers/environments.py` | |
| Integrations Hub UI + hooks | Implemented | `IntegrationsHubPage` renders integration table, environment binding matrix, integration wizard; hooks for list/save/delete | `IntegrationsHubPage.tsx`, `useIntegrationsEnvApi.ts` | Tied to backend `/api/integrations` and `/api/environments`. |
| Admin Users API | Implemented (in-memory) | In-memory `_USERS` dict with incremental IDs; list/create/patch endpoints | `backend/routers/admin_users.py`, `models_admin.User` | No DB usage; no auth or RBAC on endpoints. |
| Admin Users UI | Implemented | Fetches `/api/admin/users` and displays table with role/team/status | `AdminUsersPage.tsx` | No create/edit UI yet. |
| Admin Roles API | Implemented (in-memory) | `_ROLES` dict with list/create/patch; uniqueness check on name | `backend/routers/admin_roles.py` | |
| Admin Roles UI | Implemented | Lists roles via `/api/admin/roles` | `AdminRolesPage.tsx` | No editing controls in UI yet. |
| Admin Teams API | Implemented (in-memory) | `_TEAMS` dict with list/create/patch | `backend/routers/admin_teams.py` | |
| Admin Teams UI | Implemented | Lists teams + default role | `AdminTeamsPage.tsx` | No membership management in UI yet. |
| Admin Views API | Implemented (in-memory) | `_VIEWS` dict with list/create/patch | `backend/routers/admin_views.py` | |
| Admin Views UI | Implemented | Renders table of views via `/api/admin/views` | `AdminViewsPage.tsx` | No mutating operations in UI. |
| User Preferences API | Implemented (in-memory per user) | `_PREFERENCES` keyed by `user_id`, GET/PATCH `/me` with query param | `backend/routers/admin_preferences.py` | Auth is not integrated; `user_id` is a trusted query param. |
| Admin Preferences UI | Implemented | Uses `useAuth` user ID to call `/api/admin/preferences/me` | `AdminPreferencesPage.tsx` | Read-only display; no update controls. |
| Sessions API | Implemented (in-memory) | `_SESSIONS` dict, list/create, revoke by IDs or user ID | `backend/routers/admin_sessions.py` | Not yet integrated with auth or actual login events. |
| Observability models | Implemented (DB-ready) | SQLModel `AuditLog`, `ObservabilityEvent` | `backend/models_admin.py` | Not stored via DB; router uses in-memory maps. |
| Admin Observability API | Implemented (in-memory) | `_AUDIT_LOGS`/`_EVENTS` dicts, GET `/audit-logs` with filters and `/metrics` | `backend/routers/admin_observability.py` | `log_action` helper is defined but unused in other routers. |
| Admin Observability UI | Implemented | Fetches logs and metrics; displays metrics and table | `AdminObservabilityPage.tsx` | No filters in UI; data is empty until `log_action` is used. |
| Governance router (approvals, audit logs) | Placeholder | Endpoints `/api/governance/approvals` and `/audit-logs` always return empty lists | `backend/routers/governance.py` | Not wired to DB or observability models. |
| RBAC permission model (backend) | Partial | SQLModel `Role.permissions` JSON field, `RolePermission` table; no enforcement in routers | `backend/models_admin.py` | Future RBAC enforcement described in plans; not yet integrated. |
| RBAC permission usage (frontend) | Partial | `permissions.ts` exports `useHasPermission` and `Can` to check `user.permissions` | `frontend/src/modules/auth/permissions.ts` | No evidence that any page uses `Can` or sets `user.permissions`. |
| Data persistence (PostgreSQL) | Implemented basic wiring | `DATABASE_URL` config, SQLModel metadata create, `get_session` helper | `backend/db.py` | No migrations or schema evolution; default URL assumes local Postgres. |
| Evaluation module (query sets, metrics, A/B tests) | Planned only | Described in README and plans | `README.md`, `.cursor/plans/*` | No code implementing evaluations. |
| Monitoring / dashboards | Planned only | Mentioned as "Monitoring" navigation and dashboards | `README.md` | No frontend module or backend routes. |
| Multi-tenant / project-level scoping | Partial / mostly conceptual | `Project` model, `project_id` in `WorkflowDefinition` and `WorkflowRun` | `models_core.py`, `workflows.py` | No enforcement; Query Studio uses constant `project_id='demo-project'`. |
| Deployment / containerization | Not evident | No Dockerfile, compose, or CI configs | Searches for Docker/compose | Local dev instructions only. |
| Testing | Not evident | No tests found, no test directories | `Glob` for `tests*` | No pytest or frontend tests in repo. |

---

## 4. Architecture Analysis

### 4.1 Frontend Architecture

- **Framework & tooling:**  
  - React 19, TypeScript, Vite (`frontend/package.json`).  
  - TanStack Query for data fetching and caching (`@tanstack/react-query` and `QueryClient` in `api/client.ts`).  
- **App composition:**  
  - `App.tsx` defines routing and wraps the app in `AuthProvider`.  
    - `/` → `LandingPage` (public).  
    - `/app` → `AppShell` behind `ProtectedRoute` (requires `isAuthenticated` from `AuthContext`).  
    - Nested routes under `/app`: dashboard, workflow builder, query studio, and admin pages for integrations, users, roles, teams, views, preferences, and observability.  
  - `AppShell.tsx` defines sidebar + header layout with nav items (Dashboard, Workflow Builder, Query Studio, Integrations Hub, Admin).
- **State management and data loading:**  
  - Auth state via `AuthProvider` + `localStorage`.  
  - TanStack Query for data loading across feature modules (admin pages, workflow builder, integrations hub, query studio).
- **API client:**  
  - `apiClient` is an Axios instance pointing at `VITE_API_BASE_URL` (defaulting to `http://localhost:8000`).  
  - No auth headers or interceptors; all requests are effectively unauthenticated.
- **Module boundaries:**  
  - Feature-based modules under `frontend/src/modules/**` (auth, layout, workflow-builder, query-studio, admin-*, admin-integrations, ui).  
  - Each module owns its UI, hooks, and API calls.

Overall, the frontend architecture is **modular and feature-oriented**, with a simple shared API client and query client but **no global state beyond auth**.

### 4.2 Backend Architecture

- **Framework & middleware:**  
  - FastAPI app in `backend/main.py`.  
  - CORS middleware allowing all origins, methods, headers.
- **Routers / service boundaries:**  
  - `/api/auth` – Google ID token verification and JWT issuance.  
  - `/api/projects` – CRUD for `Project`.  
  - `/api/workflows` – in-memory workflow definitions + simulation endpoints.  
  - `/api/integrations` – DB-backed CRUD for integration configs.  
  - `/api/environments` – DB-backed CRUD for environment configs.  
  - `/api/governance` – placeholder approvals/audit endpoints returning empty lists.  
  - `/api/admin/*` – users, roles, teams, sessions, views, preferences, observability (mostly in-memory).  
  - `/health` – static health check.
- **Persistence & database usage:**  
  - SQLModel models split into core (`Project`, `Integration`, `Environment`, `WorkflowRun`, `TaskExecution`) and admin (`Role`, `Team`, `User`, `Session`, `View`, `UserPreference`, `AuditLog`, `ObservabilityEvent`).  
  - `db.py` sets up a synchronous Postgres engine and runs `SQLModel.metadata.create_all(engine)` at startup.  
  - Repositories exist for `Project`, `Integration`, `Environment`; admin routers use in-memory stores.
- **Control flow & orchestration:**  
  - Workflow simulation writes `WorkflowRun` and `TaskExecution` rows and returns a synthetic trace.  
  - Multi-strategy simulation wraps the base trace with minor numeric tweaks.  
  - No background tasks, queues, or event-driven components.
- **API patterns:**  
  - RESTful JSON APIs with list/create/update/delete patterns.  
  - Deletion of integrations and environments is deliberately unimplemented (501) for now.  
  - Minimal filtering support (observability logs).
- **Layering:**  
  - Partial separation between routers and repositories; no dedicated service layer.  
  - Core entities use repositories; admin and workflows access state directly.

### 4.3 Data Flow

- **Front-to-back:**  
  - React components and hooks call `apiClient` → FastAPI routers.  
  - No auth headers are attached, so all backend endpoints are currently open.
- **Within backend:**  
  - For DB-backed entities: router → repository → SQLModel session → Postgres.  
  - For in-memory entities: router functions manipulate module-level dicts (`_USERS`, `_ROLES`, `_TEAMS`, `_VIEWS`, `_PREFERENCES`, `_SESSIONS`, `_AUDIT_LOGS`, `_EVENTS`).
- **Workflow simulation flow:**  
  - Query Studio posts `MultiStrategySimulationRequest` to `/api/workflows/{id}/simulate-multi`.  
  - Backend calls `simulate_workflow`, which records a `WorkflowRun` and `TaskExecution` and returns a stub `WorkflowSimulationTrace`.  
  - `simulate-multi` clones this trace across strategies, adjusting latency and confidence; frontend renders cards and trace panels.

### 4.4 Orchestration Model

- **Conceptual orchestration:**  
  - `NodeType` enum defines a detailed RAG workflow vocabulary (input, classifiers, multiple retrievers, filters, re-rankers, prompt constructor, answer generator, evaluator, guardrail, fallback, output formatter).  
  - `WorkflowDefinition` encodes the workflow as a graph of nodes and edges.
- **Implemented orchestration:**  
  - No engine executing node-by-node logic or conditional routing.  
  - Simulation only produces a single `TaskExecution` with `node_type="simulate_entrypoint"`.  
  - Retrieval providers and integrations are not invoked.

### 4.5 Integration Points

- **External auth provider:** Google Identity Services on the frontend and Google tokeninfo endpoint on the backend for ID token verification.  
- **Database:** PostgreSQL via SQLAlchemy/SQLModel (`psycopg2-binary` in requirements).  
- **RAG backends:** None integrated; retrieval providers are stub classes.  
- **Other services:** No external logging/monitoring services, queues, or storage clients in code.

### 4.6 Enterprise/Multi-tenant Elements

- **Enterprise-flavored elements (partial):**  
  - Admin section for users, roles, teams, views, preferences, sessions, and observability.  
  - Role-permission modeling with JSON-based `permissions`.  
  - Observability models (`AuditLog`, `ObservabilityEvent`) and metrics endpoint.  
  - Conceptual separation of integrations and environments.
- **Missing pieces:**  
  - Multi-tenant boundaries and org-level scoping.  
  - RBAC enforcement on routers.  
  - Real audit logging and integration with business events.

**Component interaction narrative:**  
Users sign in via Google on the landing page, are routed to `/app`, and navigate using `AppShell`. In Workflow Builder they design ReactFlow graphs and persist workflow definitions (in-memory) via `/api/workflows`. In Integrations Hub they define `IntegrationConfig` and `EnvironmentConfig` records which are stored in Postgres. In Query Studio they run multi-strategy simulations against workflows, which are recorded as `WorkflowRun` and `TaskExecution` rows and returned as synthetic traces for visualization. Admin pages surface CRUD and observability views powered by in-memory APIs.

---

## 5. AI / LLM / RAG-Specific Analysis

### 5.1 Retrieval Modes & Storage Backends

- **Supported in concept (schemas/enums):**  
  - Vector RAG: NodeType `vector_retriever`; integration category `vector_db`.  
  - Vectorless/lexical RAG: NodeType `lexical_retriever`; templates labeled `vectorless`; integration categories `sql_db`, `document_repository`.  
  - Graph RAG: NodeType `graph_retriever`; integration category `graph_db`.  
  - Temporal RAG: NodeType `temporal_filter`; temporal template.  
  - Hybrid RAG: Template `hybrid` describing combined vector, lexical, graph, and temporal operations.
- **Actually implemented:**  
  - No retrieval logic beyond stub providers returning empty lists.  
  - No use of `RetrievalProvider` or integration records in workflows or simulations.  
  - No vector DB or graph DB client libraries present.

Retrieval modes are **designed but not executed**.

### 5.2 Orchestration Behavior

- `WorkflowDefinition` and `NodeType` provide a rich vocabulary for RAG workflows.  
- Simulation endpoints treat workflows as opaque and generate synthetic traces without node-level execution.  
- Multi-strategy simulation is a thin layer varying latency/confidence numerically; strategy-specific retrieval is not implemented.

### 5.3 Prompt Handling and Query Routing

- `WorkflowSimulationTrace` includes fields for `final_prompt_context`, `model_answer`, `confidence_score`, and `hallucination_risk`, but values are static or heuristic, not produced by LLMs.  
- There is no prompt template management, LLM provider abstraction, or routing logic between retrieval modes based on query content.

### 5.4 Evaluation Pipelines

- Evaluation capabilities (query sets, metrics, A/B tests, regression tracking) are described in docs but absent in code.  
- Query Studio offers multi-strategy views but does not compute or store quantitative evaluation metrics.  
- There are no evaluation-specific models, routes, or storage.

### 5.5 Governance, Observability, and Admin

- **Governance:**  
  - `governance` router offers approval and audit-log endpoints that return empty lists.  
  - Admin observability uses separate `AuditLog` and `ObservabilityEvent` models and APIs.  
  - No connection exists between governance and observability in the current code.
- **RBAC / governance controls:**  
  - Roles and permissions are modeled but not enforced on any endpoint.  
  - Frontend `Can`/`useHasPermission` helpers exist but are not applied in UI.  
  - All admin and core APIs are effectively open when the service is running.
- **Observability:**  
  - In-memory audit logs and events are maintained with an API to list and count them.  
  - `log_action` helper can create `AuditLog` entries, but it is not invoked anywhere.  
  - No external observability tooling is integrated.

### 5.6 Model/Provider Abstraction

- **Conceptual:**  
  - `IntegrationCategory` enumerates provider families (LLM, embeddings, reranker, vector DB, graph DB, SQL DB, logging/monitoring, email, etc.).  
  - `IntegrationConfig` stores provider type and a `credentials_reference` intended to resolve real clients.
- **Implemented:**  
  - No code maps integration records to concrete provider clients; `retrieval.py` is not wired to them.  
  - No LLM/embedding/reranker client libraries are present.

### 5.7 Limitations and Missing Pieces

- No actual LLM calls, embeddings generation, reranking, or context construction.  
- No retrieval pipeline connecting integrations to providers or workflows.  
- No evaluation pipelines or metrics.  
- No dynamic routing between vector/lexical/graph/temporal strategies.

Overall, AI/RAG aspects are **well-scaffolded but largely non-functional**.

---

## 6. UI / UX Surface Area

- **Landing page:** Marketing-style hero with Google sign-in CTA and feature highlights (Workflow Builder, Query Studio, Integrations Hub).  
- **AppShell & dashboard:** Sidebar + header layout, simple dashboard placeholder text.  
- **Workflow Builder:** ReactFlow-based canvas, node palette, save/publish controls, configuration side panel stub. Templates present but not yet providing rich initial graphs.  
- **Query Studio:** Form for workflow ID, query, strategies, and top-k; multi-card display of strategy results with trace panels. Conceptually a RAG debugging tool, currently using stubbed backend.  
- **Integrations Hub:** Integrations table with details and click-through editing; environments table with integration binding matrix; integration wizard modal.  
- **Admin console:** Users, roles, teams, views, preferences, and observability pages, each with basic tabular or list views and limited interactivity (read-only in many cases).

The UI supports significant **codeless behavior** for workflow design, query testing, and configuration, but many surfaces are **prototype-quality** with limited controls and validation.

---

## 7. API and Integration Inventory

- **Internal APIs (FastAPI):**  
  - `/health` – health check.  
  - `/api/auth/google` – POST Google ID token → app JWT.  
  - `/api/projects/` – GET list, POST create.  
  - `/api/workflows/` – in-memory workflow CRUD; `/simulate`, `/simulate-multi` for traces.  
  - `/api/integrations/` – DB-backed integrations CRUD, `DELETE` returns 501.  
  - `/api/environments/` – DB-backed environments CRUD, `DELETE` returns 501.  
  - `/api/governance/approvals`, `/api/governance/audit-logs` – placeholders returning empty lists.  
  - `/api/admin/users`, `/api/admin/roles`, `/api/admin/teams`, `/api/admin/sessions`, `/api/admin/views`, `/api/admin/preferences/me`, `/api/admin/observability/audit-logs`, `/api/admin/observability/metrics` – admin endpoints using in-memory stores.
- **External APIs / services:**  
  - Google tokeninfo endpoint for verifying ID tokens.  
  - PostgreSQL database for core entity persistence.  
- **Auth mechanisms:**  
  - Backend: Google ID token → JWT issuance with configurable secret and algorithm.  
  - Frontend: Google Identity Client-based sign-in using ID token; backend JWT unused; no auth on API calls.  
- **Connector patterns:**  
  - Conceptual via `IntegrationCategory` and `IntegrationConfig`, but no concrete external connectors implemented.  
- **Other infra integrations:**  
  - No message queues, vector DB clients, graph DB clients, or external observability tools present.

---

## 8. Data Model and Persistence

- **Core entities (DB-backed):**  
  - `Project` – high-level project metadata and architecture type.  
  - `Integration` – logical integration definitions with provider type and environment-mapped configs.  
  - `Environment` – environment definitions with `integration_bindings`.  
  - `WorkflowRun` – records of workflow simulations or runs.  
  - `TaskExecution` – per-task/node execution records with status and payloads.
- **Admin entities (DB-ready):**  
  - `Role`, `RolePermission`, `Team`, `TeamMember`, `User`, `Session`, `View`, `UserPreference`, `AuditLog`, `ObservabilityEvent` – rich set of governance and observability entities defined in SQLModel but not yet used by routers (which rely on in-memory stores).
- **Relationships:**  
  - Foreign keys link integrations and environments to projects, and workflow runs to projects/environments; admin models link users to teams/roles and sessions/logs to users.  
- **Persistence behavior:**  
  - Projects, integrations, environments, workflow runs, and task executions are persisted in Postgres.  
  - Admin and observability data are transient in-memory dictionaries; SQLModel definitions remain unused.
- **Multi-user / multi-tenant evidence:**  
  - Multi-user support is present via users and sessions; multi-tenancy (organizations) is absent.  
  - No access-control scoping of entities to specific users or tenants.

---

## 9. Implementation Maturity Assessment

- **Architecture – Moderate:** Clear separation between frontend and backend; coherent router and model structure; incomplete layering and orchestration; inconsistent persistence between core and admin.  
- **Code organization – Strong:** Feature-based frontend modules and well-structured backend files (models_core, models_admin, repositories, routers).  
- **Documentation – Moderate:** High-level docs and internal agent guidance exist; they overclaim features relative to code; lacks low-level API/database docs.  
- **Testing – Not evident:** No tests or CI configs; no evidence of automated verification.  
- **Deployment readiness – Weak:** No containerization or deployment scripts; DB config assumes a local Postgres instance.  
- **Security – Weak:** JWT issuance present but unused; endpoints unauthenticated and unprotected by RBAC; secrets committed in `.env`; CORS wide open.  
- **Observability – Partial/Weak:** Observability models and endpoints exist but are not wired to real events; no external observability stack.  
- **Scalability – Weak:** In-memory admin stores, synchronous DB usage, no queuing or partitioning, no mention of horizontal scaling.  
- **Configurability – Moderate:** Integrations and environments are flexible; env vars for DB and auth; but workflows are not persisted and there are no feature flags or configuration versioning.  
- **Enterprise-readiness – Weak to Moderate:** Admin, RBAC, and observability scaffolding suggest enterprise orientation but are mostly non-enforced and non-persistent.

---

## 10. Research Contribution Potential

- **Defendable current contributions:**  
  - An integrated architecture that combines a visual RAG workflow builder, a query simulation studio, an integrations and environments hub, and an admin/observability console in a single stack.  
  - A rich schema for RAG workflows and their executions (including `NodeType`, `WorkflowDefinition`, `WorkflowRun`, and `TaskExecution`), suitable for future research on RAG orchestration and tracing.
- **Contributions needing more evidence:**  
  - Multi-strategy RAG evaluation in Query Studio; currently based on synthetic traces without real retrieval or metrics.  
  - Enterprise-grade governance and observability for RAG control planes; models and UI exist but enforcement and event logging are incomplete.
- **Claims that should not be made yet:**  
  - That the system supports real vector/graph/temporal/hybrid RAG retrieval against external backends.  
  - That it enforces robust RBAC and governance policies across workflows and projects.  
  - That it provides production-grade observability or evaluation pipelines or is ready for multi-tenant deployment.
- **Potential novelty areas:**  
  - Unified control-plane design that treats multiple RAG patterns as first-class workflow types, with a shared schema and UI.  
  - Tight conceptual integration of admin RBAC, observability, and integration management within a RAG-specific system rather than a generic ML platform.
- **Experiments to strengthen publication quality:**  
  - Implement and evaluate real retrieval backends and LLM orchestration, comparing strategies quantitatively using Query Studio.  
  - Use `WorkflowRun` and `TaskExecution` records to analyze retrieval paths, latency, and hallucination proxies across architectures.  
  - Demonstrate the impact of RBAC and governance mechanisms on misconfiguration rates or security in realistic enterprise scenarios.  
  - Characterize scaling behavior and cost/latency tradeoffs across RAG architectures (vector, vectorless, graph, temporal, hybrid) using this control plane.

---

## 11. Gaps, Risks, and Red Flags

- Workflows are stored in-memory only; losing backend state resets all workflow definitions, undermining the control-plane role.  
- Frontend does not call backend auth or attach JWTs; backend does not enforce authentication or RBAC, leaving APIs open.  
- Secrets (JWT secret, Google Client ID) are stored in `.env` committed to the repo, inappropriate for production.  
- Governance and observability routers are not wired into actual operations; `log_action` is never used; audit logs and metrics are effectively empty.  
- RAG execution is stubbed; retrieval providers and integrations are unused by simulation endpoints.  
- Admin data uses in-memory stores despite SQLModel definitions, causing state loss and misleading enterprise readiness from the UI.  
- No automated tests or CI; any claims of robustness or correctness would be weak.  
- No deployment artifacts; operational behavior in real environments is uncharacterized.

---

## 12. Manuscript Support Pack

- **Project description:**  
  - RAG Studio is a web-based RAG control plane integrating workflow design, query simulation, integration management, and administrative governance into a single application.  
  - It is implemented as a React SPA backed by a FastAPI service with SQLModel-based persistence for core metadata and execution traces.
- **Architecture claims:**  
  - The backend exposes modular routers for workflows, projects, integrations, environments, authentication, and admin subsystems, each with dedicated Pydantic schemas and SQLModel entities.  
  - Workflow execution is represented by `WorkflowRun` and `TaskExecution` tables, which record each simulation request and associated metadata.  
  - Integrations and environments are decoupled, allowing environment-specific bindings via `integration_bindings`.
- **System capabilities (current):**  
  - A visual workflow builder lets users construct graph-based RAG workflows using a predefined set of node types.  
  - A query studio executes stubbed simulations and presents multi-strategy results and traces.  
  - An integrations hub provides CRUD operations for logical integrations and environments, plus a mapping UI.  
  - An admin console surfaces basic CRUD and observability views for users, roles, teams, views, preferences, sessions, and logs.
- **Implementation evidence:**  
  - FastAPI routers and React modules are connected through an Axios client and TanStack Query, demonstrating end-to-end flows for workflows, integrations, environments, and admin data.  
  - SQLModel is used to define and persist core entities in a PostgreSQL database.  
  - Feature-based frontend modules encapsulate concerns for workflow building, query simulation, admin, and integration management.
- **Enterprise relevance:**  
  - The data model includes entities for roles, teams, sessions, views, and user preferences that are typical in enterprise control planes.  
  - Observability and audit-log data structures are designed to trace activity and metrics within the system.
- **Current limitations:**  
  - RAG retrieval and LLM orchestration are not implemented; providers are stubbed and integrations are not used for execution.  
  - Workflows lack durable persistence; admin data and observability use in-memory stores.  
  - There is no effective end-to-end authentication and authorization enforcement.  
  - Evaluation and monitoring capabilities are not yet present beyond stubbed traces.  
  - No automated tests or deployment automation.
- **Future work candidates:**  
  - Implement a full RAG execution engine that interprets `WorkflowDefinition` graphs and orchestrates calls to LLMs and retrieval providers based on `IntegrationConfig`.  
  - Move workflows and admin entities to the database, aligning runtime behavior with SQLModel definitions.  
  - Integrate JWT and RBAC enforcement into routers and apply `Role.permissions` across the app.  
  - Wire domain events into `AuditLog` and `ObservabilityEvent` to enable meaningful observability.  
  - Add evaluation modules that log query sets, compute metrics, and support multi-strategy A/B tests with Query Studio as the UI front-end.

---

## 13. Appendix: File-Level Evidence Map

- **Top-level docs and configuration:**  
  - `README.md` – High-level vision, conceptual architecture, and roadmap.  
  - `AGENTS.md` – Internal agent guidance for frontend/backend architecture.  
  - `backend/requirements.txt` – Confirms FastAPI, SQLModel, SQLAlchemy, Postgres, requests, PyJWT.  
  - `frontend/package.json` – Confirms React 19, React Router, TanStack Query, Vite, ReactFlow.
- **Backend core:**  
  - `backend/main.py` – FastAPI app, router wiring, CORS, startup DB init, `/health`.  
  - `backend/db.py` – SQLModel engine and session helpers pointing to Postgres.  
  - `backend/models_core.py` – `Project`, `Integration`, `Environment`, `WorkflowRun`, `TaskExecution`.  
  - `backend/models_admin.py` – `Role`, `RolePermission`, `Team`, `TeamMember`, `User`, `Session`, `View`, `UserPreference`, `AuditLog`, `ObservabilityEvent`.  
  - `backend/repositories.py` – Repositories for projects, integrations, environments.  
  - `backend/retrieval.py` – Retrieval provider protocol and stub vector/lexical implementations.
- **Backend routers:**  
  - `backend/routers/auth.py` – Google ID token verification and JWT issuance.  
  - `backend/routers/projects.py` – DB-backed project list/create.  
  - `backend/routers/workflows.py` – In-memory workflow CRUD and simulation endpoints writing `WorkflowRun` and `TaskExecution`.  
  - `backend/routers/integrations.py` – Integration CRUD, `DELETE` not implemented.  
  - `backend/routers/environments.py` – Environment CRUD, `DELETE` not implemented.  
  - `backend/routers/governance.py` – Placeholder governance endpoints returning empty lists.  
  - `backend/routers/admin_users.py`, `admin_roles.py`, `admin_teams.py`, `admin_sessions.py`, `admin_views.py`, `admin_preferences.py`, `admin_observability.py` – In-memory admin and observability APIs.
- **Frontend core:**  
  - `frontend/src/main.tsx` – App bootstrap with `QueryClientProvider`.  
  - `frontend/src/App.tsx` – Routing, protected app shell, and nested routes.  
  - `frontend/src/api/client.ts` – Axios client and TanStack `QueryClient`.  
  - `frontend/.env` – Frontend Google client ID and API base URL.
- **Frontend auth and layout:**  
  - `frontend/src/modules/auth/AuthContext.tsx` – Google sign-in logic, auth state, and localStorage persistence.  
  - `frontend/src/modules/auth/LandingPage.tsx` – Landing page with Google sign-in CTA.  
  - `frontend/src/modules/auth/permissions.ts` – Permission helpers for RBAC.  
  - `frontend/src/modules/layout/AppShell.tsx` – Shell layout and navigation.
- **Frontend RAG features:**  
  - `frontend/src/api/workflows.ts` – Workflow CRUD client.  
  - `frontend/src/api/queryStudio.ts` – Workflow simulation client.  
  - `frontend/src/modules/workflow-builder/WorkflowBuilderPage.tsx` – Workflow builder UI and definition mapping.  
  - `frontend/src/modules/workflow-builder/WorkflowCanvas.tsx` – ReactFlow canvas.  
  - `frontend/src/modules/workflow-builder/modelMapping.ts` – Mapping between ReactFlow graphs and workflow models.  
  - `frontend/src/modules/workflow-builder/workflowTemplates.ts` – Vector/vectorless/graph/temporal/hybrid templates.  
  - `frontend/src/modules/workflow-builder/useWorkflowApi.ts` – Workflow CRUD hooks.  
  - `frontend/src/modules/workflow-builder/NodePalette.tsx` – Node type palette.  
  - `frontend/src/modules/query-studio/QueryStudioPage.tsx` – Query Studio UI.  
  - `frontend/src/modules/query-studio/TracePanels.tsx` – Trace visualization.
- **Frontend integrations & environments:**  
  - `frontend/src/api/integrations.ts` – Integrations client.  
  - `frontend/src/api/environments.ts` – Environments client.  
  - `frontend/src/modules/admin-integrations/IntegrationsHubPage.tsx` – Integrations Hub UI.  
  - `frontend/src/modules/admin-integrations/useIntegrationsEnvApi.ts` – Hooks for integrations and environments.  
  - `frontend/src/modules/admin-integrations/IntegrationWizard.tsx` – Integration creation/edit flow.
- **Frontend admin & observability:**  
  - `frontend/src/modules/admin-users/AdminUsersPage.tsx` – Users table.  
  - `frontend/src/modules/admin-roles/AdminRolesPage.tsx` – Roles list.  
  - `frontend/src/modules/admin-teams/AdminTeamsPage.tsx` – Teams list.  
  - `frontend/src/modules/admin-views/AdminViewsPage.tsx` – Views table.  
  - `frontend/src/modules/admin-preferences/AdminPreferencesPage.tsx` – Preferences UI.  
  - `frontend/src/modules/admin-observability/AdminObservabilityPage.tsx` – Observability metrics and audit log table.

