from typing import List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlmodel import select

from db import get_session
from models_admin import Role


router = APIRouter()


class RoleCreate(BaseModel):
    name: str
    description: str | None = None
    permissions: dict | None = None


class RoleUpdate(BaseModel):
    description: str | None = None
    permissions: dict | None = None


def _ensure_seed_roles() -> None:
    with get_session() as session:
        existing = list(session.exec(select(Role)))
        if existing:
            return
        # Seed default roles with simple permissions; these can be refined later.
        seed_data = [
            (
                "Admin",
                "Full administrative access to RAG Studio.",
                {
                    "manageUsers": True,
                    "manageRoles": True,
                    "manageTeams": True,
                    "manageIntegrations": True,
                    "viewObservability": True,
                    "viewWorkflows": True,
                    "editWorkflows": True,
                },
            ),
            (
                "Editor",
                "Can edit workflows and integrations but not manage admins.",
                {
                    "manageUsers": False,
                    "manageRoles": False,
                    "manageTeams": False,
                    "manageIntegrations": True,
                    "viewObservability": True,
                    "viewWorkflows": True,
                    "editWorkflows": True,
                },
            ),
            (
                "Viewer",
                "Read-only access to workflows and observability.",
                {
                    "manageUsers": False,
                    "manageRoles": False,
                    "manageTeams": False,
                    "manageIntegrations": False,
                    "viewObservability": True,
                    "viewWorkflows": True,
                    "editWorkflows": False,
                },
            ),
        ]
        for name, desc, perms in seed_data:
            role = Role(name=name, description=desc, permissions=perms)
            session.add(role)
        session.commit()


@router.get("", response_model=List[Role])
async def list_roles() -> List[Role]:
    _ensure_seed_roles()
    with get_session() as session:
        return list(session.exec(select(Role)))


@router.post("", response_model=Role)
async def create_role(payload: RoleCreate) -> Role:
    with get_session() as session:
        statement = select(Role).where(Role.name == payload.name)
        existing = session.exec(statement).first()
        if existing:
            return existing
        role = Role(
            name=payload.name,
            description=payload.description or "",
            permissions=payload.permissions or {},
        )
        session.add(role)
        session.commit()
        session.refresh(role)
        return role


@router.patch("/{role_id}", response_model=Role)
async def update_role(role_id: int, payload: RoleUpdate) -> Role:
    with get_session() as session:
        role = session.get(Role, role_id)
        if not role:
            raise HTTPException(status_code=404, detail="Role not found")
        update_data = payload.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(role, key, value)
        session.add(role)
        session.commit()
        session.refresh(role)
        return role


