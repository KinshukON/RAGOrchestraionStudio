# RAG Studio – Architecture & Module Reference

## Frontend Modules

| Module | Path | Key Files |
|---|---|---|
| Shell | `modules/layout/` | `AppShell.tsx`, `layout.css` |
| Architecture Catalog | `modules/architecture-catalog/` | `ArchitectureCatalogPage.tsx`, `architecture-catalog.css` |
| Guided Designer | `modules/guided-designer/` | `DesignerPage.tsx`, `DesignerStepper.tsx`, `steps/` |
| Workflow Builder | `modules/workflow-builder/` | `WorkflowBuilderPage.tsx`, `NodeConfigPanel.tsx`, `ArchitectureSummaryPanel.tsx` |
| Query Lab | `modules/query-lab/` | `QueryLabPage.tsx`, `QueryInputPanel.tsx`, `ResultComparisonGrid.tsx`, `RunHistoryPanel.tsx` |
| Integrations Studio | `modules/integrations-studio/` | `IntegrationsStudioPage.tsx` |
| Environments | `modules/environments/` | `EnvironmentsPage.tsx`, `EnvironmentDetailPanel.tsx` |
| Governance | `modules/governance/` | `GovernancePage.tsx`, `governance.css` |
| Observability | `modules/observability/` | `ObservabilityPage.tsx` |
| Admin | `modules/admin-*/` | Users, Roles, Teams, Views, Preferences, Observability |
| Shared UI | `modules/ui/` | `feedback.tsx` (PageHeader, StatusBadge, EmptyState, SimBanner…) |

### Design Tokens

All CSS variables are defined in `src/index.css`:

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
| `--transition / --transition-slow` | Animation speeds |

---

## Backend Router Map

| Router | Prefix | Key Endpoints |
|---|---|---|
| `auth` | `/api/auth` | `POST /signin`, `POST /bootstrap-user` |
| `projects` | `/api/projects` | CRUD for `Project` |
| `architectures` | `/api/architectures` | `GET /catalog`, `POST /design-sessions`, `GET/PATCH /design-sessions/{id}` |
| `workflows` | `/api/workflows` | CRUD + `POST /simulate-multi`, `GET /by-architecture/{type}` |
| `integrations` | `/api/integrations` | CRUD for `Integration` |
| `environments` | `/api/environments` | CRUD for `Environment` |
| `governance` | `/api/governance` | `policies/`, `approval-rules/`, `bindings/` |
| `evaluations` | `/api/evaluations` | `POST /query-cases`, `POST /runs` |
| `observability` | `/api/observability` | `GET /runs`, `GET /runs/{id}`, `GET /runs/{id}/tasks` |
| `admin_users` | `/api/admin/users` | CRUD + `POST /bootstrap` |
| `admin_roles` | `/api/admin/roles` | CRUD for `Role` with `permissions` blob |
| `admin_teams` | `/api/admin/teams` | CRUD for `Team` |
| `admin_sessions` | `/api/admin/sessions` | `GET /`, `POST /`, `PATCH /{id}/revoke`, `DELETE /by-user/{uid}` |
| `admin_views` | `/api/admin/views` | CRUD for `View` (upsert-by-key) |
| `admin_preferences` | `/api/admin/preferences` | `GET /me`, `PATCH /me` (get-or-create by `user_id`) |
| `admin_observability` | `/api/admin/observability` | `GET/POST /audit-logs`, `GET/POST /events` |
| `demo` | `/api/demo` | `POST /seed`, `DELETE /seed` |

---

## SQLModel Table Summary

### `models_core.py`
| Table | Key Fields |
|---|---|
| `Project` | `id`, `name`, `business_domain`, `selected_architecture_type`, `deployment_status` |
| `WorkflowDefinition` | `id`, `project_id`, `architecture_type`, `nodes` (JSON), `edges` (JSON), `status`, `version` |
| `Integration` | `id`, `name`, `provider_type`, `credentials_reference`, `health_status` |
| `Environment` | `id`, `name`, `external_id`, `runtime_profile` (JSON), `promotion_status`, `health_status` |
| `WorkflowRun` | `id`, `workflow_id`, `strategy_id`, `status`, `metrics` (JSON) |
| `TaskExecution` | `id`, `run_id`, `node_id`, `status`, `trace_metadata` (JSON) |

### `models_architecture.py`
| Table | Key Fields |
|---|---|
| `ArchitectureTemplate` | `id`, `key`, `type`, `title`, `strengths/tradeoffs/typical_backends` (JSON) |
| `DesignSession` | `id`, `architecture_type`, `project_id`, `status`, `wizard_state` (JSON), `derived_architecture_definition` (JSON) |

### `models_governance.py`
| Table | Key Fields |
|---|---|
| `GovernancePolicy` | `id`, `name`, `scope`, `rules` (JSON), `created_by` |
| `ApprovalRule` | `id`, `name`, `applies_to`, `required_roles` (JSON), `active` |
| `GovernanceBinding` | `id`, `policy_id`, `workflow_id`, `environment_id`, `architecture_type`, `status` |

### `models_admin.py`
| Table | Key Fields |
|---|---|
| `User` | `id`, `email`, `name`, `role_id`, `team_id`, `is_active`, `external_provider` |
| `Role` | `id`, `name`, `permissions` (JSON) |
| `Team` | `id`, `name`, `default_role_id` |
| `Session` | `id`, `user_id`, `status`, `ip`, `last_activity_at` |
| `View` | `id`, `key`, `name`, `defaults` (JSON) |
| `UserPreference` | `id`, `user_id`, `theme`, `density`, `default_view_id`, `settings` (JSON) |
| `AuditLog` | `id`, `action`, `resource_type`, `resource_id`, `metadata` (JSON) |
| `ObservabilityEvent` | `id`, `category`, `name`, `value`, `metadata` (JSON) |

---

## RBAC Permission Keys

Defined in `Role.permissions` JSON blob:

| Key | Who needs it |
|---|---|
| `administer_platform` | Platform Admin only |
| `design_architecture` | Architects, Engineers |
| `manage_integrations` | Architects |
| `manage_environments` | Architects |
| `run_evaluations` | Architects, Engineers |
| `publish_workflows` | Architects |
| `approve_promotions` | Platform Admin |
| `view_observability` | All authenticated roles |
