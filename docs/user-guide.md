# RAAGOS — RAG Orchestration Studio · User Guide

> **Live site**: [ragorchestrationstudio.com](https://ragorchestrationstudio.com)  
> Sign in with your Google account to access the platform.

---

## Table of Contents

1. [Signing In](#1-signing-in)
2. [Shell — Sidebar & Navigation](#2-shell--sidebar--navigation)
3. [Architecture Catalog](#3-architecture-catalog)
4. [Guided Designer — Configure your pipeline](#4-guided-designer--configure-your-pipeline)
5. [Guided Designer — Generate Workflow](#5-guided-designer--generate-workflow)
6. [Workflow Builder — Node Configuration](#6-workflow-builder--node-configuration)
7. [Query Lab](#7-query-lab)
8. [Integrations](#8-integrations)
9. [Environments & Promotion Pipeline](#9-environments--promotion-pipeline)
10. [Governance & Guardrails](#10-governance--guardrails)
11. [Observability & Traces](#11-observability--traces)
12. [Admin — Users, Roles & Teams](#12-admin--users-roles--teams)
13. [Admin — Session Management & Audit Trail](#13-admin--session-management--audit-trail)
14. [Evidence — Evaluation Harness](#14-evidence--evaluation-harness)
15. [Evidence — Research Assistant](#15-evidence--research-assistant)

---

## 1. Signing In

Navigate to [ragorchestrationstudio.com](https://ragorchestrationstudio.com) and click **Continue with Google**. The platform uses Google OAuth 2.0 — you are redirected back immediately after authentication.

- The application **automatically loads demo data** on first sign-in (no manual step required).
- A **"Welcome back, [Name]! 👋"** toast appears the first time you sign in each browser session.
- All queries refresh automatically after sign-in; no manual page reload needed.

---

## 2. Shell — Sidebar & Navigation

The **AppShell** provides the persistent chrome across all pages.

### Collapsible Sidebar

| State | Width | Behaviour |
|---|---|---|
| **Expanded** (default) | 220 px | Full labels + icons visible |
| **Collapsed** | 56 px | Icons only; hover title tooltip shown |

Click the **hamburger icon (☰)** at the top of the sidebar to toggle. Preference is persisted to `localStorage`.

### Navigation sections

| Section | Items |
|---|---|
| **Architecture** | Catalog, Guided Designer, Workflow Builder |
| **Evidence** | Query Lab, Evaluation Harness, Research Assistant |
| **Integrations, Environments, Governance, Observability** | Top-level items |
| **Admin** | Users, Roles, Teams, Sessions, Preferences, Views — **visible only to users with the `administer_platform` permission** |

> Users without `administer_platform` see a locked "Admin (restricted)" item instead of the admin links.

### Seed Data Button

The sidebar footer shows a **⟳ Load demo data** button. Click it at any time to re-seed the full demo dataset (architectures, workflows, integrations, environments, governance policies, users, audit logs).

---

## 3. Architecture Catalog

**Sidebar: Architecture → Catalog**

The catalog is your starting point. It presents **6 RAG architecture patterns**, each with a description, when-to-use guidance, strengths & tradeoffs, and typical backend components.

| Architecture | Best For |
|---|---|
| **Vector RAG** | Semantic similarity over embedded text corpora |
| **Vectorless RAG** | Structured data, strict precision, no embedding overhead |
| **Graph RAG** | Entity-rich data requiring multi-hop reasoning |
| **Temporal RAG** | Time-aware retrieval over event sequences |
| **Hybrid RAG** | Combining vector, lexical, and graph strategies |
| **Custom RAG** | Bespoke pipelines beyond standard patterns |

**Empty state**: If the catalog loads with no data (e.g., first visit with a clean database), a **"Load demo architectures"** button seeds the catalog directly without navigating away.

➡️ Click **"Design this architecture"** on any card to open the Guided Designer pre-configured for that type.

---

## 4. Guided Designer — Configure your pipeline

**Sidebar: Architecture → Guided Designer**

After clicking "Design this architecture", the Guided Designer opens. The left panel shows a **3-step navigation**; the right panel shows configuration fields simultaneously across three columns.

### Step 1 — Architecture profile

Configure the core data & indexing layer:

- **Data source type** — file store, SQL, data warehouse, etc.
- **Chunking strategy** — `semantic`, `fixed-size`, `recursive`, `sliding-window`
- **Embedding model** — e.g. `text-embedding-3-large`, BGE, E5
- **Vector database** — pgvector, Pinecone, Weaviate, Qdrant

### Step 2 — Retrieval & routing

- **Similarity metric** — cosine, dot product, L2
- **Top K** — number of chunks to retrieve (default 8)
- **Metadata filters** — DSL expressions to narrow results
- **Reranker** — optional cross-encoder or SaaS reranker

### Step 3 — Answering & governance

- **Answer generation model** — LLM for final synthesis
- **Fallback strategy** — `llm_fallback`, `no_answer`, etc.

---

## 5. Guided Designer — Generate Workflow

Once all sections are reviewed, click **"Generate workflow →"**.

The button transitions to **"Generating workflow…"** while the backend compiles the pipeline. You are then automatically redirected to the **Workflow Builder** with the generated graph.

> Click **"Save draft"** at any time to persist the session without generating a workflow yet.

---

## 6. Workflow Builder — Node Configuration

**Sidebar: Architecture → Workflow Builder**

Visualises your RAG pipeline as a **node-based directed graph**. Edges represent data flow.

### Layout

| Panel | Purpose |
|---|---|
| **Left — Nodes palette** | Node types grouped by category: Input & Routing, Retrieval, Processing, Generation |
| **Centre — Canvas** | Live pipeline graph. Zoom with `+`/`−`, fit-to-window with the fullscreen icon |
| **Right — Configuration** | Click any node to open its deep-config panel |

### Deep Node Configuration

| Node type | Key parameters |
|---|---|
| **Embedding generator** | Chunking strategy, chunk size (64–4096 tokens), overlap, embedding model, batch size, vector store |
| **Vector retriever** | Top-K, similarity metric, ANN algorithm (HNSW/IVFFlat/Exact), metadata pre-filter DSL, MMR lambda |
| **Lexical retriever** | Algorithm (BM25/TF-IDF/BM25+/SPL), k1 + b sliders, index backend |
| **Graph retriever** | Traversal (BFS/DFS/PPR/Beam), max hop depth, edge-type allowlist, graph DB |
| **Temporal filter** | As-of date source, effective-from/to field names, lookback window |
| **Reranker** | Model, top-K after rerank, cross-encoder mode |
| **LLM answer generator** | Model, max tokens, temperature, top-P, system prompt, streaming |
| **Query classifier** | Classifier type, intent labels, confidence threshold |
| **Guardrail** | PII / toxicity / injection / hallucination checks, violation action |
| **Context assembler** | Merge strategy (RRF/weighted/deduplicate/concat), max context tokens |

### Governance-Gated Publishing

The **Publish** button is **only enabled** for users with the `publish_workflows` permission (AI Architect or Platform Admin). For other roles it appears disabled with a tooltip.

Clicking Publish runs the **governance gate**:
1. Checks all active `workflow`-scoped `GovernancePolicy` rules from the database.
2. Compares the most recent `WorkflowRun` confidence score against `min_confidence_score`.
3. Checks `min_runs` threshold.
4. If blocked: returns a **violation list** explaining what must improve before publishing.
5. If passed: sets `is_active = true` and writes an `AuditLog` entry (`workflow.published`).

Rate limit: **10 publish attempts per user per 60 seconds** (HTTP 429 with `Retry-After` header if exceeded).

---

## 7. Query Lab

**Sidebar: Query Lab**

Test workflows interactively and compare retrieval strategies side-by-side.

### Controls

| Field | Description |
|---|---|
| **Workflow** | Select from all draft/published workflows |
| **Environment** | Target environment: dev, staging, prod |
| **Query text** | Your test question or instruction |
| **Strategies to compare** | Vector, Vectorless, Graph, Temporal, Hybrid |
| **Top-k** | Retrieval hint — number of chunks returned |

Click **"Run simulation"** to execute.

### Results Cards

Each strategy returns a comparison card showing:

- **Experiment ID** — citeable `exp-XXXXXX` identifier
- **Latency bar** — visual benchmark across strategies
- **Retrieved chunks** — top-scored chunks with source attribution
- **Retrieval path** — pipeline nodes traversed
- **Answer** — generated response
- **Export** — download run as JSON

### Run History

Every simulation is logged in the **Run History** panel:

- **Search** by query text, strategy, or experiment ID
- **Expand** any row to see full result detail
- **Export** selected runs as CSV

---

## 8. Integrations

**Sidebar: Integrations**

Manage connectors to LLM providers, vector stores, and document sources.

- Each integration has a **live health indicator** (🟢 healthy / 🔴 error / ⚪ unknown) updated by `POST /api/integrations/{id}/test-connection`.
- Once real API keys are configured, Query Lab automatically switches from simulated to live execution.

**Supported connector categories**: LLM providers (OpenAI, Anthropic, Cohere), vector stores (pgvector, Pinecone, Weaviate, Qdrant), document sources (S3, GCS, SharePoint, SQL), graph databases (Neo4j, Amazon Neptune, ArangoDB).

---

## 9. Environments & Promotion Pipeline

**Sidebar: Environments**

Environments are deployment targets. Each has its own integration bindings and configuration overrides.

| Environment | Typical Use |
|---|---|
| **dev** | Local/sandbox testing, simulated execution |
| **staging** | Pre-production validation with real LLMs |
| **prod** | Live deployment serving end-user queries |

### Promotion Pipeline

Environments advance through a **3-step pipeline**: `draft → pending → promoted`.

Click **Promote →** in the environment detail panel. The final step (`pending → promoted`) is **governance-gated**:

1. Loads all `environment`-scoped `GovernancePolicy` rules.
2. Checks the latest `WorkflowRun` bound to this environment against `min_confidence_score`.
3. Returns 422 with `violations[]` if the threshold is not met.
4. On success, writes an `AuditLog` entry (`environment.promoted`, including `from_status` and `to_status`).

> The **Promote** button requires the `approve_promotions` permission (Platform Admin only).  
> Rate limit: **5 promote attempts per user per 60 seconds**.

---

## 10. Governance & Guardrails

**Sidebar: Governance**

Define and enforce policies across the platform lifecycle.

| Policy Scope | Example Rule |
|---|---|
| `workflow` | `min_confidence_score: 0.75`, `min_runs: 2` |
| `environment` | Block promotion if evaluation score < threshold |
| `architecture` | Whitelist permitted architecture types |

Policies are checked automatically at publish and promote time — no manual approval step needed for policy-based gates. Approval rules define role-based human approval routing for additional oversight.

---

## 11. Observability & Traces

**Sidebar: Observability**

Monitor every workflow run:

- **Run history** — timestamped log of every execution with status (success / failure / timeout)
- **Trace analytics** — per-node latency breakdown for a selected run
- **Audit trail** — global audit log of governance events (who published, promoted, or was blocked)

Use date, environment, and status filters to drill into specific runs.

---

## 12. Admin — Users, Roles & Teams

**Sidebar: Admin → Users / Roles / Teams**  
*Requires `administer_platform` permission.*

### Users

View all platform users, their assigned roles, team, and account status. Click any row to open the detail panel (see §13).

To edit a user: click **Edit** in the Actions column, change Role or Team via dropdowns, click **Save**. To deactivate a user (removes access): click **Deactivate** (not available for your own account).

### Roles

RAAGOS uses RBAC. Default seeded roles:

| Role | Key Permissions |
|---|---|
| **Platform Admin** | All permissions including `administer_platform`, `approve_promotions` |
| **AI Architect** | `design_architecture`, `publish_workflows`, `manage_integrations`, `manage_environments` |
| **Knowledge Engineer** | `design_architecture`, `run_evaluations` |
| **Auditor** | `view_observability` (read-only) |
| **Viewer** | `view_observability` (read-only) |

### Teams

Group users into teams to scope workflow ownership and governance approval routing. Default teams: Platform Engineering, AI/ML, Data Engineering, Compliance & Audit.

---

## 13. Admin — Session Management & Audit Trail

**Sidebar: Admin → Users** → click any user row  
*Requires `administer_platform` permission.*

Clicking a user row opens a **detail panel** on the right side of the Users page with two tabs:

### 🔑 Sessions Tab

Shows all active and revoked sessions for the selected user:

| Column | Description |
|---|---|
| Status indicator | 🟢 Active (glowing dot) or ⛔ Revoked |
| Started | Time since session was created |
| Last seen | Time since last activity |
| IP address | Source IP of the session |
| User agent | Browser / client string (truncated) |

**Actions:**
- **Revoke** button on each active session — immediately invalidates that session
- **⛔ Revoke all sessions** button (shown when user has more than one active session) — invalidates all at once, forcing a re-login

### 📋 Audit Log Tab

Shows the 50 most recent audit events for the selected user, filtered from the global audit log:

| Field | Description |
|---|---|
| Timestamp | Date and time of the event |
| Action | e.g. `workflow.published`, `workflow.publish_blocked`, `environment.promoted` |
| Resource type + ID | What was acted upon |
| IP | Source IP if available |
| Details (expandable) | Full `event_data` JSON blob |

> Audit events are written automatically by the system on every governance-sensitive action (publish, promote, blocked attempts). They cannot be edited or deleted.

---

## 14. Evidence — Evaluation Harness

**Sidebar: Evidence → Evaluation Harness**

Structured benchmark test suite for measuring and comparing RAG strategy quality.

### Left panel — Benchmark queries

Six canonical enterprise RAG queries are pre-seeded (covering multi-hop reasoning, temporal compliance, entity disambiguation, cross-document synthesis, etc.). You can also:

- **Add custom queries** via "**+ Add query**"
- **Run all benchmarks** with a single click
- **Delete** custom queries you no longer need

### Right panel — Scoring detail

| Score dimension | What it measures |
|---|---|
| **Relevance** | How closely retrieved chunks match query intent |
| **Groundedness** | Whether the answer is supported by retrieved context |
| **Completeness** | Whether all facets of the question are addressed |
| **Human rating** | 1–5 star override from a human reviewer |

Scores are computed heuristically (no external LLM call needed) and stored persistently.

### Export

Click **"Export results"** to download a full benchmark report as JSON — suitable for inclusion in IEEE evaluation appendices.

---

## 15. Evidence — Research Assistant

**Sidebar: Evidence → Research Assistant**

Conversational interface that answers questions about your RAG experiments — rule-based, no external LLM calls required.

### Quick-start suggestions

- *"What was tested?"* — summarises strategies and queries run
- *"Compare latency across strategies"* — returns a table of latency medians
- *"What is the methodology?"* — explains the simulation and scoring approach
- *"Generate deep-dive report"* — produces a structured Markdown summary of all experiment runs

Type any free-form question in the chat input. The assistant queries stored `WorkflowRun` data and returns structured answers with tables, metrics, and experiment IDs.

---

## End-to-End Flow Summary

```
Sign in (Google OAuth)
  └─ Welcome toast + demo data auto-loaded
       │
       ▼
Architecture Catalog  (pick a pattern → or use empty-state CTA to load demo data)
  └─ Guided Designer  (step 1: profile → step 2: retrieval → step 3: governance)
       └─ Workflow Builder  (deep-configure each node)
            │  [Publish — governance-gated, RBAC-gated, rate-limited]
            ▼
       Query Lab  (run multi-strategy simulation → inspect evidence cards)
            ├─ Environments  (promote pipeline: draft → pending → promoted, governance-gated)
            ├─ Governance    (define policies that gate publish + promote)
            ├─ Integrations  (live health dots, test-connection)
            ├─ Observability (run traces + global audit log)
            └─ Evidence
                 ├─ Evaluation Harness  (benchmark scoring, export)
                 └─ Research Assistant  (conversational experiment Q&A)

Admin (Platform Admin only)
  └─ Users → click row → Sessions tab (Revoke / Revoke All)
                       → Audit Log tab (per-user event history)
```

---

*RAAGOS v1.2 · For API reference see [architecture.md](./architecture.md) · Deployed on [ragorchestrationstudio.com](https://ragorchestrationstudio.com)*
