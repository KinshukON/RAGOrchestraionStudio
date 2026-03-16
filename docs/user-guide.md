# RAGOS — RAG Orchestration Studio · User Guide

> **Live site**: [ragorchestrationstudio.com](https://ragorchestrationstudio.com)  
> Sign in with your Google account to access the platform.

---

## Table of Contents

1. [Signing In](#1-signing-in)
2. [Shell — Sidebar & Navigation](#2-shell--sidebar--navigation)
3. [Architecture Catalog](#3-architecture-catalog)
4. [Architect Advisor](#4-architect-advisor)
5. [Industry Solution Packs](#5-industry-solution-packs)
6. [Guided Designer — Configure your pipeline](#6-guided-designer--configure-your-pipeline)
7. [Guided Designer — Generate Workflow](#7-guided-designer--generate-workflow)
8. [Workflow Builder — Node Configuration](#8-workflow-builder--node-configuration)
9. [Query Lab](#9-query-lab)
10. [Integrations](#10-integrations)
11. [Environments & Promotion Pipeline](#11-environments--promotion-pipeline)
12. [Governance & Guardrails](#12-governance--guardrails)
13. [Observability & Traces](#13-observability--traces)
14. [Executive Summary](#14-executive-summary)
15. [Admin — Users, Roles & Teams](#15-admin--users-roles--teams)
16. [Admin — Session Management & Audit Trail](#16-admin--session-management--audit-trail)
17. [Evidence — Evaluation Harness](#17-evidence--evaluation-harness)
18. [Evidence — Research Assistant](#18-evidence--research-assistant)

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
| **Architecture** | Catalog, Guided Designer, Workflow Builder, **Industry Packs** |
| **Operate** | **Executive Summary**, Query Lab, Observability, Environments, Cost & ROI |
| **Control** | Integrations, Governance |
| **Evidence** | Evaluation Harness, Research Assistant |
| **Admin** | Users, Roles, Teams, Sessions, Preferences, Views — **visible only to `administer_platform` users** |

> Users without `administer_platform` see a locked "Admin (restricted)" item instead of the admin links.

### Seed Data Button

The sidebar footer shows a **⟳ Load demo data** button. Click it at any time to re-seed the full demo dataset (architectures, workflows, integrations, environments, governance policies, users, audit logs).

---

## 3. Architecture Catalog

**Sidebar: Architecture → Catalog**

The catalog is your starting point. It presents **18 RAG architecture patterns**, each with a description, when-to-use guidance, strengths & tradeoffs, typical backend components, and a **Required Integrations Panel** showing:

- Live health status of each required connector
- Operational complexity badge (Low / Medium / High / Very High)
- Stack readiness indicator
- CTA to configure missing integrations

| Architecture | Best For |
|---|---|
| **Vector RAG** | Semantic similarity over embedded text corpora |
| **Vectorless RAG** | Structured data, strict precision, no embedding overhead |
| **Graph RAG** | Entity-rich data requiring multi-hop reasoning |
| **Temporal RAG** | Time-aware retrieval over event sequences |
| **Hybrid RAG** | Combining vector, lexical, and graph strategies |
| **Custom RAG** | Bespoke pipelines beyond standard patterns |
| **Agentic RAG** | Autonomous agents with dynamic tool calls and reasoning |
| **Modular RAG** | Swappable microservice modules for independent scaling |
| **Memory-Augmented RAG** | Long-term context, personalized recommendations |
| **Multi-Modal RAG** | Cross-modal retrieval (text, image, audio, video) |
| **Federated RAG** | Privacy-preserving retrieval across decentralized orgs |
| **Streaming RAG** | Real-time event stream processing and retrieval |
| **Contextual Retrieval RAG** | Conversation-aware, session-state retrieval |
| **Knowledge-Enhanced RAG** | Ontology and taxonomy-grounded retrieval |
| **Self-RAG** | Self-reflection with iterative retrieval refinement |
| **HyDE RAG** | Hypothetical document embedding for guided retrieval |
| **Recursive / Multi-Step RAG** | Multiple rounds of retrieval and generation |
| **Domain-Specific RAG** | Industry-tailored pipelines (legal, medical, financial) |

**Empty state**: If the catalog loads with no data, a **"Load demo architectures"** button seeds the catalog directly without navigating away.

➡️ Click **"Design this architecture"** on any card to open the Guided Designer pre-configured for that type.

---

## 4. Architect Advisor

**Sidebar: Architecture → Catalog** → click **"Get a recommendation"** at the top of the page.

The **Architect Advisor** is a 5-question decision wizard that recommends the most appropriate RAG architecture (or suggests Long Context Window / Fine-tuning when RAG is not the right tool).

### Questions asked

1. **Business use-case** — 8 categories (Compliance Q&A, Customer Support, Code Search, etc.)
2. **Data modality** — structured, unstructured, mixed, time-series
3. **Volume** — < 10k, 10k–1M, > 1M documents
4. **Freshness requirement** — real-time, daily, static
5. **Governance sensitivity** — standard, regulated/HIPAA/FINRA, safety-critical

### Output

The advisor produces a **recommendation card** with:

- Recommended architecture (or LCW/Fine-tuning alternative)
- Operational profile: complexity badge, estimated setup days, cost tier, stack readiness
- Required integrations with live health status
- Optional integrations
- CTA: **"Design this →"** pre-loads Guided Designer for the recommended type

---

## 5. Industry Solution Packs

**Sidebar: Architecture → Industry Packs**

Pre-packaged RAG configurations for six enterprise verticals — each contains reference integrations, governance policies, benchmark suites, and estimated setup time.

| Pack | Maturity | Architectures | Setup |
|---|---|---|---|
| **Financial Services** — Compliance & Risk Q&A | GA | Vector, Temporal | 7 days |
| **Healthcare** — Clinical Knowledge Assistant | GA | Graph, Hybrid | 10 days |
| **Legal** — Contract Intelligence Suite | GA | Vectorless, Temporal | 5 days |
| **Retail** — Product & Support Intelligence | GA | Vector, Hybrid | 3 days |
| **Manufacturing** — Technical Documentation | Beta | Vector, Graph | 6 days |
| **Government** — Civic Knowledge Engine | Preview | Vectorless, Temporal | 8 days |

### Each pack includes

- **Use cases** — 4–5 domain-specific scenarios
- **Required integrations** — e.g. Bloomberg API, Epic FHIR, iManage, SAP PM
- **Governance policies** — pre-configured rules (min confidence, data residency, citation enforcement)
- **Benchmark suite** — domain-relevant evaluation metric names
- **CTA** — "Launch Guided Designer →" pre-loads designer for the pack's primary architecture

---

## 6. Guided Designer — Configure your pipeline

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

## 7. Guided Designer — Generate Workflow

Once all sections are reviewed, click **"Generate workflow →"**.

The button transitions to **"Generating workflow…"** while the backend compiles the pipeline. You are then automatically redirected to the **Workflow Builder** with the generated graph.

> Click **"Save draft"** at any time to persist the session without generating a workflow yet.

---

## 8. Workflow Builder — Node Configuration

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

## 9. Query Lab

**Sidebar: Operate → Query Lab**

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

---

## 10. Integrations

**Sidebar: Control → Integrations**

Manage connectors to LLM providers, vector stores, and document sources.

- Each integration has a **live health indicator** (🟢 healthy / 🔴 error / ⚪ unknown) updated by `POST /api/integrations/{id}/test-connection`.
- Once real API keys are configured, Query Lab automatically switches from simulated to live execution.

**Supported connector categories**: LLM providers (OpenAI, Anthropic, Cohere), vector stores (pgvector, Pinecone, Weaviate, Qdrant), document sources (S3, GCS, SharePoint, SQL), graph databases (Neo4j, Amazon Neptune, ArangoDB).

---

## 11. Environments & Promotion Pipeline

**Sidebar: Operate → Environments**

Environments are deployment targets. Each has its own integration bindings and configuration overrides.

| Environment | Typical Use |
|---|---|
| **dev** | Local/sandbox testing, simulated execution |
| **staging** | Pre-production validation with real LLMs |
| **prod** | Live deployment serving end-user queries |

### Readiness Score

Each environment card displays a **live readiness score** — the percentage of available integrations that are bound and configured:

- 🟢 **100%** — fully configured, ready to promote
- 🟡 **Partial** — some connectors unbound
- ⚫ **0%** — no integrations bound yet

The readiness bar animates as you bind connectors.

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

## 12. Governance & Guardrails

**Sidebar: Control → Governance**

Define and enforce policies across the platform lifecycle.

| Policy Scope | Example Rule |
|---|---|
| `workflow` | `min_confidence_score: 0.75`, `min_runs: 2` |
| `environment` | Block promotion if evaluation score < threshold |
| `architecture` | Whitelist permitted architecture types |

Policies are checked automatically at publish and promote time — no manual approval step needed for policy-based gates. Approval rules define role-based human approval routing for additional oversight.

---

## 13. Observability & Traces

**Sidebar: Operate → Observability**

Operational command centre for monitoring runs, quality, governance risk, and cost. Six tabs:

### ⚡ Operations tab

KPIs: total runs, success rate, failed runs, simulated runs, healthy integrations ratio.
Also shows a per-architecture run breakdown table with success rate and execution mode (Simulated / Live).

### 🎯 Retrieval Quality tab

Fetches live data from the **Evaluation Harness**:

- Avg relevance % and avg groundedness % (green ≥ 70%)
- Top strategy by relevance score
- Strategies benchmarked count
- Per-workflow execution breakdown (simulated vs live)

### 🛡️ Governance Risk tab

Live audit-log-powered violations table:

- **Policy events (7d)** KPI — turns red when violations exist
- Filters audit log for risk keywords: `block, reject, deny, fail, violation, unauthorized, forbidden, error`
- Violations table: timestamp, action badge (red), resource type:id, user ID
- Draft workflows table — shows workflows awaiting governance review with link to Workflow Builder

### 💰 Cost Analytics tab

Per-architecture cost breakdown with cost tier mapping:

| Architecture | Cost tier | Est. per 1k queries |
|---|---|---|
| Vector | Low | ~$0.10–$0.25 |
| Vectorless | Low | ~$0.05–$0.15 |
| Hybrid | Medium | ~$0.25–$0.60 |
| Temporal | Medium | ~$0.20–$0.50 |
| Graph | High | ~$0.50–$1.50 |

Also shows simulated vs live run split and top-arch-cost-tier KPI.

### 📜 Run History tab

Filterable table of all workflow runs (by workflow, status, simulated flag). Click any row to open the **Trace Explorer**:

#### Trace Explorer

Visual per-node timeline for a selected run:

- **Latency bars** — proportional to the slowest node; LLM nodes shown in purple
- **Status dots** — 🟢 succeeded / 🔴 failed / 🟡 running / ⚫ neutral
- **Expandable node detail** — started/finished timestamps, latency ms, error message, `trace_metadata` JSON
- **Run-level payloads** — input payload shown on first node, output payload on last
- **Summary row** — total nodes, success count, sum latency, wallclock

Click **✕** to close and return to the run list.

### 🔍 Audit Log tab

Full global audit log — all governance-sensitive events across the platform (powered by `AdminObservabilityPage`).

---

## 14. Executive Summary

**Sidebar: Operate → Executive Summary**

At-a-glance platform health dashboard — aggregates live data from 5 APIs on every page load.

### Sections

| Section | What it shows |
|---|---|
| **Platform health** | Active workflows, promoted environments, healthy integrations ratio, run success rate (ok/warn colour states) |
| **Retrieval quality** | Avg relevance %, avg groundedness %, top strategy, strategies benchmarked (from Evaluation Harness) |
| **Architecture portfolio** | Horizontal bar chart of run counts per architecture type (colour-coded) |
| **Integration health** | Health dot + provider type + status badge per connector |
| **Quick actions** | Shortcut cards to Catalog, Guided Designer, Evaluation Harness, Observability, Cost & ROI, Industry Packs |

---

## 15. Admin — Users, Roles & Teams

**Sidebar: Admin → Users / Roles / Teams**  
*Requires `administer_platform` permission.*

### Users

View all platform users, their assigned roles, team, and account status. Click any row to open the detail panel (see §16).

To edit a user: click **Edit** in the Actions column, change Role or Team via dropdowns, click **Save**. To deactivate a user (removes access): click **Deactivate** (not available for your own account).

### Roles

RAGOS uses RBAC. Default seeded roles:

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

## 16. Admin — Session Management & Audit Trail

**Sidebar: Admin → Users** → click any user row  
*Requires `administer_platform` permission.*

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

## 17. Evidence — Evaluation Harness

**Sidebar: Evidence → Evaluation Harness**

Structured benchmark test suite for measuring and comparing RAG strategy quality.

### Left panel — Benchmark queries

Six canonical enterprise RAG queries are pre-seeded (covering multi-hop reasoning, temporal compliance, entity disambiguation, cross-document synthesis, etc.). You can also:

- **Add custom queries** via "+ Add query"
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

Aggregated scores appear live in the **Observability → Retrieval Quality** and **Executive Summary** dashboards.

### Export

Click **"Export results"** to download a full benchmark report as JSON — suitable for inclusion in IEEE evaluation appendices.

---

## 18. Evidence — Research Assistant

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
Architecture Catalog  (pick a pattern, or use Architect Advisor for a guided recommendation)
  ├─ Industry Packs    (pre-configured vertical solution packs → Launch Guided Designer)
  └─ Guided Designer  (step 1: profile → step 2: retrieval → step 3: governance)
       └─ Workflow Builder  (deep-configure each node)
            │  [Publish — governance-gated, RBAC-gated, rate-limited]
            ▼
       Query Lab  (run multi-strategy simulation → inspect evidence cards)
            ├─ Environments  (readiness score + promote pipeline: draft → pending → promoted)
            ├─ Governance    (define policies that gate publish + promote)
            ├─ Integrations  (live health dots, test-connection)
            ├─ Observability  ← 6 tabs:
            │    ├─ Operations (KPIs + arch breakdown + integration health)
            │    ├─ Retrieval Quality (live eval scores from Harness)
            │    ├─ Governance Risk (audit log violations + draft reviews)
            │    ├─ Cost Analytics (per-arch cost tier breakdown)
            │    ├─ Run History → Trace Explorer (per-node latency bars, expandable detail)
            │    └─ Audit Log (global governance events)
            ├─ Executive Summary (5-API live platform health rollup)
            └─ Evidence
                 ├─ Evaluation Harness  (benchmark scoring → feeds Observability Quality tab)
                 └─ Research Assistant  (conversational experiment Q&A)

Admin (Platform Admin only)
  └─ Users → click row → Sessions tab (Revoke / Revoke All)
                       → Audit Log tab (per-user event history)
```

---

*RAGOS v2.0 · For API reference see [architecture.md](./architecture.md) · Deployed on [ragorchestrationstudio.com](https://ragorchestrationstudio.com)*
