# RAGOS — RAG Orchestration Studio · Technical Dossier

> **Version:** 2.2 · March 2026  
> **Live site:** [ragorchestrationstudio.com](https://ragorchestrationstudio.com)  
> **Repository:** [github.com/KinshukON/RAGOrchestraionStudio](https://github.com/KinshukON/RAGOrchestraionStudio)

---

## 1. Executive Summary

**What this project is.**  
RAG Studio is a production-deployed, full-stack web application consisting of a React 19 + TypeScript SPA (served by Vercel CDN) and a FastAPI + SQLModel backend (hosted on Railway). It is a **control plane for Retrieval-Augmented Generation (RAG) architectures** — providing an architecture catalog, a multi-step guided designer, a visual workflow builder, a query simulation lab, an integrations and environments hub, dedicated governance and observability dashboards, and an enterprise admin console, all wired end-to-end with a PostgreSQL persistence layer (Supabase).

**What problem it solves.**  
It gives enterprise AI teams a **single pane of glass** to design, configure, simulate, and govern RAG pipelines across five retrieval paradigms (vector, vectorless, graph, temporal, hybrid). Rather than requiring teams to hand-code workflow orchestration, RAG Studio provides a graphical interface and a structured configuration model that produces `WorkflowDefinition` graphs ready for execution.

**Current stage.**  
The platform has advanced well beyond MVP into a **functional early-stage product**:

- Full **Designer → Builder → Query → Observe** end-to-end flow is implemented and deployed.
- Architecture templates and design sessions are **backed by PostgreSQL** via SQLModel repositories.
- The Guided Designer produces real `WorkflowDefinition` records in the database.
- Query Lab auto-selects the most recently generated workflow and environment, and supports run-history with live polling.
- All pages are **production-deployed** with a Vercel → Railway API proxy architecture.
- An **in-app user guide** with screenshots is available at `/app/guide` and as a downloadable PDF.

**Real vs aspirational.**

- **Real / Implemented:**
  - Google OAuth → JWT sign-in; `qc.clear()` post-OAuth fixes catalog auto-refresh; welcome toast on first sign-in.
  - Architecture Catalog (6 RAG types), DB-backed templates, demo auto-seeding, empty-state CTA.
  - Guided Designer: 6 architecture-specific step configurations, design-session persistence, workflow generation.
  - Visual Workflow Builder: ReactFlow canvas, deep per-node config, governance-gated + RBAC-gated + rate-limited Publish.
  - Query Lab: multi-strategy simulation, evidence cards, run history, citeable experiment IDs.
  - Integrations Studio: CRUD + live health dots from real test-connection endpoint.
  - Environments: 3-step promotion pipeline, governance-gated + RBAC-gated + rate-limited Promote.
  - Governance: policy definitions enforced at publish and promote time (not just advisory).
  - Observability: run history, trace analytics, global audit log.
  - **Full RBAC enforcement**: `require_permission()` on publish/promote endpoints; `useHasPermission()` gates Admin nav and Publish button.
  - **Session management admin**: per-user Sessions tab (Revoke / Revoke All) and Audit Log tab in Admin → Users.
  - **Rate limiting**: in-process sliding-window (10/min publish, 5/min promote), HTTP 429 + Retry-After.
  - **Audit write hooks**: `AuditLog` rows written on every publish (success + blocked) and every promote step.
  - **Collapsible sidebar**: hamburger toggle, 220px ↔ 56px, persisted to localStorage.
  - Enterprise admin console: Users (split-panel), Roles, Teams, Views, Preferences, Observability.
  - Enterprise UI system: ErrorBoundary, ToastContext, Skeleton loaders, EmptyState, SimBanner.
  - In-app User Guide + downloadable PDF.
  - Vercel + Railway deployment with API proxying.

- **Aspirational / Planned:**
  - Real RAG retrieval against vector/graph/temporal backends and live LLM orchestration.
  - Production approval workflows with multi-role human sign-off.
  - Multi-tenancy and organization-level scoping.
  - Automated CI/CD test suite.

---

## 2. Project Identity

| Attribute | Value |
|---|---|
| **Project name** | RAGOS — RAG Orchestration Studio |
| **One-sentence definition** | A browser-based control plane for designing, configuring, simulating, and governing retrieval-augmented generation workflows across vector, vectorless, graph, temporal, and hybrid paradigms. |
| **Primary domain** | Applied AI infrastructure / RAG orchestration systems |
| **Target users** | Enterprise AI architects, MLOps engineers, knowledge engineers, platform teams |
| **Frontend deployment** | Vercel CDN (SPA, `frontend/dist`) |
| **Backend deployment** | Railway (`ragorchestraionstudio-production.up.railway.app`) |
| **Database** | PostgreSQL via Supabase (SQLModel / SQLAlchemy) |
| **Maturity classification** | **Functional product** — full end-to-end flows deployed with RBAC enforcement, governance gates, rate limiting, session management, and audit trail; RAG execution remains simulated pending real API key wiring |

---

## 3. Evidence-Based Feature Inventory

**Legend:** **Implemented** = end-to-end usable, **Partial** = partially wired, **Placeholder** = scaffolded UI/API only, **Planned** = in docs only.

| Feature / Capability | Status | Key Files | Notes |
|---|---|---|---|
| SPA shell with sidebar navigation | Implemented | `App.tsx`, `AppShell.tsx` | 15+ nested routes under `/app`; sidebar organises Architecture, Query Lab, Integrations, Governance, Observability, Admin, and User Guide sections |
| Google OAuth sign-in (frontend + backend) | Implemented | `AuthContext.tsx`, `backend/routers/auth.py` | Google Identity Services on frontend; backend verifies ID token and issues JWT. Frontend now attaches token. |
| Protected routes + auth state | Implemented | `App.tsx`, `AuthContext.tsx` | `ProtectedRoute` guards `/app/**`; state in `localStorage` |
| **Architecture Catalog** | Implemented | `ArchitectureCatalogPage.tsx`, `backend/routers/architectures.py` | API-backed catalog of 6 RAG types (Vector, Vectorless, Graph, Temporal, Hybrid, Custom); each card shows description, when-to-use, strengths, tradeoffs; `demo.py` auto-seeds templates on startup |
| **Design session creation** | Implemented | `ArchitectureCatalogPage.tsx`, `api/architectures.ts` | "Design this architecture" creates a persisted `DesignSession` in Postgres and navigates to `/app/designer?sessionId=…` |
| **Guided Designer — architecture-specific forms** | Implemented | `DesignerPage.tsx`, `DesignerStepper.tsx`, `designerVector.tsx`, `designerVectorless.tsx`, `designerGraph.tsx`, `designerTemporal.tsx`, `designerHybrid.tsx`, `designerCustom.tsx` | 3-step wizard (Architecture profile → Retrieval & routing → Answering & governance); step groups are specific to each of the 6 architecture types; wizard state is saved to DB on every change |
| **Guided Designer → Workflow generation** | Implemented | `DesignerPage.tsx`, `wizardStateToWorkflowDefinition()` | "Generate workflow →" converts `DesignerWizardState` into a `WorkflowDefinition` via `createWorkflow`, then navigates directly to Workflow Builder with the new workflow ID |
| **Workflow Builder — deep node config** | Implemented | `WorkflowBuilderPage.tsx`, `WorkflowCanvas.tsx`, `NodePalette.tsx`, `NodeConfigPanel.tsx`, `ArchitectureSummaryPanel.tsx`, `workflow-builder.css` | ReactFlow canvas; **deep per-node config panel**: 11 node types each expose specialist parameter groups — chunking strategy (recursive/sentence/semantic/sliding window), chunk size/overlap sliders, embedding model spectrum, ANN algorithm (HNSW/IVFFlat/Exact/LSH), BM25 k1+b tuning, graph traversal algorithm (BFS/DFS/PPR/Beam), hop depth, temporal as-of strategy, LLM selection + temperature/top-P, guardrail checks (PII/toxicity/injection/hallucination), context merge strategy |
| Workflow CRUD API | Implemented (DB-backed) | `backend/routers/workflows.py` | `WorkflowDefinitionRecord` persisted in Postgres; `/runs` endpoint returns `WorkflowRun` history with `experiment_id`, `query`, `strategies_run`, `full_results`, `architecture_type` |
| **Query Lab** | Implemented | `QueryLabPage.tsx`, `QueryInputPanel.tsx`, `ResultComparisonGrid.tsx`, `RunHistoryPanel.tsx` | Evidence cards per strategy: citeable `exp-XXXXXX` experiment ID, latency bar, retrieved chunks with scores, retrieval path; searchable + exportable run history; 5-s auto-poll |
| **Evaluation Harness (Evidence Layer)** | Implemented | `modules/evaluation/EvaluationPage.tsx`, `backend/routers/evaluations.py` | 6 pre-seeded canonical enterprise benchmark queries; per-query execution across all active strategies; heuristic scoring (relevance, groundedness, completeness); 1–5 human rating override; JSON export for IEEE evidence appendices |
| **Research Assistant (Evidence Layer)** | Implemented | `modules/research-assistant/ResearchAssistantPage.tsx` | Rule-based conversational interface for querying stored `WorkflowRun` data; suggestion pills (summarise, compare latency, methodology, deep-dive report); ad-hoc free-form queries; no external LLM dependency |
| **Demo auto-seed + admin promotion** | Implemented | `backend/routers/demo.py` | Seeds architecture templates, roles, teams, users, integrations, environments, projects, workflows, governance; **promotes any user matching `kinshuk` in email to Platform Admin** on every seed call |
| **UI System — Error Boundaries** | Implemented | `ErrorBoundary.tsx` | Wraps every `<Page>` component; captures and surfaces render errors gracefully |
| **UI System — Toast Notifications** | Implemented | `ToastContext.tsx` | `useToast()` provides `success()`, `error()`, `info()` toasts consumed throughout the app |
| **UI System — Skeleton Loaders** | Implemented | `Skeleton.tsx` | `SkeletonBar`, `SkeletonCard`, `PageSkeleton` used in Catalog, Designer, and other data-loading states |
| **UI System — Feedback components** | Implemented | `feedback.tsx` | `PageHeader`, `EmptyState`, `LoadingMessage` reusable components |
| **In-App User Guide** | Implemented | `UserGuidePage.tsx`, `user-guide.css` | `/app/guide` route; two-column layout with sticky TOC, flow banner, screenshots from `/guide-images/`, step badges, callout boxes; accessible via header help button |
| **PDF User Guide** | Implemented | `frontend/public/user-guide.pdf`, `scripts/generate-user-guide-pdf.js` | Pre-generated PDF with cover page, TOC, all 11 sections, 14 screenshots, page numbers; served from Vercel CDN; "Download PDF" button in guide header |
| Help icon in app header | Implemented | `AppShell.tsx`, `layout.css` | Question-mark button links to `/app/guide`; active state when on guide page; breadcrumb shows "User Guide" |
| RBAC permission model (backend) | **Implemented** | `backend/auth_middleware.py`, `backend/routers/workflows.py`, `backend/routers/environments.py` | `require_permission(key)` FastAPI dependency factory; enforced on `POST /workflows/{id}/publish` (`publish_workflows`) and `POST /environments/{id}/promote` (`approve_promotions`); 403 on failure |
| RBAC helpers (frontend) | **Implemented** | `AuthContext.tsx` | `useHasPermission(key)` hook; gates Admin nav section (`administer_platform`), Publish button disabled state (`publish_workflows`) |
| **Rate limiting** | **Implemented** | `backend/rate_limit.py` | In-process sliding-window per `(user_id, endpoint)`; 10/min on publish, 5/min on promote; HTTP 429 + `Retry-After` header; thread-safe, no external deps |
| **Audit write hooks** | **Implemented** | `backend/routers/workflows.py`, `backend/routers/environments.py` | `AuditLog` row written on every publish (action: `workflow.published` or `workflow.publish_blocked`) and every promote step (`environment.promoted`, includes `from_status` + `to_status`) |
| **Session management admin UI** | **Implemented** | `AdminUsersPage.tsx`, `admin.css` | Two-panel split layout: user list on left, detail panel on right with Sessions tab (active/revoked, Revoke / Revoke All buttons) and Audit Log tab (50 most recent events, expandable JSON details) |
| **Collapsible sidebar** | **Implemented** | `AppShell.tsx`, `layout.css` | Hamburger toggle; 220px expanded ↔ 56px icon-only collapsed; state persisted to `localStorage` |
| **Integrations live health** | **Implemented** | `IntegrationsStudioPage.tsx`, `backend/routers/integrations.py` | `POST /{id}/test-connection` returns real health status; health dots (🟢/🔴/⚪) update in UI |
| **Environments promotion pipeline** | **Implemented** | `EnvironmentsPage.tsx`, `backend/routers/environments.py` | 3-step pipeline (`draft → pending → promoted`); final step governance-gated + RBAC-gated + rate-limited; AuditLog on success |
| **Sign-in auto-refresh + welcome** | **Implemented** | `LandingPage.tsx`, `AppShell.tsx` | `qc.clear()` after OAuth resolves (fixes stale catalog); welcome toast fires once per sessionStorage session after sign-in |
| PostgreSQL persistence | Implemented | `backend/db.py` | Supabase Postgres via SQLModel; `create_all` at startup; `?supa=` pool parameter stripped for psycopg2 compatibility |
| Evaluation pipelines | Partial | `backend/routers/evaluations.py`, `api/evaluations.ts` | Test-case saving wired; no metrics computation, A/B test UI, or evaluation dashboard |
| Monitoring dashboards | Planned | `README.md` | No frontend module or fully implemented backend routes |
| Multi-tenancy | Planned / conceptual | `models_core.py` | `Project` model exists; no org/tenant scoping enforced |
| Containerization / CI | Not present | — | No Dockerfile, compose, or CI config; Vercel + Railway handle deployment |
| Automated testing | Not present | — | No pytest or frontend test files |

---

## 4. Architecture Analysis

### 4.1 System Topology

```
Browser (Vercel CDN)
  └─ React 19 SPA  ─────────────────────┐
                                         │  HTTPS /api/* proxy
                                       Vercel Rewrite
                                         │
             Railway (FastAPI)  ─────────┘
               └─ PostgreSQL (Supabase)
```

`vercel.json` rewrites `/api/:path*` to the Railway backend URL, and `/(.*)`  to `/index.html` for SPA deep-linking. The frontend is built with `cd frontend && npm run build` and served from `frontend/dist`.

### 4.2 Frontend Architecture

- **Framework & tooling:** React 19, TypeScript, Vite. TanStack Query for data fetching/caching. ReactFlow for the workflow canvas.
- **Routing:** React Router v6; 15+ nested routes under `/app`:
  - `/app` → Architecture Catalog (default landing after auth)
  - `/app/designer` → Guided Designer (receives `?sessionId=` from Catalog)
  - `/app/workflow-builder` → Workflow Builder (receives `?workflowId=` from Designer)
  - `/app/query-lab` → Query Lab
  - `/app/query-studio` → Legacy Query Studio (kept for compatibility)
  - `/app/integrations`, `/app/environments` → Integrations Studio, Environments
  - `/app/governance`, `/app/observability` → Governance, Observability
  - `/app/admin/*` → Admin console pages
  - `/app/guide` → In-app User Guide
- **Authentication flow:** `AuthContext` handles Google Identity Services sign-in, stores ID token and user metadata in `localStorage`, provides `useAuth()` hook and `ProtectedRoute` wrapper.
- **UI system:** Fully standardised — `ErrorBoundary` wraps every page, `ToastProvider` wraps the app root, `Skeleton` / `feedback` components provide consistent loading and empty states.
- **Module structure:** Feature-based under `frontend/src/modules/**`; each module owns its pages, hooks, CSS, and API calls.
- **API client:** Axios instance (`api/client.ts`) pointing to `VITE_API_BASE_URL`; TanStack `QueryClient` for cache management.

### 4.3 Backend Architecture

- **Framework:** FastAPI in `backend/main.py`; CORS wide-open; `redirect_slashes=False` + clients strip trailing slashes to prevent 307 redirects through the Vercel proxy.
- **Routers:**

| Router | Path prefix | Persistence | Notes |
|---|---|---|---|
| `auth` | `/api/auth` | — | Google ID token → JWT; backend JWT now consumed |
| `architectures` | `/api/architectures` | DB (Postgres) | `ArchitectureTemplate`, `DesignSession`; demo auto-seeded |
| `workflows` | `/api/workflows` | DB (Postgres) | `WorkflowDefinitionRecord`, `WorkflowRun`, `TaskExecution`; `POST /{id}/publish` RBAC + governance gate + rate limit |
| `projects` | `/api/projects` | DB (Postgres) | Project metadata |
| `integrations` | `/api/integrations` | DB (Postgres) | Connector configs + `POST /{id}/test-connection` |
| `environments` | `/api/environments` | DB (Postgres) | Environment configs; `POST /{id}/promote` RBAC + governance gate + rate limit + AuditLog |
| `evaluations` | `/api/evaluations` | DB (Postgres) | Test-case persistence |
| `governance` | `/api/governance` | DB (Postgres) | `GovernancePolicy`, `ApprovalRule`, `GovernanceBinding` |
| `observability` | `/api/observability` | DB (Postgres) | Run traces and metrics |
| `admin_users` | `/api/admin/users` | DB (Postgres) | CRUD + `POST /bootstrap` |
| `admin_roles` | `/api/admin/roles` | DB (Postgres) | Role + permissions JSON |
| `admin_teams` | `/api/admin/teams` | DB (Postgres) | Team management |
| `admin_sessions` | `/api/admin/sessions` | DB (Postgres) | Session CRUD; `PATCH /{id}/revoke`; `DELETE /by-user/{uid}` |
| `admin_views` | `/api/admin/views` | DB (Postgres) | View upsert-by-key |
| `admin_preferences` | `/api/admin/preferences` | DB (Postgres) | Per-user preferences |
| `admin_observability` | `/api/admin/observability` | DB (Postgres) | `GET /audit-logs` (filterable); `POST /audit-logs`; `GET/POST /events` |
| `demo` | `/api/demo` | DB writes | Full idempotent seed including AuditLog + ObservabilityEvent samples |

- **Persistence:** SQLModel `create_all` at startup. Supabase connection strings with `?supa=` parameter stripped for psycopg2 compatibility. Schema migrations applied via one-off `ALTER TABLE` scripts.
- **No background workers, queues, or event streaming** in the current implementation.

### 4.4 End-to-End Feature Flows

**Primary flow — Design to Query:**
```
Architecture Catalog  (/app)
  ├─ User clicks "Design this architecture"
  ├─ POST /api/architectures/sessions  (creates DesignSession in DB)
  └─ Navigate to /app/designer?sessionId=<id>
       └─ Guided Designer
            ├─ Architecture-specific step forms prefilled from session
            ├─ PATCH /api/architectures/sessions/<id>  (saves wizard_state on each change)
            └─ "Generate workflow →"
                 ├─ POST /api/workflows  (WorkflowDefinitionRecord in DB)
                 └─ Navigate to /app/workflow-builder?workflowId=<id>
                      └─ Workflow Builder (ReactFlow canvas)
                           ├─ PUT /api/workflows/<id>  (Save Draft)
                           └─ PUT /api/workflows/<id>/publish  (Publish)
                               └─ Query Lab  (/app/query-lab)
                                    ├─ GET /api/workflows  (auto-selects latest)
                                    ├─ GET /api/environments
                                    ├─ POST /api/workflows/<id>/simulate-multi
                                    ├─ POST /api/evaluations  (save test case)
                                    └─ GET /api/workflows/runs  (run history, 5s poll)
```

### 4.5 Data Flow

- **Front-to-back:** React hooks call `apiClient` → FastAPI routers → Postgres (for DB-backed entities) or in-memory dicts (admin/governance).
- **Simulation:** Query Lab posts `MultiStrategySimulationRequest`; backend runs `simulate_workflow` writing `WorkflowRun` + `TaskExecution`; returns `WorkflowSimulationTrace` with synthetic latency/confidence per strategy.
- **Demo seed:** On backend startup, `demo.py` checks if `ArchitectureTemplate` table is empty and inserts 6 templates, ensuring zero-config demo readiness.

### 4.6 Deployment Architecture

| Layer | Service | Notes |
|---|---|---|
| Frontend | Vercel | SPA; `vercel.json` rewrites `/api/*` and SPA fallback |
| Backend | Railway | FastAPI; always-on dyno; env vars for DB + auth |
| Database | Supabase (Postgres) | Connection pooling via `DATABASE_URL`; pooler param stripped |
| Static assets | Vercel CDN | `frontend/public/` including `guide-images/*.png` and `user-guide.pdf` |
| Domain | Vercel custom domain | `ragorchestrationstudio.com` |

---

## 5. AI / LLM / RAG-Specific Analysis

### 5.1 Retrieval Modes & Storage Backends

Six RAG architecture types are modeled as first-class entities:

| Architecture | Frontend designer | Workflow node type | Retrieval implementation |
|---|---|---|---|
| Vector RAG | `designerVector.tsx` | `vector_retriever` | Stub (empty list) |
| Vectorless RAG | `designerVectorless.tsx` | `lexical_retriever` | Stub (empty list) |
| Graph RAG | `designerGraph.tsx` | `graph_retriever` | Stub (empty list) |
| Temporal RAG | `designerTemporal.tsx` | `temporal_filter` | Stub (empty list) |
| Hybrid RAG | `designerHybrid.tsx` | Composite | Stub |
| Custom RAG | `designerCustom.tsx` | Configurable | Stub |

Retrieval modes are **designed and configurable** but execution against live backends is pending.

### 5.2 Guided Designer Configuration Model

Each architecture type exposes a specific `DesignerStepGroups` configuration covering:

- **Architecture profile:** data source type, chunking strategy, embedding model, vector/graph database selection
- **Retrieval & routing:** similarity metric, Top-K, metadata filters, reranker
- **Answering & governance:** answer generation model, fallback strategy

Wizard state is typed (`DesignerWizardState`, `ArchitectureConfig`, `VectorRagConfig`, etc.) and serialized to `DesignSession.wizard_state` in Postgres. `wizardStateToWorkflowDefinition()` converts it into a `WorkflowDefinition` object.

### 5.3 Orchestration Model

- `WorkflowDefinition` encodes the pipeline as a directed graph of typed `WorkflowNode` objects connected by `WorkflowEdge` records.
- `NodeType` enum covers: `input`, query classifiers, `vector_retriever`, `lexical_retriever`, `graph_retriever`, `temporal_filter`, `hybrid_retriever`, `metadata_filter`, `reranker`, `prompt_constructor`, `answer_generator`, `evaluator`, `guardrail`, `fallback`, `output_formatter`.
- No node-by-node execution engine exists yet; simulation produces a single synthetic `WorkflowSimulationTrace`.

### 5.4 Query Lab & Evaluation

- Query Lab replaces the legacy Query Studio as the primary simulation interface.
- Supports multi-strategy comparison (vector, vectorless, hybrid by default).
- `saveTestCase` persists query + results as an evaluation seed record via `POST /api/evaluations`.
- Run history auto-polls every 5 seconds, enabling near-real-time monitoring of workflow executions.
- No quantitative evaluation metrics (RAGAS scores, faithfulness, etc.) are computed yet.

### 5.5 Governance & Observability

- **Governance page:** Rule-based policy UI scaffolded; backend returns empty lists for approvals and audit entries.
- **Observability page:** Dedicated page for workflow run metrics and execution traces (separate from admin observability).
- **Admin observability:** In-memory `AuditLog` and `ObservabilityEvent` with `/metrics` endpoint; `log_action` helper defined but not wired to business events.
- **No external observability tooling** (OpenTelemetry, Datadog, etc.) is integrated.

### 5.6 Provider Abstraction

- `IntegrationCategory` enumerates: LLM providers (OpenAI, Anthropic, Cohere), embeddings, rerankers, vector DBs (pgvector, Pinecone, Weaviate, Qdrant), graph DBs (Neo4j, Neptune, ArangoDB), SQL DBs, document sources (S3, GCS, SharePoint), logging/monitoring.
- `IntegrationConfig` stores `provider_type` and a `credentials_reference`.
- No code maps integration records to concrete provider clients at runtime.

---

## 6. UI / UX Surface Area

The application surface has grown substantially since v1:

| Page / Section | Route | Status |
|---|---|---|
| Landing page | `/` | Implemented — marketing hero with Google sign-in CTA, feature highlights |
| Architecture Catalog | `/app` | Implemented — 6 illustrated RAG type cards, "Design this architecture" CTA |
| Guided Designer | `/app/designer` | Implemented — 3-step wizard, architecture-specific forms, session persistence |
| Workflow Builder | `/app/workflow-builder` | Implemented — ReactFlow canvas, node palette, config panel, architecture summary |
| Query Lab | `/app/query-lab` | Implemented — full simulation UI, run history, test-case saving |
| Query Studio (legacy) | `/app/query-studio` | Kept — original simulation UI still accessible |
| Integrations Studio | `/app/integrations` | Implemented — connector table, environment binding, wizard modal |
| Environments | `/app/environments` | Implemented — environment list/create/configure |
| Governance | `/app/governance` | Placeholder — policy UI scaffolded, backend returns empty lists |
| Observability | `/app/observability` | Implemented — run metrics and trace dashboard |
| Admin: Users/Roles/Teams/Views/Prefs | `/app/admin/*` | Implemented — tabular views, limited mutating controls |
| Admin: Observability | `/app/admin/observability` | Implemented — in-memory audit log and metrics |
| User Guide | `/app/guide` | Implemented — in-app guide with screenshots, sticky TOC, flow banner |
| PDF download | `/user-guide.pdf` | Implemented — 14-screenshot branded PDF served from CDN |

**UI system quality:** Enterprise-grade. Every page is wrapped in an `ErrorBoundary`; all async operations show `Skeleton` loaders; all mutations surface `Toast` notifications; `EmptyState` and `LoadingMessage` components prevent blank screens.

---

## 7. API and Integration Inventory

### Internal APIs (FastAPI on Railway)

| Endpoint | Method(s) | Persistence | Status |
|---|---|---|---|
| `/health` | GET | — | Implemented |
| `/api/auth/google` | POST | — | Implemented |
| `/api/architectures/catalog` | GET | DB | Implemented |
| `/api/architectures/sessions` | GET, POST | DB | Implemented |
| `/api/architectures/sessions/{id}` | GET, PATCH | DB | Implemented |
| `/api/projects/` | GET, POST | DB | Implemented |
| `/api/workflows/` | GET, POST | DB | Implemented |
| `/api/workflows/{id}` | GET, PUT, DELETE | DB | Implemented |
| `/api/workflows/{id}/simulate` | POST | DB (WorkflowRun, TaskExecution) | Implemented (stub) |
| `/api/workflows/{id}/simulate-multi` | POST | DB | Implemented (stub) |
| `/api/workflows/{id}/publish` | PUT | DB | Implemented |
| `/api/workflows/runs` | GET | DB | Implemented |
| `/api/integrations/` | GET, POST, PUT | DB | Implemented |
| `/api/integrations/{id}` | GET, DELETE (501) | DB | Partial |
| `/api/environments/` | GET, POST, PUT | DB | Implemented |
| `/api/environments/{id}` | GET, DELETE (501) | DB | Partial |
| `/api/evaluations/` | GET, POST | DB | Partial |
| `/api/governance/approvals` | GET | — | Placeholder (empty) |
| `/api/governance/audit-logs` | GET | — | Placeholder (empty) |
| `/api/observability/…` | GET | In-memory | Implemented |
| `/api/admin/users` | GET, POST, PATCH | In-memory | Implemented |
| `/api/admin/roles` | GET, POST, PATCH | In-memory | Implemented |
| `/api/admin/teams` | GET, POST, PATCH | In-memory | Implemented |
| `/api/admin/sessions` | GET, POST, DELETE | In-memory | Implemented |
| `/api/admin/views` | GET, POST, PATCH | In-memory | Implemented |
| `/api/admin/preferences/me` | GET, PATCH | In-memory | Implemented |
| `/api/admin/observability/audit-logs` | GET | In-memory | Implemented |
| `/api/admin/observability/metrics` | GET | In-memory | Implemented |
| `/api/demo/seed` | POST | DB | Implemented |

### External Services

| Service | Purpose | Auth |
|---|---|---|
| Google Identity Services | Frontend OAuth sign-in | Client ID via `VITE_GOOGLE_CLIENT_ID` |
| Google tokeninfo endpoint | Backend ID token verification | — |
| Supabase (Postgres) | Core data persistence | `DATABASE_URL` env var |
| Vercel | SPA hosting + API proxy | Vercel team/project |
| Railway | FastAPI hosting | Railway service env vars |

---

## 8. Data Model and Persistence

### Core Entities (DB-backed via Postgres)

| Entity | Key fields | Purpose |
|---|---|---|
| `ArchitectureTemplate` | `type`, `title`, `short_definition`, `when_to_use`, `strengths`, `tradeoffs`, `typical_stack` | RAG pattern catalog entries; seeded by `demo.py` |
| `DesignSession` | `architecture_type`, `wizard_state` (JSON), `status` | Persisted Guided Designer state; links to `WorkflowDefinitionRecord` on generation |
| `WorkflowDefinitionRecord` | `name`, `architecture_type`, `definition` (JSON), `status`, `project_id` | Versioned workflow definitions produced by the Designer or Builder |
| `Project` | `name`, `architecture_type`, `project_id` | Top-level project metadata |
| `Integration` | `provider_type`, `category`, `config`, `environment_id` | Connector definitions with credential references |
| `Environment` | `name`, `type`, `integration_bindings` | Deployment environment configs |
| `WorkflowRun` | `workflow_id`, `project_id`, `environment_id`, `status`, `simulation_result` | Execution record for each simulation |
| `TaskExecution` | `workflow_run_id`, `node_type`, `status`, `input_payload`, `output_payload` | Per-node execution detail |
| `EvaluationCase` | `workflow_id`, `query`, `strategies`, `results` | Saved test case from Query Lab |

### Admin Entities (SQLModel-defined, in-memory at runtime)

`Role`, `RolePermission`, `Team`, `TeamMember`, `User`, `Session`, `View`, `UserPreference`, `AuditLog`, `ObservabilityEvent` — fully modeled in SQLModel; admin routers use in-memory dicts rather than the DB.

### Static Assets (Vercel CDN)

| Asset | Path | Description |
|---|---|---|
| Guide screenshots | `/guide-images/*.png` (14 images) | Used in the in-app User Guide |
| User Guide PDF | `/user-guide.pdf` | Pre-generated via puppeteer; branded A4 document |

---

## 9. Implementation Maturity Assessment

| Dimension | Rating | Notes |
|---|---|---|
| **Architecture** | Moderate–Strong | Clean frontend module and backend router separation; Vercel+Railway deployment is solid; missing service layer and RBAC enforcement |
| **Code organisation** | Strong | Feature-based frontend modules; well-structured backend (models_core, models_admin, repositories, routers); designer step logic cleanly separated by architecture type |
| **Deployment** | Moderate | Vercel + Railway + Supabase is a real production stack; no IaC or Dockerfile; no CI/CD pipeline |
| **Documentation** | Strong | README, architecture.md, user-guide.md, PDF guide, and this dossier; in-app guide with screenshots |
| **Testing** | Not present | No pytest or frontend tests; no CI workflow |
| **Security** | Weak–Moderate | Backend JWT now consumed by frontend; endpoints still not enforcing auth/RBAC; CORS wide-open; secrets in env vars (Vercel/Railway manage these, not `.env` in repo) |
| **Observability** | Partial | In-memory audit log and metrics; run-history in DB; no external telemetry stack |
| **Scalability** | Weak | Synchronous DB; in-memory admin stores; single Railway dyno; no queuing |
| **Enterprise-readiness** | Moderate | Full admin console, role model, policy scaffolding, and governance UI; enforcement is scaffolded only |
| **Feature completeness** | Moderate | End-to-end Design → Build → Query flow works; RAG execution is stubbed; evaluation pipelines are seed-only |

---

## 10. Research Contribution Potential

**Defensible current contributions:**
- An integrated platform that combines an architecture catalog, a guided multi-step designer, a visual workflow builder, a multi-strategy simulation lab, and an admin/governance console in a single deployable product.
- A rich, typed schema for RAG workflows (`WorkflowDefinition`, `NodeType`, `WorkflowRun`, `TaskExecution`, `DesignSession`) suitable for empirical study of RAG orchestration patterns.
- A practitioner-oriented designer that makes six RAG paradigm-specific configuration models (vector, vectorless, graph, temporal, hybrid, custom) accessible through a guided wizard — lowering the barrier to entry for enterprise RAG adoption.
- A real-world deployment architecture (Vercel + Railway + Supabase) demonstrating the viability of cloud-native RAG control planes at low operational cost.

**Contributions that need more evidence:**
- Multi-strategy simulation and comparison: currently based on synthetic latency/confidence; real retrieval would make results publishable.
- Enterprise governance: policy model and approval scaffolding exist but are not enforced.

**Claims to avoid:**
- That the system performs live RAG retrieval against vector/graph/temporal backends.
- That it enforces RBAC or governance policies on real operations.
- That evaluation metrics are empirically grounded.

**Directions to strengthen:**
- Wire real LLM + retrieval backends to Query Lab strategies and collect latency/faithfulness/hallucination metrics across all six architectures.
- Apply `WorkflowRun` and `TaskExecution` traces to analyze retrieval path distributions and bottlenecks at scale.
- Collect user studies on the Guided Designer's effectiveness in reducing RAG misconfiguration compared to hand-coding.

---

## 11. Gaps, Risks, and Known Limitations

| Gap | Risk level | Notes |
|---|---|---|
| RAG execution stubbed | High | All simulation results are synthetic; Query Lab cannot produce real evaluation data |
| RBAC not enforced | High | All API endpoints are open; admin stores use trusted query params for user identity |
| Admin data in-memory | Medium | Users, roles, teams, etc. reset on backend restart; SQLModel definitions are unused |
| Governance endpoints empty | Medium | `log_action` is never called; audit logs and approval gates are non-functional |
| DELETE not implemented | Low | Integrations and environments cannot be deleted via API (501) |
| No automated tests | Medium | No regression safety net; correctness claims are unverifiable |
| No CI/CD | Low | Deployments are manual pushes to `main`; Railway/Vercel auto-deploy from GitHub |
| No IaC | Low | Infrastructure configuration exists only in Vercel dashboard and Railway settings |

---

## 12. Manuscript Support Pack

**Project description:**  
RAG Studio is a production-deployed, browser-based control plane for enterprise RAG orchestration. It integrates an architecture catalog (6 RAG types), a 6-configuration guided designer, a visual node-based workflow builder, a multi-strategy query simulation lab, an integrations and environments hub, governance and observability dashboards, and an enterprise admin console into a single application. The frontend is a React 19 SPA hosted on Vercel; the backend is a FastAPI service on Railway backed by a Supabase PostgreSQL database.

**Key architectural claims (evidence-backed):**
- End-to-end flow from architecture selection through guided configuration to workflow definition generation is implemented and deployed.
- Design sessions and workflow definitions are persisted in Postgres via SQLModel, enabling design-state recovery across sessions.
- Architecture-specific designer configurations cover six RAG paradigms at the field level (data source, chunking, embedding model, vector DB, similarity metric, Top-K, reranker, LLM, fallback strategy).
- Workflow Builder uses ReactFlow to render typed node graphs; Save/Publish actions persist definitions to the database.
- Query Lab auto-selects the latest workflow and environment, supports multi-strategy simulation, and saves test cases as evaluation seeds.

**System capabilities (current):**
- Architecture Catalog: discover and compare six RAG patterns with structured strengths/tradeoff metadata.
- Guided Designer: configure a RAG pipeline step-by-step with architecture-specific form groups; generate a saved `WorkflowDefinition`.
- Workflow Builder: visually inspect and edit the generated node graph; publish workflows to make them available in Query Lab.
- Query Lab: simulate multi-strategy queries, compare results side-by-side, review run history, save test cases.
- Integrations Studio: register LLM, vector DB, and source connectors; bind them to environments.
- Environments: manage dev/staging/prod deployment targets.
- Governance: rule policy UI (scaffolded for approval-gate workflows).
- Observability: workflow run metrics and trace views.
- Admin: full RBAC entity management (users, roles, teams, views, preferences, sessions).
- User Guide: in-app guide with screenshots and downloadable branded PDF.

**Current limitations:**
- RAG retrieval and LLM orchestration are not executed; providers return stub responses.
- RBAC and governance policies are modeled but not enforced on API calls or frontend rendering.
- Admin entities (users, roles, teams) use in-memory stores; data resets on restart.
- No evaluation metrics beyond test-case record persistence.
- No automated test suite or CI/CD pipeline.

---

## 13. Appendix: File-Level Evidence Map

### Deployment & Configuration
- `vercel.json` — Vercel build config: `cd frontend && npm run build`, output `frontend/dist`, API proxy to Railway, SPA fallback.
- `backend/requirements.txt` — FastAPI, SQLModel, SQLAlchemy, psycopg2-binary, requests, PyJWT.
- `frontend/package.json` — React 19, React Router, TanStack Query, Vite, ReactFlow.

### Backend Core
- `backend/main.py` — FastAPI app, all router wiring, CORS, `redirect_slashes=False`, startup DB init and demo seed.
- `backend/db.py` — SQLModel engine (Supabase Postgres, pool param stripping), `get_session` dependency.
- `backend/models_core.py` — `Project`, `Integration`, `Environment`, `WorkflowDefinitionRecord`, `WorkflowRun`, `TaskExecution`, `ArchitectureTemplate`, `DesignSession`.
- `backend/models_admin.py` — `Role`, `RolePermission`, `Team`, `TeamMember`, `User`, `Session`, `View`, `UserPreference`, `AuditLog`, `ObservabilityEvent`.
- `backend/repositories.py` — Repositories for projects, integrations, environments.
- `backend/retrieval.py` — `RetrievalProvider` protocol; stub vector/lexical implementations.

### Backend Routers
- `backend/routers/auth.py` — Google ID token verification, JWT issuance.
- `backend/routers/architectures.py` — `ArchitectureTemplate` catalog and `DesignSession` CRUD.
- `backend/routers/demo.py` — 6-template seeder.
- `backend/routers/projects.py` — DB-backed project CRUD.
- `backend/routers/workflows.py` — DB-backed workflow CRUD, simulate/simulate-multi, runs list, publish.
- `backend/routers/integrations.py` — DB-backed integrations CRUD.
- `backend/routers/environments.py` — DB-backed environments CRUD.
- `backend/routers/evaluations.py` — Test-case persistence.
- `backend/routers/governance.py` — Placeholder approvals/audit-logs.
- `backend/routers/observability.py` — Observability metrics and trace views.
- `backend/routers/admin_*.py` — In-memory admin entity APIs.

### Frontend Core
- `frontend/src/main.tsx` — App bootstrap with `QueryClientProvider`.
- `frontend/src/App.tsx` — Routing (15+ routes), `ToastProvider`, `AuthProvider`, `ErrorBoundary` per page.
- `frontend/src/api/client.ts` — Axios client and TanStack `QueryClient`.
- `frontend/src/api/architectures.ts` — Catalog and design-session API calls.
- `frontend/src/api/workflows.ts` — Workflow CRUD, simulate, run-list.
- `frontend/src/api/integrations.ts`, `environments.ts`, `evaluations.ts` — Feature API calls.

### Frontend Auth & Layout
- `frontend/src/modules/auth/AuthContext.tsx` — Google sign-in, auth state, localStorage.
- `frontend/src/modules/auth/LandingPage.tsx` — Marketing landing page with Google CTA.
- `frontend/src/modules/auth/permissions.ts` — RBAC helpers.
- `frontend/src/modules/layout/AppShell.tsx` — Shell layout, sidebar nav (all sections), help-icon header button.
- `frontend/src/modules/layout/layout.css` — Layout tokens, shell styles, header-right flex, help button.

### Frontend UI System
- `frontend/src/modules/ui/ErrorBoundary.tsx` — Section-labelled error boundaries.
- `frontend/src/modules/ui/ToastContext.tsx` — Toast notification provider and `useToast` hook.
- `frontend/src/modules/ui/Skeleton.tsx` — `SkeletonBar`, `SkeletonCard`, `PageSkeleton`.
- `frontend/src/modules/ui/feedback.tsx` — `PageHeader`, `EmptyState`, `LoadingMessage`.

### Frontend Feature Modules
- `frontend/src/modules/architecture-catalog/ArchitectureCatalogPage.tsx` — Catalog UI.
- `frontend/src/modules/guided-designer/DesignerPage.tsx` — Designer orchestrator.
- `frontend/src/modules/guided-designer/DesignerStepper.tsx` — Step navigation component.
- `frontend/src/modules/guided-designer/designer{Vector,Vectorless,Graph,Temporal,Hybrid,Custom}.tsx` — Architecture-specific step groups.
- `frontend/src/modules/workflow-builder/WorkflowBuilderPage.tsx` — Builder orchestrator.
- `frontend/src/modules/workflow-builder/WorkflowCanvas.tsx` — ReactFlow canvas.
- `frontend/src/modules/workflow-builder/NodePalette.tsx` — Drag-and-drop node types.
- `frontend/src/modules/workflow-builder/NodeConfigPanel.tsx` — Per-node configuration panel.
- `frontend/src/modules/workflow-builder/ArchitectureSummaryPanel.tsx` — Architecture context panel.
- `frontend/src/modules/query-lab/QueryLabPage.tsx` — Query Lab orchestrator.
- `frontend/src/modules/query-lab/QueryInputPanel.tsx` — Query form and strategy selector.
- `frontend/src/modules/query-lab/ResultComparisonGrid.tsx` — Multi-strategy result cards.
- `frontend/src/modules/query-lab/RunHistoryPanel.tsx` — Live-polled run history.
- `frontend/src/modules/integrations-studio/IntegrationsStudioPage.tsx` — Integrations Hub UI.
- `frontend/src/modules/environments/EnvironmentsPage.tsx` — Environments UI.
- `frontend/src/modules/governance/GovernancePage.tsx` — Governance policy UI.
- `frontend/src/modules/observability/ObservabilityPage.tsx` — Observability dashboard.
- `frontend/src/modules/user-guide/UserGuidePage.tsx` — In-app User Guide.
- `frontend/src/modules/user-guide/user-guide.css` — Guide styles including print/PDF media rules.

### Docs & Scripts
- `docs/user-guide.md` — Markdown source for the user guide.
- `docs/architecture.md` — Architecture reference.
- `docs/rag-studio-technical-dossier.md` — This document.
- `scripts/generate-user-guide-pdf.js` — Puppeteer script to regenerate `user-guide.pdf` from HTML.
- `frontend/public/guide-images/` — 14 PNG screenshots (landing, catalog rows, designer steps, workflow builder, query lab, integrations, environments, governance, observability, admin users).
- `frontend/public/user-guide.pdf` — Pre-generated PDF; served by Vercel CDN; downloaded as "RAG Orchestration Studio - User Guide.pdf".
