# RAGOS — Architecture & Module Reference

> **Live site:** [ragorchestrationstudio.com](https://ragorchestrationstudio.com)  
> **Frontend:** Vercel CDN (`frontend/dist` — `vercel.json` rewrites `/api/*` to Railway, `/(.*) → /index.html`)  
> **Backend:** Railway (`ragorchestraionstudio-production.up.railway.app`)  
> **Database:** Supabase PostgreSQL (SQLModel / psycopg2; `?supa=` pooler param stripped in `db.py`)

---

## 1. End-to-End Flow

```
Architecture Catalog
  │  POST /api/architectures/design-sessions  →  DesignSession (draft)
  ▼
Guided Designer   (per-arch wizard: vector / vectorless / graph / temporal / hybrid / custom)
  │  PATCH /api/architectures/design-sessions/{id}  →  wizard_state persisted
  │
  │  [Generate Workflow →]
  │    wizardStateToWorkflowDefinition()   ← designerToWorkflow.ts
  │    POST /api/workflows                 →  WorkflowDefinition (DB, is_active=false)
  │    navigate /app/workflow-builder?workflowId={id}
  ▼
Workflow Builder   (?workflowId= loads from API)
  │  GET  /api/workflows/{id}             →  fetch saved graph
  │  POST /api/workflows                  →  create new
  │  PATCH /api/workflows/{id}            →  save draft
  │
  │  [Publish — RBAC-gated: require_permission("publish_workflows")]
  │    POST /api/workflows/{id}/publish   →  GovernancePolicy check + rate_limit(10/min)
  │    ✓ pass: is_active=true + AuditLog("workflow.published")
  │    ✗ block: 422 violations[] + AuditLog("workflow.publish_blocked")
  ▼
Query Lab
  │  GET  /api/workflows                  →  pick workflows[0] if no selection
  │  POST /api/workflows/simulate-multi   →  SimulationEngine: returns experiment_id, chunks, latency
  │  POST /api/evaluations/query-cases    →  save test case
  ▼
Governance
  │  GET/POST /api/governance/policies, /approval-rules, /bindings
  ▼
Environments   (binding matrix + promotion pipeline)
  │  PATCH /api/environments/{id}         →  update integration_bindings
  │
  │  [Promote — RBAC-gated: require_permission("approve_promotions")]
  │    POST /api/environments/{id}/promote →  GovernancePolicy check + rate_limit(5/min)
  │    ✓ promoted: AuditLog("environment.promoted", from/to status)
  │    ✗ blocked: 422 violations[]
  ▼
Observability
  │  GET /api/observability/runs
  │  GET /api/observability/runs/{id}/tasks
  ▼
Evidence Layer   (IEEE-citeable audit trail)
     GET/POST /api/evaluations/benchmark-queries
     POST /api/evaluations/benchmark-queries/{id}/human-rating
     GET  /api/evaluations/export
     GET  /api/workflows/runs  →  ResearchAssistant queries stored WorkflowRun data

Admin (Platform Admin only)
     GET /api/admin/users          →  user list (click row → sessions + audit drill-down)
     GET /api/admin/sessions       →  per-user sessions (status, IP, user-agent)
     PATCH /api/admin/sessions/{id}/revoke
     DELETE /api/admin/sessions/by-user/{uid}
     GET /api/admin/observability/audit-logs  →  per-user audit trail
```

---

## 2. Frontend Modules

| Module | Path | Key Files |
|---|---|---|
| Shell | `modules/layout/` | `AppShell.tsx` (collapsible sidebar 220px↔56px, hamburger toggle, localStorage persist, RBAC-gated Admin nav, `administer_platform` check, welcome toast on first sign-in, auto-seed + manual seed button), `layout.css` |
| Architecture Catalog | `modules/architecture-catalog/` | `ArchitectureCatalogPage.tsx` (empty state CTA → seeds + refetches), `architecture-catalog.css` |
| Guided Designer | `modules/guided-designer/` | `DesignerPage.tsx`, `DesignerStepper.tsx`, `designerToWorkflow.ts`, per-arch designer components |
| Workflow Builder | `modules/workflow-builder/` | `WorkflowBuilderPage.tsx` (**Publish gated by `publish_workflows` permission**, governance-gate result banner), `NodeConfigPanel.tsx`, `WorkflowCanvas.tsx`, `NodePalette.tsx` |
| Query Lab | `modules/query-lab/` | `QueryLabPage.tsx`, `ResultComparisonGrid.tsx` (evidence cards + latency bars), `RunHistoryPanel.tsx` |
| Integrations Studio | `modules/integrations-studio/` | `IntegrationsStudioPage.tsx` (live health dots from `test-connection`) |
| Environments | `modules/environments/` | `EnvironmentsPage.tsx` (3-step promotion bar, EmptyState component), `EnvironmentDetailPanel.tsx` |
| Governance | `modules/governance/` | `GovernancePage.tsx` |
| Observability | `modules/observability/` | `ObservabilityPage.tsx` |
| Admin — Users | `modules/admin-users/` | `AdminUsersPage.tsx` (**two-panel split layout**: user list left, drill-down right with Sessions tab + Audit Log tab), `admin.css` |
| Admin — Roles/Teams | `modules/admin-roles/`, `modules/admin-teams/` | CRUD pages |
| Evaluation Harness | `modules/evaluation/` | `EvaluationPage.tsx` — 6 pre-seeded benchmark queries, heuristic scoring, human ratings, JSON export |
| Research Assistant | `modules/research-assistant/` | `ResearchAssistantPage.tsx` — rule-based chat over stored `WorkflowRun` data |
| User Guide | `modules/user-guide/` | `UserGuidePage.tsx` (route `/app/guide`), `user-guide.css` |
| Shared UI | `modules/ui/` | `feedback.tsx` (PageHeader, StatusBadge, EmptyState+action, SimBanner), `ToastContext.tsx`, `Skeleton.tsx` |
| Auth | `modules/auth/` | `AuthContext.tsx` (`useAuth`, `useHasPermission` hook), `LandingPage.tsx` (RAGOS branding, `qc.clear()` post-OAuth, signingIn state) |
| API clients | `api/` | `workflows.ts`, `architectures.ts`, `integrations.ts`, `environments.ts`, `evaluations.ts`, `workflowRuns.ts` |

### Sign-in & Query Cache Refresh

After `signInWithGoogle()` resolves in `LandingPage.tsx`:
1. `queryClient.clear()` — evicts all stale cached data (fixes catalog requiring manual page reload)
2. Navigate to `/app`
3. `AppShell` fires the welcome toast (350ms delay, once per `sessionStorage` session)

### designerToWorkflow.ts — Architecture Mapping

| Architecture | Nodes generated |
|---|---|
| `vector` | input_query → embedding_generator → vector_retriever → [metadata_filter] → [reranker] → llm_answer_generator |
| `vectorless` | input_query → lexical_retriever + metadata_filter → context_assembler → llm_answer_generator |
| `graph` | input_query → graph_retriever → reranker → context_assembler → llm_answer_generator |
| `temporal` | input_query → temporal_filter → vector_retriever → llm_answer_generator |
| `hybrid` | input_query → query_classifier → vector_retriever + lexical_retriever → reranker → llm_answer_generator |
| `custom` | input_query → vector_retriever → llm_answer_generator (minimal starter graph) |

### Design Tokens (`index.css`)

| Token | Purpose |
|---|---|
| `--color-bg / --color-surface / --color-surface-2/3` | Dark background layers |
| `--color-border / --color-border-hover` | Borders and dividers |
| `--color-accent` | Primary indigo accent (`#818cf8`) |
| `--color-accent-sky` | Secondary sky-blue accent (`#38bdf8`) |
| `--color-text / --color-text-muted / --color-text-faint` | Text hierarchy |
| `--color-success/warning/danger/info` | Status colours + `-bg` variants |
| `--arch-vector/vectorless/graph/temporal/hybrid/custom` | Per-arch-type accent colours |
| `--radius / --radius-lg / --radius-xl` | Border radii |

---

## 3. Backend Router Map

| Router | Prefix | Key Endpoints |
|---|---|---|
| `auth` | `/api/auth` | `POST /google`, `POST /refresh`, `POST /logout` |
| `projects` | `/api/projects` | CRUD for `Project` |
| `architectures` | `/api/architectures` | `GET /catalog`, `POST /design-sessions`, `GET /design-sessions/{id}`, `PATCH /design-sessions/{id}` |
| `workflows` | `/api/workflows` | `GET /`, `GET /{id}`, `POST /`, `PATCH /{id}`, `DELETE /{id}`, `POST /simulate` (SimulationEngine), `POST /simulate-multi`, `GET /runs`, `GET /by-architecture/{type}`, **`POST /{id}/publish`** (RBAC + governance gate + rate limit 10/min + AuditLog) |
| `integrations` | `/api/integrations` | CRUD + **`POST /{id}/test-connection`** (live health check) |
| `environments` | `/api/environments` | CRUD + **`POST /{id}/promote`** (RBAC + governance gate + rate limit 5/min + AuditLog) |
| `governance` | `/api/governance` | `policies/`, `approval-rules/`, `bindings/` |
| `evaluations` | `/api/evaluations` | `GET/POST /benchmark-queries`, `DELETE /benchmark-queries/{id}`, `POST /benchmark-queries/{id}/run`, `POST /benchmark-queries/{id}/human-rating`, `GET /export` |
| `observability` | `/api/observability` | `GET /runs`, `GET /runs/{id}`, `GET /runs/{id}/tasks` |
| `admin_users` | `/api/admin/users` | CRUD + `POST /bootstrap` |
| `admin_roles` | `/api/admin/roles` | CRUD for `Role` with `permissions` JSON |
| `admin_teams` | `/api/admin/teams` | CRUD for `Team` |
| `admin_sessions` | `/api/admin/sessions` | `GET /` (filterable by `user_id`), `POST /`, `PATCH /{id}/revoke`, **`DELETE /by-user/{uid}`** (revoke all) |
| `admin_views` | `/api/admin/views` | CRUD for `View` (upsert-by-key) |
| `admin_preferences` | `/api/admin/preferences` | `GET /me`, `PATCH /me` |
| `admin_observability` | `/api/admin/observability` | `GET/POST /audit-logs` (filterable by `limit`), `GET/POST /events` |
| `demo` | `/api/demo` | `POST /seed` (idempotent full seed), `GET /seed-status`, `DELETE /seed` |

---

## 4. Backend Utilities

### `auth_middleware.py`

| Function | Purpose |
|---|---|
| `require_auth` | FastAPI `Depends` — validates JWT, returns `TokenPayload` |
| `optional_auth` | Like `require_auth` but returns `None` if no token |
| `require_permission(key)` | Factory that returns a `Depends` checking `token.permissions[key] == True`; raises 403 on failure |

### `rate_limit.py`

In-process per-`(user_id, endpoint)` sliding-window rate limiter. Thread-safe via `threading.Lock`. No external dependencies.

```python
enforce_rate_limit(user_id, endpoint, limit=10, window_seconds=60)
# Raises HTTP 429 with Retry-After header if limit exceeded
```

Current wirings:
- `POST /workflows/{id}/publish` → `limit=10, window_seconds=60`
- `POST /environments/{id}/promote` → `limit=5, window_seconds=60`

### `db.py` / `repositories.py`

`get_session()` — context manager returning a SQLModel `Session`. Strips `?supa=` pooler parameter for Supabase compatibility.

---

## 5. SQLModel Table Summary

### `models_core.py`
| Table | Key Fields |
|---|---|
| `Project` | `id`, `name`, `business_domain`, `selected_architecture_type`, `deployment_status`, `owners` (JSON) |
| `WorkflowDefinition` | `id`, `project_id`, `architecture_type`, `name`, `nodes` (JSON), `edges` (JSON), `status`, `is_active` |
| `Integration` | `id`, `name`, `provider_type`, `credentials_reference`, `health_status`, `reusable`, `environment_mapping` (JSON) |
| `Environment` | `id`, `name`, `external_id`, `runtime_profile` (JSON), `promotion_status`, `health_status`, `integration_bindings` (JSON) |
| `WorkflowRun` | `id`, `workflow_id`, `strategy_id`, `status`, `metrics` (JSON), `experiment_id` (citeable), `query`, `strategies_run` (JSON), `full_results` (JSON), `architecture_type` |
| `TaskExecution` | `id`, `run_id`, `node_id`, `status`, `trace_metadata` (JSON) |

### `models_architecture.py`
| Table | Key Fields |
|---|---|
| `ArchitectureTemplate` | `id`, `key`, `type`, `title`, `strengths/tradeoffs/typical_backends` (JSON) |
| `DesignSession` | `id`, `architecture_type`, `project_id`, `status`, `wizard_state` (JSON), `derived_architecture_definition` (JSON) |

### `models_governance.py`
| Table | Key Fields |
|---|---|
| `GovernancePolicy` | `id`, `name`, `scope` (`workflow`/`environment`/`architecture`), `rules` (JSON: `min_confidence_score`, `min_runs`), `created_by` |
| `ApprovalRule` | `id`, `name`, `applies_to`, `required_roles` (JSON), `active` |
| `GovernanceBinding` | `id`, `policy_id`, `workflow_id`, `environment_id`, `architecture_type`, `status` |

### `models_admin.py`
| Table | Key Fields |
|---|---|
| `User` | `id`, `email`, `name`, `role_id`, `team_id`, `is_active`, `external_provider`, `external_subject` |
| `Role` | `id`, `name`, `permissions` (JSON — see §6) |
| `Team` | `id`, `name`, `default_role_id` |
| `Session` | `id`, `user_id`, `status` (`active`/`revoked`), `ip`, `user_agent`, `created_at`, `last_activity_at` |
| `View` | `id`, `key`, `name`, `defaults` (JSON) |
| `UserPreference` | `id`, `user_id`, `theme`, `density`, `default_view_id`, `settings` (JSON) |
| `AuditLog` | `id`, `timestamp`, `user_id`, `session_id`, `action`, `resource_type`, `resource_id`, `event_data` (JSON), `ip` |
| `ObservabilityEvent` | `id`, `timestamp`, `user_id`, `session_id`, `category`, `name`, `value`, `event_data` (JSON) |

---

## 6. RBAC Permission Keys

Stored in `Role.permissions` JSON blob. Enforced via:
- **Backend**: `Depends(require_permission("key"))` in FastAPI route handlers
- **Frontend**: `useHasPermission("key")` hook (reads from `AuthContext`)

| Key | Enforced on |
|---|---|
| `administer_platform` | Admin nav section (AppShell), all `/api/admin/*` routes |
| `design_architecture` | Guided Designer, Workflow Builder |
| `manage_integrations` | Integrations Studio |
| `manage_environments` | Environments create/edit |
| `run_evaluations` | Evaluation Harness run actions |
| `publish_workflows` | Publish button (UI disabled + tooltip), `POST /workflows/{id}/publish` |
| `approve_promotions` | Promote button, `POST /environments/{id}/promote` |
| `view_observability` | Observability page, Audit Log read |

---

## 7. UX System

| Primitive | File | Notes |
|---|---|---|
| `ErrorBoundary` | `modules/ui/ErrorBoundary.tsx` | Class component, wraps every route; shows "Try again" on crash |
| `ToastProvider` / `useToast` | `modules/ui/ToastContext.tsx` | `success`, `error`, `warning`, `info`; 4s auto-dismiss, max 5 stacked |
| `SkeletonBar`, `SkeletonTable`, `SkeletonGrid`, `PageSkeleton` | `modules/ui/Skeleton.tsx` | Shimmer loading states |
| `EmptyState` | `modules/ui/feedback.tsx` | Accepts optional `action: {label, onClick}` for CTA buttons |
| `StatusBadge` | `modules/ui/feedback.tsx` | Maps status strings to `success/warning/danger/info/neutral` |
| `SimBanner` | `modules/ui/feedback.tsx` | Marks simulated behaviour inline |
| `PageHeader` | `modules/ui/feedback.tsx` | Title, description, optional action, optional SimBanner |

---

## 8. Demo Data Seed

`POST /api/demo/seed` idempotently inserts:

- **5 Roles** (Platform Admin, AI Architect, Knowledge Engineer, Auditor, Viewer)
- **4 Teams** (Platform Engineering, AI/ML, Data Engineering, Compliance & Audit)
- **4 Demo Users** (admin, architect, engineer, auditor)
- **Kinshuk Dutta auto-promoted** — any Google-authed user with email matching `kinshuk` → Platform Admin + Platform Engineering team
- **8 Integrations** (OpenAI Embeddings, Anthropic Claude, pgvector, Neo4j, Elasticsearch, S3, Datadog, Cohere Reranker)
- **4 Environments** (dev, test, staging, prod with runtime profiles)
- **3 Projects** (Support Portal, Claims Processing, Compliance Q&A)
- **3 Workflows** (Hybrid, Graph, Temporal RAG — active, with real node/edge graphs)
- **3 Governance policies** + 2 approval rules + 2 bindings
- **3 Design sessions** linked to workflows
- **Sample `AuditLog` and `ObservabilityEvent` rows**

`GET /api/demo/seed-status` returns `{ seeded: bool, counts: { workflows, integrations, environments } }` — used by `AppShell` to silently auto-seed on first app load.

---

## 9. Deployment

| Layer | Platform | Notes |
|---|---|---|
| Frontend | Vercel | React/Vite SPA. Auto-deploys on push to `main`. `vercel.json` rewrites `/api/*` to Railway. |
| Backend | Railway | FastAPI + SQLModel. Auto-deploys on push to `main`. |
| Database | Supabase PostgreSQL | Production DB. Local dev uses SQLite. `db.py` strips Supabase pooler params. |

- **Production URL**: https://ragorchestrationstudio.com/
- **Google OAuth callback**: https://ragorchestrationstudio.com/auth/callback
