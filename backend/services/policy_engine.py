"""
Policy Engine for deterministic, multi-scope governance inheritance.
Produces the empirical "EvaluationResult" trace payloads required by the paper case study.
"""
from typing import Dict, Any, List, Optional, Tuple
from pydantic import BaseModel, Field
from sqlmodel import select

from db import get_session
from models_governance import GovernancePolicy, GovernanceBinding
from models_core import WorkflowRun, Environment, WorkflowDefinition

class RuleTrace(BaseModel):
    policy_name: str
    scope_level: str
    original_value: Any
    overridden_by: Optional[str] = None
    final_value: Any

class EvaluationResult(BaseModel):
    is_blocked: bool
    action: str  # e.g., "publish_blocked", "publish_allowed"
    failed_rules: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    evidence_checked: Dict[str, Any] = Field(default_factory=dict)
    rule_trace: Dict[str, RuleTrace] = Field(default_factory=dict)


class PolicyEngine:

    @classmethod
    def resolve_lattice(cls, workflow_id: Optional[str] = None, environment_id: Optional[str] = None) -> Tuple[Dict[str, Any], Dict[str, RuleTrace]]:
        """
        Calculates multi-scope inheritance: Architecture -> Workflow -> Environment.
        Stricter rules win (e.g. higher min thresholds, True overrides False for blocks).
        """
        arch_type = None
        # Extract architecture if workflow is provided
        if workflow_id:
            with get_session() as session:
                wf = session.exec(select(WorkflowDefinition).where(WorkflowDefinition.id == workflow_id)).first()
                if wf:
                    arch_type = wf.architecture_type

        # Fetch all active bindings matching our targets
        bindings: List[GovernanceBinding] = []
        with get_session() as session:
            stmt = select(GovernanceBinding).where(GovernanceBinding.status == "active")
            all_b = list(session.exec(stmt).all())
            for b in all_b:
                if (arch_type and b.architecture_type == arch_type) or \
                   (workflow_id and b.workflow_id == workflow_id) or \
                   (environment_id and str(b.environment_id) == str(environment_id)):
                    bindings.append(b)

        # Map policies
        policy_ids = [b.policy_id for b in bindings]
        policies: List[GovernancePolicy] = []
        if policy_ids:
            with get_session() as session:
                stmt = select(GovernancePolicy).where(GovernancePolicy.id.in_(policy_ids))
                policies = list(session.exec(stmt).all())

        # Sort layers by strictly increasing precedence: architecture (0) -> workflow (1) -> environment (2)
        layers = {"architecture": [], "workflow": [], "environment": []}
        for p in policies:
            scope = p.scope.lower()
            if scope in layers:
                layers[scope].append(p)

        resolved_rules = {}
        trace: Dict[str, RuleTrace] = {}

        # Merge iteratively (lower precedence to higher precedence)
        for scope in ["architecture", "workflow", "environment"]:
            for policy in layers[scope]:
                rules = policy.rules or {}
                for key, val in rules.items():
                    if key not in resolved_rules:
                        resolved_rules[key] = val
                        trace[key] = RuleTrace(
                            policy_name=policy.name,
                            scope_level=scope,
                            original_value=val,
                            final_value=val
                        )
                    else:
                        prev_val = resolved_rules.get(key)
                        new_val = val
                        merged_val = new_val

                        # Stricter wins logic
                        if key in ["min_confidence_score", "min_runs", "timeout_hours"]:
                            try:
                                merged_val = max(float(prev_val), float(new_val))
                            except (TypeError, ValueError):
                                merged_val = new_val
                        elif key == "enforce_pii_redaction":
                            merged_val = bool(prev_val) or bool(new_val)
                        elif key == "blocked_topics":
                            # Merge lists contextually
                            s1 = set([x.strip() for x in str(prev_val).split(",") if x.strip()])
                            s2 = set([x.strip() for x in str(new_val).split(",") if x.strip()])
                            merged_val = ",".join(s1.union(s2))

                        resolved_rules[key] = merged_val
                        
                        # Update trace to reflect override
                        if str(prev_val) != str(merged_val) or scope != trace[key].scope_level:
                            trace[key].overridden_by = scope
                            trace[key].final_value = merged_val

        return resolved_rules, trace

    @classmethod
    def evaluate(cls, workflow_id: str, environment_id: Optional[str] = None, target_action: str = "publish") -> EvaluationResult:
        """
        Gathers live data evidence (WorkflowRun, Environment) and runs it against the resolved lattice.
        Returns the traceable EvaluationResult.
        """
        resolved_rules, rule_trace = cls.resolve_lattice(workflow_id, environment_id)

        # 1. Gather empirical evidence from DB
        run_count = 0
        latest_confidence = 0.0
        readiness_score = 1.0  # Default to 1.0 if not bound to an environment yet

        with get_session() as session:
            # Fetch workflow runs
            runs = list(session.exec(select(WorkflowRun).where(WorkflowRun.workflow_id == workflow_id)).all())
            run_count = len(runs)
            
            if runs:
                runs.sort(key=lambda r: r.created_at, reverse=True)
                latest_run = runs[0]
                out = latest_run.output_payload or {}
                # Handle single or multi-strategy output shapes
                if "confidence_score" in out:
                    latest_confidence = float(out["confidence_score"])
                elif "strategies" in out and isinstance(out["strategies"], list) and out["strategies"]:
                    scores = [s.get("confidence_score", 0) for s in out["strategies"]]
                    if scores:
                        latest_confidence = sum(scores) / len(scores)

            # Fetch environment readiness
            if environment_id:
                # Query environment by external_id (since string environment_id usually refers to external_id here)
                env = session.exec(select(Environment).where(Environment.external_id == environment_id)).first()
                if env:
                    bindings = env.integration_bindings or {}
                    if not bindings:
                        readiness_score = 0.0
                else:
                    readiness_score = 0.0

        evidence_checked = {
            "eval_runs": run_count,
            "confidence_score": latest_confidence,
            "readiness_score": readiness_score,
            "target_environment": environment_id,
            "target_action": target_action
        }

        # 2. Evaluate
        failed_rules = []
        warnings = []
        is_blocked = False

        min_runs = resolved_rules.get("min_runs")
        if min_runs is not None:
            try:
                min_runs_f = float(min_runs)
                if run_count < min_runs_f:
                    failed_rules.append(f"min_runs: requires {min_runs_f}, found {run_count}.")
                    is_blocked = True
            except (ValueError, TypeError):
                pass

        min_score = resolved_rules.get("min_confidence_score")
        if min_score is not None:
            try:
                min_score_f = float(min_score)
                if run_count == 0:
                    failed_rules.append(f"min_confidence_score: requires >= {min_score_f:.0%}, but no runs exist.")
                    is_blocked = True
                elif latest_confidence < min_score_f:
                    failed_rules.append(f"min_confidence_score: requires >= {min_score_f:.0%}, latest scored {latest_confidence:.0%}.")
                    is_blocked = True
                elif latest_confidence < min_score_f + 0.05:
                    warnings.append(f"Confidence {latest_confidence:.0%} approaches threshold {min_score_f:.0%}.")
            except (ValueError, TypeError):
                pass
        
        # Readiness gate for promotion
        if target_action == "promote" and readiness_score < 1.0:
            failed_rules.append("readiness_score: Target environment lacks required integration bindings (Score 0.0).")
            is_blocked = True

        # Promotion Classes
        prom_class = resolved_rules.get("promotion_class", "production_allowed")
        if target_action == "promote" and environment_id:
            with get_session() as session:
                env = session.exec(select(Environment).where(Environment.external_id == environment_id)).first()
                if env:
                    env_name = env.name.lower()
                    if prom_class == "sandbox_only" and env_name != "dev":
                        failed_rules.append(f"promotion_class: Policy restricts to sandbox (dev); attempted {env_name}.")
                        is_blocked = True
                    elif prom_class == "staging_allowed" and env_name == "prod":
                        failed_rules.append(f"promotion_class: Policy restricts to staging; attempted {env_name}.")
                        is_blocked = True
                    elif prom_class == "production_blocked" and env_name == "prod":
                        failed_rules.append(f"promotion_class: Policy explicitly blocks {env_name}.")
                        is_blocked = True

        return EvaluationResult(
            is_blocked=is_blocked,
            action=f"{target_action}_blocked" if is_blocked else f"{target_action}_allowed",
            failed_rules=failed_rules,
            warnings=warnings,
            evidence_checked=evidence_checked,
            rule_trace=rule_trace
        )
