"""
Observability API — AI Operating Console.
Workflow runs, run detail, task timeline, causal explanations,
comparative analytics, decision recommendations, and audit integration.
"""
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlmodel import select

from db import get_session
from models_core import TaskExecution, WorkflowRun

router = APIRouter()


# ── Pydantic models ───────────────────────────────────────────────────────

class RunSummary(BaseModel):
    id: int
    workflow_id: str
    status: str
    created_at: str
    finished_at: Optional[str]
    architecture_type: Optional[str] = None
    strategy_id: Optional[str] = None
    environment_external_id: Optional[str] = None
    is_simulated: bool = False
    metrics: Dict[str, Any] = {}


class RunDetail(BaseModel):
    id: int
    workflow_id: str
    status: str
    created_at: str
    started_at: Optional[str]
    finished_at: Optional[str]
    input_payload: Dict[str, Any]
    output_payload: Dict[str, Any]
    architecture_type: Optional[str] = None
    strategy_id: Optional[str] = None
    environment_external_id: Optional[str] = None
    is_simulated: bool = False
    metrics: Dict[str, Any] = {}


class TaskSummary(BaseModel):
    id: int
    run_id: int
    node_id: str
    node_type: str
    status: str
    started_at: Optional[str]
    finished_at: Optional[str]
    step_index: Optional[int]
    error: Optional[str]
    trace_metadata: Dict[str, Any]


# ── Helpers ───────────────────────────────────────────────────────────────

def _get(r: WorkflowRun, attr: str, default: Any = None) -> Any:
    """Safe get for optional columns that may not exist on older DB schema."""
    return getattr(r, attr, default)


def _run_to_summary(r: WorkflowRun) -> RunSummary:
    return RunSummary(
        id=r.id or 0,
        workflow_id=r.workflow_id,
        status=r.status,
        created_at=r.created_at.isoformat(),
        finished_at=r.finished_at.isoformat() if r.finished_at else None,
        architecture_type=_get(r, "architecture_type"),
        strategy_id=_get(r, "strategy_id"),
        environment_external_id=_get(r, "environment_external_id"),
        is_simulated=_get(r, "is_simulated", False) or False,
        metrics=_get(r, "metrics") or {},
    )


def _run_to_detail(r: WorkflowRun) -> RunDetail:
    return RunDetail(
        id=r.id or 0,
        workflow_id=r.workflow_id,
        status=r.status,
        created_at=r.created_at.isoformat(),
        started_at=r.started_at.isoformat() if r.started_at else None,
        finished_at=r.finished_at.isoformat() if r.finished_at else None,
        input_payload=r.input_payload or {},
        output_payload=r.output_payload or {},
        architecture_type=_get(r, "architecture_type"),
        strategy_id=_get(r, "strategy_id"),
        environment_external_id=_get(r, "environment_external_id"),
        is_simulated=_get(r, "is_simulated", False) or False,
        metrics=_get(r, "metrics") or {},
    )


def _latency_ms(r: WorkflowRun) -> Optional[float]:
    """Compute run latency in ms from started_at/finished_at."""
    s = getattr(r, "started_at", None)
    f = getattr(r, "finished_at", None)
    if s and f:
        return (f - s).total_seconds() * 1000
    return None


def _percentile(values: List[float], pct: float) -> float:
    if not values:
        return 0.0
    s = sorted(values)
    idx = int(len(s) * pct)
    idx = min(idx, len(s) - 1)
    return round(s[idx], 1)


# ── Core run endpoints ────────────────────────────────────────────────────

@router.get("/runs", response_model=List[RunSummary])
async def list_runs(
    workflow_id: Optional[str] = None,
    status: Optional[str] = None,
    is_simulated: Optional[bool] = None,
) -> List[RunSummary]:
    with get_session() as session:
        runs = list(session.exec(select(WorkflowRun)))
    if workflow_id:
        runs = [r for r in runs if r.workflow_id == workflow_id]
    if status:
        runs = [r for r in runs if r.status == status]
    if is_simulated is not None:
        runs = [r for r in runs if (_get(r, "is_simulated", False) or False) == is_simulated]
    runs.sort(key=lambda r: r.created_at, reverse=True)
    return [_run_to_summary(r) for r in runs]


@router.get("/runs/{run_id}", response_model=RunDetail)
async def get_run(run_id: int) -> RunDetail:
    with get_session() as session:
        run = session.get(WorkflowRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return _run_to_detail(run)


@router.get("/runs/{run_id}/tasks", response_model=List[TaskSummary])
async def list_run_tasks(run_id: int) -> List[TaskSummary]:
    with get_session() as session:
        run = session.get(WorkflowRun, run_id)
        if not run:
            raise HTTPException(status_code=404, detail="Run not found")
        tasks = list(session.exec(select(TaskExecution).where(TaskExecution.run_id == run_id)))

    def _task_meta(te: TaskExecution) -> dict:
        return getattr(te, "trace_metadata", None) or {}

    tasks.sort(key=lambda t: (getattr(t, "step_index", None) if getattr(t, "step_index", None) is not None else 999, t.id or 0))
    return [
        TaskSummary(
            id=t.id or 0,
            run_id=t.run_id,
            node_id=t.node_id,
            node_type=t.node_type,
            status=t.status,
            started_at=t.started_at.isoformat() if t.started_at else None,
            finished_at=t.finished_at.isoformat() if t.finished_at else None,
            step_index=getattr(t, "step_index", None),
            error=t.error,
            trace_metadata=_task_meta(t),
        )
        for t in tasks
    ]


# ── Trace export ──────────────────────────────────────────────────────────

@router.get("/runs/{run_id}/export")
async def export_run_trace(run_id: int) -> JSONResponse:
    """Export a complete trace bundle for a run (JSON download)."""
    with get_session() as session:
        run = session.get(WorkflowRun, run_id)
        if not run:
            raise HTTPException(404, "Run not found")
        tasks = list(session.exec(select(TaskExecution).where(TaskExecution.run_id == run_id)))

    tasks.sort(key=lambda t: (getattr(t, "step_index", None) or 999, t.id or 0))
    return JSONResponse(content={
        "export_type": "trace_bundle",
        "exported_at": datetime.utcnow().isoformat() + "Z",
        "run": {
            "id": run.id,
            "workflow_id": run.workflow_id,
            "status": run.status,
            "architecture_type": _get(run, "architecture_type"),
            "strategy_id": _get(run, "strategy_id"),
            "environment": _get(run, "environment_external_id"),
            "is_simulated": _get(run, "is_simulated", False) or False,
            "created_at": run.created_at.isoformat() if run.created_at else None,
            "started_at": run.started_at.isoformat() if run.started_at else None,
            "finished_at": run.finished_at.isoformat() if run.finished_at else None,
            "latency_ms": _latency_ms(run),
            "input_payload": run.input_payload or {},
            "output_payload": run.output_payload or {},
            "metrics": _get(run, "metrics") or {},
        },
        "tasks": [
            {
                "id": t.id,
                "node_id": t.node_id,
                "node_type": t.node_type,
                "status": t.status,
                "step_index": getattr(t, "step_index", None),
                "started_at": t.started_at.isoformat() if t.started_at else None,
                "finished_at": t.finished_at.isoformat() if t.finished_at else None,
                "error": t.error,
                "trace_metadata": getattr(t, "trace_metadata", None) or {},
            }
            for t in tasks
        ],
    })


# ── B. Comparative: Run Diff ─────────────────────────────────────────────

@router.get("/runs/diff")
async def diff_runs(run_a: int, run_b: int) -> dict:
    """Side-by-side comparison of two runs: status, latency, metrics, tasks."""
    with get_session() as session:
        a = session.get(WorkflowRun, run_a)
        b = session.get(WorkflowRun, run_b)
        if not a or not b:
            raise HTTPException(404, "One or both runs not found")
        tasks_a = list(session.exec(select(TaskExecution).where(TaskExecution.run_id == run_a)))
        tasks_b = list(session.exec(select(TaskExecution).where(TaskExecution.run_id == run_b)))

    lat_a = _latency_ms(a)
    lat_b = _latency_ms(b)

    def _task_summary(t: TaskExecution) -> dict:
        return {"node_id": t.node_id, "node_type": t.node_type, "status": t.status, "error": t.error}

    return {
        "run_a": {
            "id": a.id, "status": a.status,
            "architecture_type": _get(a, "architecture_type"),
            "strategy_id": _get(a, "strategy_id"),
            "environment": _get(a, "environment_external_id"),
            "is_simulated": _get(a, "is_simulated", False) or False,
            "latency_ms": lat_a,
            "metrics": _get(a, "metrics") or {},
            "task_count": len(tasks_a),
            "failed_tasks": [_task_summary(t) for t in tasks_a if t.status == "failed"],
        },
        "run_b": {
            "id": b.id, "status": b.status,
            "architecture_type": _get(b, "architecture_type"),
            "strategy_id": _get(b, "strategy_id"),
            "environment": _get(b, "environment_external_id"),
            "is_simulated": _get(b, "is_simulated", False) or False,
            "latency_ms": lat_b,
            "metrics": _get(b, "metrics") or {},
            "task_count": len(tasks_b),
            "failed_tasks": [_task_summary(t) for t in tasks_b if t.status == "failed"],
        },
        "diff": {
            "latency_delta_ms": round((lat_a or 0) - (lat_b or 0), 1),
            "status_changed": a.status != b.status,
            "architecture_changed": _get(a, "architecture_type") != _get(b, "architecture_type"),
            "environment_changed": _get(a, "environment_external_id") != _get(b, "environment_external_id"),
            "task_count_delta": len(tasks_a) - len(tasks_b),
        },
    }


# ── D. Operations Analytics ──────────────────────────────────────────────

@router.get("/analytics/operations")
async def operations_analytics() -> dict:
    """Operations tab: latency percentiles, success rate, error taxonomy, live/sim split."""
    with get_session() as session:
        runs = list(session.exec(select(WorkflowRun)))

    latencies = [l for r in runs if (l := _latency_ms(r)) is not None]
    total = len(runs)
    succeeded = sum(1 for r in runs if r.status == "succeeded")
    failed = sum(1 for r in runs if r.status == "failed")
    running = sum(1 for r in runs if r.status == "running")
    live_count = sum(1 for r in runs if not (_get(r, "is_simulated", False) or False))
    sim_count = total - live_count

    # Error taxonomy
    error_counts: Dict[str, int] = defaultdict(int)
    for r in runs:
        if r.status == "failed":
            metrics = _get(r, "metrics") or {}
            err_type = metrics.get("error_type", "unknown")
            error_counts[err_type] += 1

    # Env instability: failures per environment
    env_failures: Dict[str, int] = defaultdict(int)
    env_totals: Dict[str, int] = defaultdict(int)
    for r in runs:
        env = _get(r, "environment_external_id") or "unbound"
        env_totals[env] += 1
        if r.status == "failed":
            env_failures[env] += 1

    env_instability = [
        {"environment": e, "failure_rate": round(env_failures[e] / max(env_totals[e], 1), 3), "total_runs": env_totals[e]}
        for e in sorted(env_totals.keys())
    ]

    return {
        "total_runs": total,
        "succeeded": succeeded,
        "failed": failed,
        "running": running,
        "success_rate": round(succeeded / max(total, 1), 3),
        "latency_p50": _percentile(latencies, 0.50),
        "latency_p95": _percentile(latencies, 0.95),
        "latency_p99": _percentile(latencies, 0.99),
        "latency_avg": round(sum(latencies) / max(len(latencies), 1), 1),
        "live_run_count": live_count,
        "simulated_run_count": sim_count,
        "live_vs_sim_ratio": round(live_count / max(sim_count, 1), 2),
        "error_taxonomy": dict(error_counts),
        "environment_instability": env_instability,
    }


# ── E. Quality Analytics ─────────────────────────────────────────────────

@router.get("/analytics/quality")
async def quality_analytics() -> dict:
    """Quality tab: groundedness drift, pass/fail trend, failure modes, citation completeness."""
    with get_session() as session:
        runs = list(session.exec(select(WorkflowRun)))

    # Group runs by architecture for failure mode analysis
    arch_stats: Dict[str, Dict[str, int]] = defaultdict(lambda: {"total": 0, "failed": 0})
    for r in runs:
        arch = _get(r, "architecture_type") or "unknown"
        arch_stats[arch]["total"] += 1
        if r.status == "failed":
            arch_stats[arch]["failed"] += 1

    failure_modes = [
        {"architecture": a, "failure_rate": round(s["failed"] / max(s["total"], 1), 3), "total": s["total"], "failed": s["failed"]}
        for a, s in sorted(arch_stats.items())
    ]

    # Groundedness drift by workflow (simulated from metrics)
    wf_quality: Dict[str, List[float]] = defaultdict(list)
    for r in runs:
        m = _get(r, "metrics") or {}
        if "confidence_score" in m:
            wf_quality[r.workflow_id].append(m["confidence_score"])

    groundedness_drift = [
        {
            "workflow_id": wf,
            "avg_confidence": round(sum(scores) / len(scores), 3),
            "latest_confidence": round(scores[-1], 3) if scores else 0,
            "drift": round(scores[-1] - scores[0], 3) if len(scores) > 1 else 0,
            "sample_count": len(scores),
        }
        for wf, scores in sorted(wf_quality.items())
        if scores
    ]

    # Citation completeness from metrics
    citation_scores = [m.get("citation_completeness", 0) for r in runs if (m := _get(r, "metrics") or {}).get("citation_completeness")]
    avg_citation = round(sum(citation_scores) / max(len(citation_scores), 1), 3) if citation_scores else None

    return {
        "failure_modes_by_architecture": failure_modes,
        "groundedness_drift": groundedness_drift,
        "avg_citation_completeness": avg_citation,
        "total_runs_analysed": len(runs),
    }


# ── F. Governance Analytics ──────────────────────────────────────────────

@router.get("/analytics/governance")
async def governance_analytics() -> dict:
    """Governance risk tab: violation trends, blocked reasons, at-risk workflows, approval aging."""
    try:
        from models_admin import AuditLog
        with get_session() as session:
            logs = list(session.exec(select(AuditLog)))
    except Exception:
        logs = []

    # Blocked publish/promote reasons
    blocked_reasons: Dict[str, int] = defaultdict(int)
    violation_count = 0
    for log in logs:
        action = getattr(log, "action", "")
        if "block" in action.lower() or "denied" in action.lower() or "violation" in action.lower():
            violation_count += 1
            resource = getattr(log, "resource_type", "unknown")
            blocked_reasons[resource] += 1

    # Approval aging (time since last governance action)
    governance_actions = [log for log in logs if "approv" in getattr(log, "action", "").lower() or "publish" in getattr(log, "action", "").lower()]
    if governance_actions:
        latest = max(governance_actions, key=lambda l: getattr(l, "timestamp", ""))
        ts = getattr(latest, "timestamp", None)
        if ts and isinstance(ts, datetime):
            age_hours = (datetime.utcnow() - ts).total_seconds() / 3600
        else:
            age_hours = None
    else:
        age_hours = None

    return {
        "total_audit_entries": len(logs),
        "violation_count": violation_count,
        "blocked_reasons_by_resource": dict(blocked_reasons),
        "latest_governance_action_age_hours": round(age_hours, 1) if age_hours else None,
        "governance_action_count": len(governance_actions),
    }


# ── G. Cost Analytics ────────────────────────────────────────────────────

@router.get("/analytics/cost")
async def cost_analytics() -> dict:
    """Cost tab: cost drift, expensive nodes, cost per grounded answer, TCO by arch."""
    with get_session() as session:
        runs = list(session.exec(select(WorkflowRun)))
        tasks = list(session.exec(select(TaskExecution)))

    # Cost by architecture
    arch_cost: Dict[str, List[float]] = defaultdict(list)
    for r in runs:
        arch = _get(r, "architecture_type") or "unknown"
        m = _get(r, "metrics") or {}
        cost = m.get("cost_estimate", m.get("total_cost"))
        if cost is not None:
            arch_cost[arch].append(float(cost))

    tco_by_arch = [
        {"architecture": a, "avg_cost": round(sum(c) / len(c), 4), "total_cost": round(sum(c), 2), "run_count": len(c)}
        for a, c in sorted(arch_cost.items())
        if c
    ]

    # Most expensive nodes
    node_cost: Dict[str, List[float]] = defaultdict(list)
    for t in tasks:
        meta = getattr(t, "trace_metadata", None) or {}
        cost = meta.get("cost_estimate", meta.get("token_cost"))
        if cost is not None:
            node_cost[t.node_type].append(float(cost))

    expensive_nodes = sorted(
        [{"node_type": n, "avg_cost": round(sum(c) / len(c), 6), "total_cost": round(sum(c), 4), "count": len(c)} for n, c in node_cost.items()],
        key=lambda x: x["total_cost"],
        reverse=True,
    )[:10]

    # Live vs simulated cost
    live_costs = []
    sim_costs = []
    for r in runs:
        m = _get(r, "metrics") or {}
        cost = m.get("cost_estimate", m.get("total_cost"))
        if cost is not None:
            if _get(r, "is_simulated", False):
                sim_costs.append(float(cost))
            else:
                live_costs.append(float(cost))

    return {
        "tco_by_architecture": tco_by_arch,
        "most_expensive_nodes": expensive_nodes,
        "live_cost_total": round(sum(live_costs), 2),
        "simulated_cost_total": round(sum(sim_costs), 2),
        "live_avg_cost_per_run": round(sum(live_costs) / max(len(live_costs), 1), 4),
        "sim_avg_cost_per_run": round(sum(sim_costs) / max(len(sim_costs), 1), 4),
    }


# ── A. Causal Observability ──────────────────────────────────────────────

@router.get("/analytics/causal/{run_id}")
async def causal_analysis(run_id: int) -> dict:
    """Explain WHY a run succeeded/failed: strategy selection, governance, cost, quality."""
    with get_session() as session:
        run = session.get(WorkflowRun, run_id)
        if not run:
            raise HTTPException(404, "Run not found")
        tasks = list(session.exec(select(TaskExecution).where(TaskExecution.run_id == run_id)))

    explanations = []
    metrics = _get(run, "metrics") or {}
    output = run.output_payload or {}

    # Strategy selection reason
    arch = _get(run, "architecture_type")
    strategy = _get(run, "strategy_id")
    if arch:
        explanations.append({
            "category": "strategy_selection",
            "title": f"Strategy '{strategy or arch}' was selected",
            "detail": f"Architecture type '{arch}' was configured for this workflow. " +
                      (f"Strategy '{strategy}' was chosen based on the workflow routing rules." if strategy else "Default strategy was used."),
            "severity": "info",
        })

    # Failure root cause
    if run.status == "failed":
        failed_tasks = [t for t in tasks if t.status == "failed"]
        for ft in failed_tasks:
            explanations.append({
                "category": "failure_root_cause",
                "title": f"Task '{ft.node_id}' ({ft.node_type}) failed",
                "detail": ft.error or "No error message recorded.",
                "severity": "error",
                "action": f"Open node '{ft.node_id}' in Workflow Builder to inspect configuration.",
            })

    # Cost spike detection
    cost = metrics.get("cost_estimate") or metrics.get("total_cost")
    if cost and float(cost) > 0.5:
        explanations.append({
            "category": "cost_spike",
            "title": f"High cost detected: ${float(cost):.4f}",
            "detail": "This run's cost exceeds the $0.50 threshold. Check token-heavy nodes or excessive retrieval depth.",
            "severity": "warning",
            "action": "Reduce top_k or chunk_size, or consider a lower-cost architecture.",
        })

    # Latency anomaly
    lat = _latency_ms(run)
    if lat and lat > 5000:
        explanations.append({
            "category": "latency_anomaly",
            "title": f"High latency: {lat:.0f}ms",
            "detail": "This run exceeded 5s end-to-end latency. Likely caused by graph traversal depth or multi-round agent loops.",
            "severity": "warning",
            "action": "Review per-node latency in TraceExplorer.",
        })

    # Governance block
    if output.get("governance_blocked"):
        explanations.append({
            "category": "governance_block",
            "title": "Governance policy blocked this run",
            "detail": output.get("governance_block_reason", "A governance policy prevented execution."),
            "severity": "error",
            "action": "Check Governance → Policies for the active policy on this workflow.",
        })

    # Quality assessment
    confidence = metrics.get("confidence_score")
    if confidence is not None and float(confidence) < 0.6:
        explanations.append({
            "category": "quality_drop",
            "title": f"Low confidence score: {float(confidence):.2f}",
            "detail": "Confidence below 0.60 indicates weak retrieval relevance or poor grounding.",
            "severity": "warning",
            "action": "Run benchmark evaluation to identify retrieval gaps.",
        })

    return {
        "run_id": run_id,
        "status": run.status,
        "architecture": arch,
        "explanations": explanations,
        "explanation_count": len(explanations),
    }


# ── B. Comparative Analytics ─────────────────────────────────────────────

@router.get("/analytics/compare")
async def compare_analytics(
    group_by: str = "architecture",  # architecture | environment | week
) -> dict:
    """Compare groups (arch vs arch, env vs env) with aggregated stats."""
    with get_session() as session:
        runs = list(session.exec(select(WorkflowRun)))

    groups: Dict[str, List[WorkflowRun]] = defaultdict(list)
    for r in runs:
        if group_by == "architecture":
            key = _get(r, "architecture_type") or "unknown"
        elif group_by == "environment":
            key = _get(r, "environment_external_id") or "unbound"
        elif group_by == "week":
            key = r.created_at.strftime("%Y-W%W") if r.created_at else "unknown"
        else:
            key = "all"
        groups[key].append(r)

    result = []
    for key, group_runs in sorted(groups.items()):
        lats = [l for r in group_runs if (l := _latency_ms(r)) is not None]
        succeeded = sum(1 for r in group_runs if r.status == "succeeded")
        total = len(group_runs)
        costs = [float(m.get("cost_estimate", 0)) for r in group_runs if (m := _get(r, "metrics") or {}).get("cost_estimate")]

        result.append({
            "group": key,
            "total_runs": total,
            "success_rate": round(succeeded / max(total, 1), 3),
            "latency_p50": _percentile(lats, 0.50),
            "latency_p95": _percentile(lats, 0.95),
            "avg_cost": round(sum(costs) / max(len(costs), 1), 4) if costs else 0,
            "total_cost": round(sum(costs), 2) if costs else 0,
        })

    return {
        "group_by": group_by,
        "groups": result,
        "total_runs_analysed": len(runs),
    }


# ── C. Decision-Oriented: Recommendations ────────────────────────────────

@router.get("/analytics/recommendations")
async def recommendations() -> dict:
    """Generate recommended actions based on current run data and patterns."""
    with get_session() as session:
        runs = list(session.exec(select(WorkflowRun)))

    recs = []

    # Rule 1: High failure rate
    total = len(runs)
    failed = sum(1 for r in runs if r.status == "failed")
    if total > 0 and failed / total > 0.2:
        recs.append({
            "priority": "high",
            "category": "reliability",
            "title": f"High failure rate: {failed}/{total} runs ({round(failed/total*100)}%)",
            "recommendation": "Investigate failed runs in TraceExplorer. Consider adding fallback strategies or retry logic.",
            "action_link": "/observability?tab=runs&status=failed",
        })

    # Rule 2: Latency spikes by architecture
    arch_lats: Dict[str, List[float]] = defaultdict(list)
    for r in runs:
        lat = _latency_ms(r)
        if lat is not None:
            arch = _get(r, "architecture_type") or "unknown"
            arch_lats[arch].append(lat)
    for arch, lats in arch_lats.items():
        p95 = _percentile(lats, 0.95)
        if p95 > 3000:
            recs.append({
                "priority": "medium",
                "category": "performance",
                "title": f"{arch} P95 latency is {p95:.0f}ms",
                "recommendation": f"Consider reducing hop depth or top_k for {arch}, or switch to a lower-latency architecture for this workload.",
                "action_link": f"/cost-roi?architecture={arch}",
            })

    # Rule 3: Architecture with better cost profile
    arch_costs: Dict[str, float] = {}
    for r in runs:
        arch = _get(r, "architecture_type") or "unknown"
        m = _get(r, "metrics") or {}
        c = m.get("cost_estimate")
        if c is not None:
            arch_costs.setdefault(arch, 0)
            arch_costs[arch] += float(c)
    if len(arch_costs) >= 2:
        most_expensive = max(arch_costs, key=arch_costs.get)  # type: ignore
        cheapest = min(arch_costs, key=arch_costs.get)  # type: ignore
        if arch_costs[most_expensive] > 0:
            recs.append({
                "priority": "low",
                "category": "cost_optimization",
                "title": f"{most_expensive} is the most expensive architecture",
                "recommendation": f"Consider {cheapest} for applicable workloads — it has lower cost at similar quality.",
                "action_link": "/cost-roi?tab=tco-comparator",
            })

    # Rule 4: No live runs (only simulated)
    live_count = sum(1 for r in runs if not (_get(r, "is_simulated", False) or False))
    if total > 5 and live_count == 0:
        recs.append({
            "priority": "medium",
            "category": "deployment",
            "title": "All runs are simulated — no live traffic observed",
            "recommendation": "Promote a workflow to a non-simulated environment to validate real-world performance.",
            "action_link": "/environments",
        })

    # Rule 5: Insufficient run count for promotion
    if 0 < total < 10:
        recs.append({
            "priority": "low",
            "category": "governance",
            "title": f"Only {total} runs recorded — insufficient for confident promotion",
            "recommendation": "Run at least 10 evaluation cycles before promoting to staging/production.",
            "action_link": "/evaluations",
        })

    recs.sort(key=lambda r: {"high": 0, "medium": 1, "low": 2}.get(r["priority"], 3))

    return {
        "recommendations": recs,
        "recommendation_count": len(recs),
        "runs_analysed": total,
    }

