"""
Demo seed endpoint – POST /api/demo/seed

Idempotently inserts realistic demo data across all major platform entities.
Safe to run multiple times: each entity is guarded by a name/key uniqueness check.
"""
from datetime import datetime, timedelta
from typing import Any, Dict

from fastapi import APIRouter
from sqlmodel import select

from db import get_session
from models_admin import AuditLog, ObservabilityEvent, Role, Session as SessionModel, Team, User, UserPreference, View
from models_architecture import ArchitectureTemplate, DesignSession
from models_core import Environment, Integration, Project, WorkflowDefinition
from models_governance import ApprovalRule, GovernanceBinding, GovernancePolicy

router = APIRouter()


# ── Helpers ────────────────────────────────────────────────────────────────

def _upsert_by(session, model, field: str, value: Any, **kwargs):
    """Return existing row matched by `field=value`, or create one."""
    existing = session.exec(select(model).where(getattr(model, field) == value)).first()
    if existing:
        return existing
    obj = model(**{field: value, **kwargs})
    session.add(obj)
    session.flush()
    return obj


# ── Seed function ──────────────────────────────────────────────────────────

def _seed(session) -> Dict[str, int]:
    counts: Dict[str, int] = {}

    # ── Roles ──────────────────────────────────────────────────────────────
    role_defs = [
        ("Platform Admin",       {"administer_platform": True, "design_architecture": True, "manage_integrations": True,
                                   "manage_environments": True, "run_evaluations": True, "publish_workflows": True,
                                   "approve_promotions": True, "view_observability": True}),
        ("AI Architect",         {"design_architecture": True, "manage_integrations": True, "run_evaluations": True,
                                   "publish_workflows": True, "view_observability": True}),
        ("Knowledge Engineer",   {"design_architecture": True, "run_evaluations": True, "view_observability": True}),
        ("Auditor",              {"view_observability": True}),
        ("Viewer",               {"view_observability": True}),
    ]
    roles = {}
    for name, perms in role_defs:
        r = _upsert_by(session, Role, "name", name, description=f"Demo {name} role", permissions=perms)
        roles[name] = r
    counts["roles"] = len(role_defs)

    # ── Teams ──────────────────────────────────────────────────────────────
    team_defs = [
        ("Platform Engineering", roles["Platform Admin"]),
        ("AI / ML Team",         roles["AI Architect"]),
        ("Data Engineering",     roles["Knowledge Engineer"]),
        ("Compliance & Audit",   roles["Auditor"]),
    ]
    teams = {}
    for name, default_role in team_defs:
        t = _upsert_by(session, Team, "name", name, description=f"Demo {name} team",
                       default_role_id=default_role.id)
        teams[name] = t
    counts["teams"] = len(team_defs)

    # ── Users ──────────────────────────────────────────────────────────────
    user_defs = [
        ("admin@demo.rag-studio.ai",    "Platform Admin",    roles["Platform Admin"],     teams["Platform Engineering"]),
        ("architect@demo.rag-studio.ai","Priya Architect",   roles["AI Architect"],       teams["AI / ML Team"]),
        ("engineer@demo.rag-studio.ai", "Sam Engineer",      roles["Knowledge Engineer"], teams["Data Engineering"]),
        ("auditor@demo.rag-studio.ai",  "Taylor Auditor",    roles["Auditor"],            teams["Compliance & Audit"]),
    ]
    users = {}
    for email, name, role, team in user_defs:
        u = _upsert_by(session, User, "email", email, name=name, role_id=role.id, team_id=team.id,
                       is_active=True, external_provider="demo")
        users[email] = u
    counts["users"] = len(user_defs)

    # ── Promote Kinshuk Dutta (Google-auth) to Platform Admin if present ──
    kinshuk = session.exec(select(User).where(User.email.ilike("%kinshuk%"))).first()
    if kinshuk:
        kinshuk.role_id = roles["Platform Admin"].id
        kinshuk.team_id = teams["Platform Engineering"].id
        session.add(kinshuk)
    counts["admin_promoted"] = 1 if kinshuk else 0

    # ── Views ──────────────────────────────────────────────────────────────
    view_defs = [
        ("architecture-catalog", "Architecture Catalog", "Home – RAG architecture selection"),
        ("guided-designer",      "Guided Designer",      "Multi-step wizard for architecture design"),
        ("workflow-builder",     "Workflow Builder",      "Visual node-based orchestration canvas"),
        ("query-lab",            "Query Lab",             "Query testing and strategy comparison"),
        ("integrations",         "Integrations",          "Integration providers and connectors"),
        ("environments",         "Environments",          "Deployment targets and binding matrix"),
        ("governance",           "Governance",            "Policies, approval rules, and bindings"),
        ("observability",        "Observability",         "Workflow runs, traces, and audit events"),
    ]
    for key, name, desc in view_defs:
        _upsert_by(session, View, "key", key, name=name, description=desc, defaults={})
    counts["views"] = len(view_defs)

    # ── UserPreferences ─────────────────────────────────────────────────────
    for u in users.values():
        prefs = session.exec(select(UserPreference).where(UserPreference.user_id == u.id)).first()
        if not prefs:
            session.add(UserPreference(user_id=u.id, theme="dark", density="comfortable"))
    counts["preferences"] = len(users)

    # ── Sessions ───────────────────────────────────────────────────────────
    admin_user = users["admin@demo.rag-studio.ai"]
    existing_session = session.exec(
        select(SessionModel).where(SessionModel.user_id == admin_user.id)
    ).first()
    if not existing_session:
        session.add(SessionModel(user_id=admin_user.id, ip="127.0.0.1", user_agent="Demo/1.0", status="active"))
    counts["sessions"] = 1

    # ── Integrations ────────────────────────────────────────────────────────
    integration_defs = [
        ("OpenAI Embeddings",  "embedding",    {"model": "text-embedding-3-large", "dimensions": 3072},
         "vault:kv/openai/embeddings", "healthy"),
        ("Anthropic Claude",   "llm",          {"model": "claude-3-5-sonnet", "max_tokens": 8192},
         "vault:kv/anthropic/claude", "healthy"),
        ("pgvector (prod)",    "vector_db",    {"host": "pgvector-prod.internal", "port": 5432, "schema": "rag"},
         "vault:kv/pg/prod", "healthy"),
        ("Neo4j Enterprise",   "graph_db",     {"uri": "bolt://neo4j-prod.internal:7687", "database": "rag-knowledge"},
         "vault:kv/neo4j/prod", "healthy"),
        ("Elasticsearch",      "vector_db",    {"url": "https://es-prod.internal:9200", "index": "rag-docs"},
         "vault:kv/elastic/prod", "healthy"),
        ("S3 Document Store",  "storage",      {"bucket": "rag-doc-store-prod", "region": "us-east-1"},
         "vault:kv/aws/s3", "healthy"),
        ("Datadog Observability", "observability", {"site": "datadoghq.com", "service": "rag-studio"},
         "vault:kv/datadog/api", "healthy"),
        ("Cohere Reranker",    "reranker",     {"model": "rerank-english-v3.0"},
         "vault:kv/cohere/prod", "degraded"),
    ]
    integrations = {}
    for name, ptype, config, cred_ref, health in integration_defs:
        intg = _upsert_by(
            session, Integration, "name", name,
            provider_type=ptype,
            credentials_reference=cred_ref,
            default_usage_policies=config,
            reusable=True,
            health_status=health,
        )
        integrations[name] = intg
    counts["integrations"] = len(integration_defs)

    # ── Environments ────────────────────────────────────────────────────────
    env_defs = [
        ("dev",     "Development",  "Local and CI testing",
         {"tier": "dev", "replicas": 1},  "healthy", "not_promoted"),
        ("test",    "Test",         "Integration and acceptance testing",
         {"tier": "test", "replicas": 1}, "healthy", "not_promoted"),
        ("staging", "Staging",      "Pre-production staging mirror",
         {"tier": "staging", "replicas": 2}, "healthy", "pending"),
        ("prod",    "Production",   "Live production environment",
         {"tier": "prod", "replicas": 4,
          "auto_scaling": True, "min_replicas": 2, "max_replicas": 8},
         "healthy", "promoted"),
    ]
    environments = {}
    for ext_id, name, desc, runtime, health, promo in env_defs:
        env = _upsert_by(
            session, Environment, "name", name,
            external_id=ext_id,
            description=desc,
            runtime_profile=runtime,
            health_status=health,
            promotion_status=promo,
        )
        environments[ext_id] = env
    counts["environments"] = len(env_defs)

    # ── Projects ────────────────────────────────────────────────────────────
    project_defs = [
        ("Support Portal Assistant",
         "Customer Support",
         "Assist agents with knowledge retrieval across tickets, KB, and product docs.",
         "hybrid",
         {"owners": ["architect@demo.rag-studio.ai"], "connected_integrations": ["pgvector (prod)", "OpenAI Embeddings", "Anthropic Claude", "Neo4j Enterprise"]}),
        ("Claims Processing RAG",
         "Insurance",
         "Graph-based retrieval over policy documents, claims history, and regulatory rules.",
         "graph",
         {"owners": ["engineer@demo.rag-studio.ai"], "connected_integrations": ["Neo4j Enterprise", "Anthropic Claude", "S3 Document Store"]}),
        ("Compliance Q&A",
         "Regulatory Compliance",
         "Time-aware retrieval for regulatory Q&A with as-of querying for effective-dated rules.",
         "temporal",
         {"owners": ["architect@demo.rag-studio.ai"], "connected_integrations": ["Elasticsearch", "OpenAI Embeddings", "Anthropic Claude"]}),
    ]
    projects = {}
    for name, domain, desc, arch, meta in project_defs:
        proj = _upsert_by(
            session, Project, "name", name,
            business_domain=domain,
            use_case_description=desc,
            selected_architecture_type=arch,
            deployment_status="live",
            owners=meta.get("owners", []),
        )
        projects[name] = proj
    counts["projects"] = len(project_defs)

    # ── Workflows ───────────────────────────────────────────────────────────
    _now = datetime.utcnow()

    def _hybrid_nodes():
        return [
            {"id": "n1", "type": "input_query",      "name": "User Query",          "config": {},                                                   "position": {"x": 80,  "y": 180}},
            {"id": "n2", "type": "query_classifier",  "name": "Intent Classifier",   "config": {"model_ref": "llm:intent-cls"},                      "position": {"x": 280, "y": 180}},
            {"id": "n3", "type": "vector_retriever",  "name": "Semantic Search",     "config": {"index_ref": "vec:kb", "top_k": 20},                  "position": {"x": 500, "y": 80}},
            {"id": "n4", "type": "graph_traversal",   "name": "Graph Hop",           "config": {"db_ref": "graph:neo4j", "max_hops": 2},             "position": {"x": 500, "y": 280}},
            {"id": "n5", "type": "reranker",          "name": "Cohere Reranker",     "config": {"model_ref": "reranker:cohere", "top_k": 5},          "position": {"x": 700, "y": 180}},
            {"id": "n6", "type": "answer_generator",  "name": "Claude Answer Gen",   "config": {"model_ref": "llm:claude-3-5-sonnet", "max_tokens": 1024}, "position": {"x": 900, "y": 180}},
        ]
    def _hybrid_edges():
        return [
            {"id": "e1", "source": "n1", "target": "n2"},
            {"id": "e2", "source": "n2", "target": "n3", "condition": "intent in ['faq','how_to']"},
            {"id": "e3", "source": "n2", "target": "n4", "condition": "intent in ['entity_lookup','relationship']"},
            {"id": "e4", "source": "n3", "target": "n5"},
            {"id": "e5", "source": "n4", "target": "n5"},
            {"id": "e6", "source": "n5", "target": "n6"},
        ]

    def _graph_nodes():
        return [
            {"id": "n1", "type": "input_query",    "name": "Claim Query",       "config": {},                                              "position": {"x": 80,  "y": 180}},
            {"id": "n2", "type": "entity_extractor","name": "NER Extractor",    "config": {"model_ref": "llm:entity-cls"},                 "position": {"x": 280, "y": 180}},
            {"id": "n3", "type": "graph_traversal", "name": "Policy Graph Hop", "config": {"db_ref": "graph:neo4j", "max_hops": 3},       "position": {"x": 500, "y": 180}},
            {"id": "n4", "type": "answer_generator","name": "Claude Answer Gen", "config": {"model_ref": "llm:claude-3-5-sonnet"},         "position": {"x": 700, "y": 180}},
        ]
    def _graph_edges():
        return [
            {"id": "e1", "source": "n1", "target": "n2"},
            {"id": "e2", "source": "n2", "target": "n3"},
            {"id": "e3", "source": "n3", "target": "n4"},
        ]

    def _temporal_nodes():
        return [
            {"id": "n1", "type": "input_query",      "name": "Compliance Question",  "config": {},                                              "position": {"x": 80,  "y": 180}},
            {"id": "n2", "type": "temporal_filter",  "name": "As-Of Query Builder",  "config": {"as_of_strategy": "request_date"},              "position": {"x": 280, "y": 180}},
            {"id": "n3", "type": "vector_retriever", "name": "Regulation Search",    "config": {"index_ref": "vec:compliance", "top_k": 10},  "position": {"x": 500, "y": 180}},
            {"id": "n4", "type": "answer_generator", "name": "Claude Answer Gen",    "config": {"model_ref": "llm:claude-3-5-sonnet"},          "position": {"x": 700, "y": 180}},
        ]
    def _temporal_edges():
        return [
            {"id": "e1", "source": "n1", "target": "n2"},
            {"id": "e2", "source": "n2", "target": "n3"},
            {"id": "e3", "source": "n3", "target": "n4"},
        ]

    workflow_defs = [
        ("Support Hybrid RAG v1.0",       "Hybrid retrieval with vector, intent routing, graph hops, and reranking.",
         "hybrid",   projects["Support Portal Assistant"].id,  _hybrid_nodes(),  _hybrid_edges()),
        ("Claims Graph RAG v1.0",         "Graph-first retrieval over insurance claim and policy graphs.",
         "graph",    projects["Claims Processing RAG"].id,     _graph_nodes(),   _graph_edges()),
        ("Compliance Temporal RAG v1.0",  "Time-aware retrieval with as-of date filtering for regulatory documents.",
         "temporal", projects["Compliance Q&A"].id,            _temporal_nodes(),_temporal_edges()),
    ]
    workflows = {}
    for name, desc, arch, proj_id, nodes, edges in workflow_defs:
        wf = _upsert_by(
            session, WorkflowDefinition, "name", name,
            description=desc,
            architecture_type=arch,
            project_id=proj_id,
            version="1.0.0",
            status="active",
            nodes=nodes,
            edges=edges,
            is_active=True,
        )
        workflows[name] = wf
    counts["workflows"] = len(workflow_defs)

    # ── Governance ─────────────────────────────────────────────────────────
    gov_policy_defs = [
        ("Workflow Publish Policy",    "workflow",     {"require_approval": True, "min_approvers": 2}),
        ("Env Promotion Policy",       "environment",  {"require_approval": True, "min_approvers": 1, "block_on_failed_eval": True}),
        ("Architecture Guardrails",    "architecture", {"allowed_types": ["vector","vectorless","graph","temporal","hybrid","custom"]}),
    ]
    gov_policies = {}
    for name, scope, rules in gov_policy_defs:
        p = _upsert_by(session, GovernancePolicy, "name", name, scope=scope, rules=rules,
                       created_by=admin_user.id)
        gov_policies[name] = p
    counts["governance_policies"] = len(gov_policy_defs)

    approval_rule_defs = [
        ("Publish Approval Gate",    "publish_workflow",    ["Platform Admin", "AI Architect"], True),
        ("Prod Promotion Gate",      "promote_environment", ["Platform Admin"], True),
    ]
    approval_rules = {}
    for name, applies_to, req_roles, active in approval_rule_defs:
        r = _upsert_by(session, ApprovalRule, "name", name,
                       applies_to=applies_to, required_roles=req_roles, active=active)
        approval_rules[name] = r
    counts["approval_rules"] = len(approval_rule_defs)

    for wf in list(workflows.values())[:2]:
        policy = gov_policies["Workflow Publish Policy"]
        existing_binding = session.exec(
            select(GovernanceBinding)
            .where(GovernanceBinding.policy_id == policy.id)
            .where(GovernanceBinding.workflow_id == str(wf.id))
        ).first()
        if not existing_binding:
            session.add(GovernanceBinding(policy_id=policy.id, workflow_id=str(wf.id), status="active"))
    counts["governance_bindings"] = 2

    # ── Architecture Templates already seeded by architectures router ──────
    # Just ensure design sessions are seeded
    for wf_name, arch_type in [
        ("Support Hybrid RAG v1.0", "hybrid"),
        ("Claims Graph RAG v1.0", "graph"),
        ("Compliance Temporal RAG v1.0", "temporal"),
    ]:
        existing_ds = session.exec(
            select(DesignSession).where(DesignSession.architecture_type == arch_type)
        ).first()
        if not existing_ds:
            wf = workflows.get(wf_name)
            session.add(DesignSession(
                architecture_type=arch_type,
                project_id=wf.project_id if wf else None,
                status="completed",
                wizard_state={"completed": True, "steps_done": 4},
                derived_architecture_definition={"architecture_type": arch_type, "workflow_name": wf_name},
            ))
    counts["design_sessions"] = 3

    # ── Audit log samples ──────────────────────────────────────────────────
    audit_samples = [
        (admin_user.id, "workflow.published",    "workflow", "Support Hybrid RAG v1.0"),
        (admin_user.id, "environment.promoted",  "environment", "prod"),
        (admin_user.id, "policy.created",        "governance_policy", "Workflow Publish Policy"),
        (admin_user.id, "user.created",          "user", "architect@demo.rag-studio.ai"),
        (admin_user.id, "integration.registered","integration", "OpenAI Embeddings"),
    ]
    existing_audit_count = len(list(session.exec(select(AuditLog)).all()))
    if existing_audit_count == 0:
        for uid, action, rtype, rid in audit_samples:
            session.add(AuditLog(user_id=uid, action=action, resource_type=rtype, resource_id=rid,
                                  event_data={"source": "demo_seed"}))
    counts["audit_logs"] = len(audit_samples)

    # ── Observability events ───────────────────────────────────────────────
    existing_event_count = len(list(session.exec(select(ObservabilityEvent)).all()))
    if existing_event_count == 0:
        event_samples = [
            ("latency",  "query.p50_ms",       120.0, {"arch": "hybrid"}),
            ("latency",  "query.p99_ms",       340.0, {"arch": "hybrid"}),
            ("quality",  "eval.confidence_avg", 0.87, {"arch": "graph"}),
            ("cost",     "llm.tokens_per_query", 1850, {"arch": "temporal"}),
            ("errors",   "retrieval.timeout_rate", 0.01, {"arch": "hybrid"}),
        ]
        for cat, name, val, meta in event_samples:
            session.add(ObservabilityEvent(user_id=admin_user.id, category=cat, name=name, value=val,
                                            event_data={"source": "demo_seed", **meta}))
    counts["observability_events"] = 5

    session.commit()
    return counts


# ── Router endpoints ─────────────────────────────────────────────────────

@router.post("/seed")
async def seed_demo_data() -> Dict[str, Any]:
    """
    Idempotently seed all demo data.
    Safe to call multiple times – existing records are not duplicated.
    """
    with get_session() as session:
        counts = _seed(session)
    return {"status": "ok", "seeded": counts}


@router.delete("/seed")
async def clear_demo_data() -> Dict[str, Any]:
    """
    Remove the demo admin user (and by cascade / FK, their sessions/prefs).
    Architecture templates and governance policies are kept.
    """
    with get_session() as session:
        admin_email = "admin@demo.rag-studio.ai"
        user = session.exec(select(User).where(User.email == admin_email)).first()
        if user:
            session.delete(user)
            session.commit()
    return {"status": "ok", "cleared": ["demo users and related session/preference rows"]}


@router.get("/seed-status")
async def get_seed_status() -> Dict[str, Any]:
    """
    Returns whether demo data has already been seeded.
    The frontend uses this to auto-seed on first visit.
    """
    with get_session() as session:
        workflow_count = len(list(session.exec(select(WorkflowDefinition)).all()))
        integration_count = len(list(session.exec(select(Integration)).all()))
        environment_count = len(list(session.exec(select(Environment)).all()))
    seeded = workflow_count > 0
    return {
        "seeded": seeded,
        "counts": {
            "workflows": workflow_count,
            "integrations": integration_count,
            "environments": environment_count,
        },
    }

