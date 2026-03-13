RAG Studio – Enterprise RAG Architecture Control Plane
=======================================================

RAG Studio is a **no-code / low-code retrieval architecture control plane** for designing, configuring, testing, and operating enterprise Retrieval-Augmented Generation (RAG) systems. It treats RAG architecture selection as a first-class decision and provides guided tooling for every stage from design to production observability.

---

## Navigation

| Module | Route | Purpose |
|---|---|---|
| **Architecture Catalog** | `/app` | Browse and select from 6 canonical RAG architecture types |
| **Guided Designer** | `/app/designer` | Multi-step wizard to configure a chosen architecture |
| **Workflow Builder** | `/app/workflow-builder` | Visual node-and-edge orchestration canvas |
| **Query Lab** | `/app/query-lab` | Run test queries, compare strategies, inspect traces |
| **Integrations** | `/app/integrations` | LLM, embedding, vector DB, graph DB, and storage connectors |
| **Environments** | `/app/environments` | Dev/test/staging/prod targets with binding matrix and readiness |
| **Governance** | `/app/governance` | Policy sets, approval gates, and policy-to-workflow bindings |
| **Observability** | `/app/observability` | Workflow runs, node timelines, metrics, and audit events |
| **Admin → Users/Roles/Teams** | `/app/admin/*` | RBAC management |

---

## Architecture Overview

```
┌─────────────────────────── Frontend (React + Vite) ───────────────────────────┐
│                                                                                 │
│  AppShell (dark sidebar, breadcrumb, avatar)                                    │
│  ├─ Architecture Catalog Page  ─── DesignSession → Guided Designer              │
│  ├─ Guided Designer Page       ─── PATCH /api/architectures/design-sessions     │
│  ├─ Workflow Builder Page      ─── GET/POST /api/workflows                      │
│  ├─ Query Lab Page             ─── POST /api/workflows/{id}/simulate-multi       │
│  ├─ Integrations Studio Page   ─── GET/POST /api/integrations                   │
│  ├─ Environments Page          ─── GET/POST /api/environments                   │
│  ├─ Governance Page            ─── GET/POST /api/governance/*                   │
│  ├─ Observability Page         ─── GET /api/observability/runs                  │
│  └─ Admin Pages                ─── GET/POST /api/admin/*                        │
│                                                                                 │
└──────────────────────┬──────────────────────────────────────────────────────────┘
                       │ HTTP (JSON)
┌──────────────────────▼──────────────────────────────────────────────────────────┐
│                       Backend (FastAPI + SQLModel + SQLite)                      │
│                                                                                  │
│  Routers: auth, projects, workflows, architectures, integrations, environments,  │
│           governance, observability, evaluations, admin_*, demo                  │
│                                                                                  │
│  Models:  models_core.py          → Project, WorkflowDefinition, Integration,   │
│                                      Environment, WorkflowRun, TaskExecution     │
│           models_architecture.py  → ArchitectureTemplate, DesignSession          │
│           models_governance.py    → GovernancePolicy, ApprovalRule, Binding      │
│           models_admin.py         → User, Role, Team, Session, View, Prefs,      │
│                                      AuditLog, ObservabilityEvent                │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## Key User Flow

```
Architecture Catalog
       │  (select type)
       ▼
 Guided Designer  ──── saves DesignSession ────▶  "Generate Workflow" CTA
       │
       ▼
 Workflow Builder  ──── architecture-aware templates, NodeConfigPanel
       │
       ▼
 Query Lab  ──── select workflow, strategy, env, run simulate-multi
       │         compare results, save test cases → EvaluationRun
       ▼
 Governance  ──── policy attached to workflow/env, approval gate required
       │
       ▼
 Environments  ──── promote staging → prod (approval checked)
       │
       ▼
 Observability  ──── runs list, node timeline, metrics, audit log
```

---

## Simulated vs Real Behaviour

All pages show a **⚠ Simulated** banner where behaviour is mocked.

| Feature | Status |
|---|---|
| Architecture Catalog | ✅ Real DB-backed (seeded on startup) |
| Guided Designer persistence | ✅ Real DB via `DesignSession` |
| Workflow Builder CRUD | ✅ Real DB via `WorkflowDefinitionRecord` |
| Query simulation (`simulate-multi`) | ⚠ Simulated – deterministic fixture responses |
| Integration health checks | ⚠ Simulated – `health_status` field only |
| Environment promotion | ⚠ Simulated – field update, no live infra |
| Governance approval | ⚠ Simulated – status field, no sign-off flow |
| Observability metrics | ⚠ Simulated – seeded fixture data |
| Auth (Google Sign-In) | ⚠ Mock in dev mode; configure `GOOGLE_CLIENT_ID` for real |

---

## Local Development

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:5173

### Seed demo data

```bash
curl -s -X POST http://localhost:8000/api/demo/seed | python3 -m json.tool
```

This idempotently inserts roles, teams, users, integrations, environments, projects, workflows, governance records, and sample observability events.

---

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | SQLAlchemy URL (default: `sqlite:///./rag_studio.db`) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID (optional; skipped in mock auth mode) |
| `SECRET_KEY` | JWT signing secret (generate a random 32-byte hex string for prod) |

---

## Folder Structure

```
/
├── frontend/                     React + TypeScript (Vite)
│   └── src/
│       ├── api/                  Typed API client hooks
│       ├── modules/
│       │   ├── layout/           AppShell, sidebar, breadcrumb
│       │   ├── architecture-catalog/
│       │   ├── guided-designer/
│       │   ├── workflow-builder/
│       │   ├── query-lab/
│       │   ├── integrations-studio/
│       │   ├── environments/
│       │   ├── governance/
│       │   ├── observability/
│       │   ├── admin-*/          Users, Roles, Teams, Views, Prefs, Sessions
│       │   └── ui/               Shared primitives (badges, feedback, headers)
│       └── index.css             Global design tokens (Inter, CSS vars, utilities)
│
└── backend/                      FastAPI + SQLModel + SQLite
    ├── main.py                   App wiring and CORS
    ├── db.py                     DB engine and session factory
    ├── models_core.py            Core domain models
    ├── models_architecture.py    Architecture & DesignSession models
    ├── models_governance.py      Governance models
    ├── models_admin.py           Admin/RBAC models
    ├── repositories.py           Repository abstractions
    └── routers/                  One file per API domain
        ├── architectures.py
        ├── workflows.py
        ├── integrations.py
        ├── environments.py
        ├── governance.py
        ├── observability.py
        ├── evaluations.py
        ├── admin_users/roles/teams/sessions/views/preferences/observability.py
        └── demo.py               Demo data seed endpoint
```

---

## Extending to Production

1. **Real vector DB**: replace simulated `simulate-multi` with a live connector (pgvector, Pinecone, etc.) in `routers/workflows.py`.
2. **Real LLM**: swap fixture answer generation with an OpenAI/Anthropic API call.
3. **Auth**: set `GOOGLE_CLIENT_ID` and `SECRET_KEY`; the `auth.py` router will issue real backend JWTs.
4. **Database**: point `DATABASE_URL` at PostgreSQL for production persistence.
5. **Observability**: forward `ObservabilityEvent` rows to Datadog/Grafana via the registered integration.
