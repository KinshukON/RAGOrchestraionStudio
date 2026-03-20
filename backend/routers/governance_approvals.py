from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import select
from db import get_session
from models_governance import ApprovalRequest, ApprovalVote, ApprovalRule
from models_core import WorkflowDefinition, Environment
from models_admin import AuditLog
from auth_middleware import require_auth, TokenPayload
import logging

router = APIRouter()
_log = logging.getLogger(__name__)

class VotePayload(BaseModel):
    vote: str # "approve" or "reject"
    reason: str = ""

@router.post("/{request_id}/vote")
async def cast_vote(
    request_id: int, 
    payload: VotePayload, 
    current_user: TokenPayload = Depends(require_auth)
):
    """
    Tally a human vote on a pending ApprovalRequest.
    If consensus is reached according to the ApprovalRule, executes the blocked lifecycle action.
    """
    with get_session() as session:
        req = session.get(ApprovalRequest, request_id)
        if not req or req.status != "pending":
            raise HTTPException(400, "Invalid or already-resolved approval request")
        
        rule = session.get(ApprovalRule, req.rule_id)
        if not rule:
            raise HTTPException(500, "Orphaned approval request")
        
        # Validates user role is allowed to vote
        allowed_roles = rule.required_roles or []
        if allowed_roles and current_user.role not in allowed_roles and current_user.role != "Platform Admin":
            raise HTTPException(403, "Your role is not authorized to vote on this gate")

        # Record empirical vote
        vote = ApprovalVote(
            request_id=request_id, 
            user_id=current_user.user_id, 
            role=current_user.role, 
            vote=payload.vote, 
            reason=payload.reason
        )
        session.add(vote)
        session.commit()

        # Re-evaluate Consensus Engine
        votes = list(session.exec(select(ApprovalVote).where(ApprovalVote.request_id == request_id)).all())
        
        consensus_reached = False
        rejection_reached = False

        if rule.consensus_type == "any_approval":
            if any(v.vote == "approve" for v in votes):
                consensus_reached = True
            elif all(v.vote == "reject" for v in votes):
                rejection_reached = True
        else: # "all_required" (Parallel Unanimous)
            if any(v.vote == "reject" for v in votes):
                rejection_reached = True
            else:
                approvals = len([v for v in votes if v.vote == "approve"])
                required = len(allowed_roles) if allowed_roles else 1
                if approvals >= required:
                    consensus_reached = True

        if consensus_reached:
            req.status = "approved"
        elif rejection_reached:
            req.status = "rejected"

        if consensus_reached or rejection_reached:
            session.add(req)
            session.commit()

        # If approved, mutate the target lifecycle state physically
        if consensus_reached:
            if req.target_type == "workflow":
                # Convert from draft to active because the human gate cleared
                wf = session.exec(select(WorkflowDefinition).where(WorkflowDefinition.id == req.target_id)).first()
                if wf:
                    wf.status = "active"
                    wf.is_active = True
                    session.add(wf)
            elif req.target_type == "environment":
                env = session.exec(select(Environment).where(Environment.external_id == req.target_id)).first()
                if env:
                    env.promotion_status = "promoted"
                    env.approval_state = "approved"
                    session.add(env)
            session.commit()

        # Empirical snapshot provenance of the human vote
        session.add(AuditLog(
            action=f"approval_{req.status}" if req.status != "pending" else "approval_vote_cast", 
            resource_type=req.target_type, 
            resource_id=req.target_id, 
            event_data={
                "vote": payload.vote, 
                "reason": payload.reason, 
                "consensus_status": req.status,
                "actor_role": current_user.role
            }, 
            ip=None
        ))
        session.commit()

        return {"status": req.status, "message": "Vote recorded."}
