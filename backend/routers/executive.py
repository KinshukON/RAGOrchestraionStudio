"""
Executive Dashboard & Commercial Packaging API.
WS-6 executive summary + WS-7 business case export.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter
from pydantic import BaseModel
from sqlmodel import select

from db import get_session
from models_core import WorkflowRun

router = APIRouter()


# ── Executive Summary KPIs ────────────────────────────────────────────────

@router.get("/kpis")
async def executive_kpis() -> dict:
    """Executive-level KPI tiles: total runs, success rate, cost, active architectures, readiness."""
    with get_session() as session:
        runs = list(session.exec(select(WorkflowRun)))

    total = len(runs)
    succeeded = sum(1 for r in runs if r.status == "succeeded")
    failed = sum(1 for r in runs if r.status == "failed")

    # Cost aggregation
    total_cost = 0.0
    for r in runs:
        m = getattr(r, "metrics", None) or {}
        c = m.get("cost_estimate") or m.get("total_cost")
        if c is not None:
            total_cost += float(c)

    # Active architectures
    arches = set()
    envs = set()
    for r in runs:
        arch = getattr(r, "architecture_type", None)
        env = getattr(r, "environment_external_id", None)
        if arch:
            arches.add(arch)
        if env:
            envs.add(env)

    # Latency
    latencies = []
    for r in runs:
        s = getattr(r, "started_at", None)
        f = getattr(r, "finished_at", None)
        if s and f:
            latencies.append((f - s).total_seconds() * 1000)

    avg_latency = round(sum(latencies) / max(len(latencies), 1), 1) if latencies else None

    return {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "kpis": {
            "total_runs": total,
            "success_rate": round(succeeded / max(total, 1) * 100, 1),
            "failure_rate": round(failed / max(total, 1) * 100, 1),
            "total_cost": round(total_cost, 2),
            "avg_cost_per_run": round(total_cost / max(total, 1), 4),
            "active_architectures": len(arches),
            "architecture_list": sorted(arches),
            "active_environments": len(envs),
            "environment_list": sorted(envs),
            "avg_latency_ms": avg_latency,
        },
    }


# ── "What Next?" Action Board ────────────────────────────────────────────

@router.get("/action-board")
async def action_board() -> dict:
    """Return prioritized next actions for the platform admin."""
    with get_session() as session:
        runs = list(session.exec(select(WorkflowRun)))

    actions = []
    total = len(runs)
    failed = sum(1 for r in runs if r.status == "failed")
    live = sum(1 for r in runs if not (getattr(r, "is_simulated", False) or False))

    if total == 0:
        actions.append({
            "priority": "high", "category": "onboarding",
            "title": "Run your first workflow",
            "description": "No runs recorded yet. Create a workflow and execute it in the Query Lab.",
            "link": "/query-lab",
        })
    elif total < 10:
        actions.append({
            "priority": "medium", "category": "evaluation",
            "title": f"Increase run count (currently {total})",
            "description": "Run at least 10 evaluation cycles before promoting to production.",
            "link": "/evaluations",
        })

    if total > 0 and failed / max(total, 1) > 0.15:
        actions.append({
            "priority": "high", "category": "reliability",
            "title": f"Address {failed} failed runs ({round(failed/max(total,1)*100)}% failure rate)",
            "description": "Investigate root causes in the Observability console.",
            "link": "/observability?tab=runs&status=failed",
        })

    if total > 5 and live == 0:
        actions.append({
            "priority": "medium", "category": "deployment",
            "title": "Promote to live environment",
            "description": "All runs are simulated. Promote a workflow to a production environment.",
            "link": "/environments",
        })

    # Check integration health
    try:
        from repositories import IntegrationRepository
        integrations = IntegrationRepository().list_integrations()
        unhealthy = [i for i in integrations if i.health_status and i.health_status != "healthy"]
        if unhealthy:
            actions.append({
                "priority": "medium", "category": "integrations",
                "title": f"{len(unhealthy)} integration(s) unhealthy",
                "description": f"Check: {', '.join(i.name for i in unhealthy[:3])}",
                "link": "/integrations",
            })
    except Exception:
        pass

    actions.append({
        "priority": "low", "category": "governance",
        "title": "Review governance policies",
        "description": "Ensure quality thresholds and approval rules are configured for all active architectures.",
        "link": "/governance",
    })

    actions.sort(key=lambda a: {"high": 0, "medium": 1, "low": 2}.get(a["priority"], 3))
    return {"actions": actions, "action_count": len(actions)}


# ── WS-7: Business Case Export ────────────────────────────────────────────

@router.get("/business-case")
async def business_case_export(
    architecture_type: str = "hybrid",
    monthly_query_volume: int = 50000,
    analyst_hours_saved: float = 40,
    analyst_hourly_rate: float = 120,
    platform_setup_cost: float = 25000,
) -> dict:
    """Generate a structured business case document for export as PDF/JSON."""
    try:
        from models_cost import CostProfile
        with get_session() as session:
            profile = session.exec(
                select(CostProfile).where(CostProfile.architecture_type == architecture_type)
            ).first()
    except Exception:
        profile = None

    if not profile:
        return {
            "status": "error",
            "message": f"No cost profile available for '{architecture_type}'. Run cost calculation first.",
        }

    # Compute key numbers
    ret_tokens = profile.default_top_k * profile.default_chunk_size
    cpq = (
        (ret_tokens / 1_000_000) * profile.embedding_cost_per_1m +
        (1800 / 1_000_000) * profile.llm_input_cost_per_1m +
        (350 / 1_000_000) * profile.llm_output_cost_per_1m +
        (ret_tokens / 1_000_000) * getattr(profile, 'reranker_cost_per_1m', 0) +
        (ret_tokens / 1_000_000) * getattr(profile, 'graph_traversal_cost_per_1m', 0)
    )
    storage = getattr(profile, 'index_storage_cost_monthly', 0)
    infra = getattr(profile, 'infra_base_cost_monthly', 0)
    monthly_cost = cpq * monthly_query_volume + storage + infra
    annual_cost = monthly_cost * 12
    manual_monthly = analyst_hours_saved * analyst_hourly_rate
    annual_savings = (manual_monthly * 12) - annual_cost

    # Business impact
    ticket_val = 1000 * getattr(profile, 'ticket_deflection_rate', 0) * 45
    compliance_val = getattr(profile, 'compliance_hours_saved_monthly', 0) * 200
    escalation_val = 80 * getattr(profile, 'escalation_reduction_rate', 0) * 350
    search_val = getattr(profile, 'search_effort_reduction_rate', 0) * analyst_hours_saved * analyst_hourly_rate
    biz_value = ticket_val + compliance_val + escalation_val + search_val
    monthly_net = biz_value - monthly_cost

    import math
    payback = math.ceil(platform_setup_cost / monthly_net) if monthly_net > 0 else None

    risk_score = min(100, round(
        getattr(profile, 'failed_answer_reduction_rate', 0) * 30 +
        getattr(profile, 'escalation_reduction_rate', 0) * 25 +
        getattr(profile, 'ticket_deflection_rate', 0) * 20 +
        (getattr(profile, 'compliance_hours_saved_monthly', 0) / 20) * 25
    ))

    return {
        "document_type": "business_case",
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "architecture": {
            "type": architecture_type,
            "label": profile.label,
            "latency_ms": profile.latency_estimate_ms,
        },
        "investment": {
            "platform_setup_cost": platform_setup_cost,
            "monthly_operating_cost": round(monthly_cost, 2),
            "annual_operating_cost": round(annual_cost, 2),
        },
        "returns": {
            "monthly_business_value": round(biz_value, 2),
            "annual_business_value": round(biz_value * 12, 2),
            "monthly_net_savings": round(monthly_net, 2),
            "annual_net_savings": round(monthly_net * 12, 2),
            "payback_period_months": payback,
        },
        "impact_breakdown": {
            "ticket_deflection_monthly": round(ticket_val, 2),
            "compliance_savings_monthly": round(compliance_val, 2),
            "escalation_savings_monthly": round(escalation_val, 2),
            "search_effort_savings_monthly": round(search_val, 2),
            "manual_labor_savings_monthly": round(manual_monthly, 2),
        },
        "risk_assessment": {
            "risk_reduction_score": risk_score,
            "failed_answer_reduction": f"{getattr(profile, 'failed_answer_reduction_rate', 0)*100:.0f}%",
            "escalation_reduction": f"{getattr(profile, 'escalation_reduction_rate', 0)*100:.0f}%",
            "ticket_deflection": f"{getattr(profile, 'ticket_deflection_rate', 0)*100:.0f}%",
        },
        "executive_recommendation": {
            "recommendation": f"Deploy {profile.label} RAG architecture to achieve ${monthly_net:,.0f}/mo net savings with {risk_score}/100 risk reduction.",
            "why_this_architecture": profile.notes,
            "next_steps": [
                "Configure required integrations (see Integration Hub → Stack Validation)",
                "Run evaluation benchmark suite to validate quality baselines",
                "Deploy to staging environment and promote after governance approval",
                "Monitor in Observability Console for 2 weeks before production promotion",
            ],
        },
        "parameters_used": {
            "monthly_query_volume": monthly_query_volume,
            "analyst_hours_saved": analyst_hours_saved,
            "analyst_hourly_rate": analyst_hourly_rate,
            "platform_setup_cost": platform_setup_cost,
        },
    }


# ── ROI Summary Report ───────────────────────────────────────────────────

@router.get("/roi-summary")
async def roi_summary_report() -> dict:
    """Cross-architecture ROI summary for executive presentation."""
    try:
        from models_cost import CostProfile
        with get_session() as session:
            profiles = list(session.exec(select(CostProfile)))
    except Exception:
        return {"status": "error", "message": "Cost profiles not available."}

    architectures = []
    for p in profiles:
        ret = p.default_top_k * p.default_chunk_size
        cpq = (
            (ret / 1_000_000) * p.embedding_cost_per_1m +
            (1800 / 1_000_000) * p.llm_input_cost_per_1m +
            (350 / 1_000_000) * p.llm_output_cost_per_1m +
            (ret / 1_000_000) * getattr(p, 'reranker_cost_per_1m', 0) +
            (ret / 1_000_000) * getattr(p, 'graph_traversal_cost_per_1m', 0)
        )
        storage = getattr(p, 'index_storage_cost_monthly', 0)
        infra = getattr(p, 'infra_base_cost_monthly', 0)
        monthly_cost = cpq * 50000 + storage + infra

        biz = (
            1000 * getattr(p, 'ticket_deflection_rate', 0) * 45 +
            getattr(p, 'compliance_hours_saved_monthly', 0) * 200 +
            80 * getattr(p, 'escalation_reduction_rate', 0) * 350 +
            getattr(p, 'search_effort_reduction_rate', 0) * 40 * 120
        )

        architectures.append({
            "type": p.architecture_type,
            "label": p.label,
            "monthly_cost": round(monthly_cost, 2),
            "monthly_value": round(biz, 2),
            "monthly_net": round(biz - monthly_cost, 2),
            "latency_ms": p.latency_estimate_ms,
        })

    architectures.sort(key=lambda a: a["monthly_net"], reverse=True)

    return {
        "document_type": "roi_summary",
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "architectures": architectures,
        "recommended": architectures[0]["type"] if architectures else None,
        "total_architectures_evaluated": len(architectures),
    }
