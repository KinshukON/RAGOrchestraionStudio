from typing import List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlmodel import select

from db import get_session
from models_admin import Role, Team, User


router = APIRouter()

# Emails that are always promoted to Admin on bootstrap regardless of order.
_ADMIN_EMAILS = {"dutta.kinshuk@gmail.com"}


class UserCreate(BaseModel):
    email: str
    name: str
    role_id: int | None = None
    team_id: int | None = None
    external_subject: str | None = None


class UserUpdate(BaseModel):
    name: str | None = None
    role_id: int | None = None
    team_id: int | None = None
    is_active: bool | None = None


class BootstrapUser(BaseModel):
    email: str
    name: str
    external_subject: str | None = None


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role_id: int | None = None
    team_id: int | None = None
    is_active: bool | None = None
    role_name: str | None = None
    team_name: str | None = None

    model_config = {"from_attributes": True}


def _enrich(user: User, session) -> UserResponse:
    role_name = None
    team_name = None
    if user.role_id:
        role = session.get(Role, user.role_id)
        role_name = role.name if role else None
    if user.team_id:
        team = session.get(Team, user.team_id)
        team_name = team.name if team else None
    return UserResponse(
        id=user.id,  # type: ignore[arg-type]
        name=user.name,
        email=user.email,
        role_id=user.role_id,
        team_id=user.team_id,
        is_active=user.is_active,
        role_name=role_name,
        team_name=team_name,
    )


@router.get("", response_model=List[UserResponse])
async def list_users() -> List[UserResponse]:
    with get_session() as session:
        users = list(session.exec(select(User)))
        return [_enrich(u, session) for u in users]


@router.post("", response_model=UserResponse)
async def create_user(payload: UserCreate) -> UserResponse:
    with get_session() as session:
        existing = session.exec(select(User).where(User.email == payload.email)).first()
        if existing:
            return _enrich(existing, session)
        user = User(
            email=payload.email,
            name=payload.name,
            role_id=payload.role_id,
            team_id=payload.team_id,
            external_subject=payload.external_subject,
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        return _enrich(user, session)


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(user_id: int, payload: UserUpdate) -> UserResponse:
    with get_session() as session:
        user = session.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        update_data = payload.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(user, key, value)
        session.add(user)
        session.commit()
        session.refresh(user)
        return _enrich(user, session)


@router.delete("/{user_id}", response_model=UserResponse)
async def deactivate_user(user_id: int) -> UserResponse:
    """Soft-deactivate a user (does not delete the record)."""
    with get_session() as session:
        user = session.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        user.is_active = False
        session.add(user)
        session.commit()
        session.refresh(user)
        return _enrich(user, session)


@router.post("/bootstrap", response_model=UserResponse)
async def bootstrap_user(payload: BootstrapUser) -> UserResponse:
    """
    Ensure a User row exists for the currently authenticated Google account.
    - Emails in _ADMIN_EMAILS are always given the Admin role.
    - The very first user (if not in _ADMIN_EMAILS) becomes Admin.
    - Subsequent users become Editors by default.
    - If a user already exists with no role assigned, we fix their role now.
    """
    with get_session() as session:
        # Ensure roles exist.
        from routers.admin_roles import _ensure_seed_roles
        _ensure_seed_roles()

        admin_role = session.exec(select(Role).where(Role.name == "Admin")).first()
        editor_role = session.exec(select(Role).where(Role.name == "Editor")).first()

        existing = session.exec(select(User).where(User.email == payload.email)).first()
        if existing:
            # Promote privileged email if they have no role yet.
            changed = False
            if existing.role_id is None:
                if payload.email in _ADMIN_EMAILS and admin_role:
                    existing.role_id = admin_role.id
                    changed = True
                elif editor_role:
                    existing.role_id = editor_role.id
                    changed = True
            if payload.name and existing.name != payload.name:
                existing.name = payload.name
                changed = True
            if payload.external_subject and not existing.external_subject:
                existing.external_subject = payload.external_subject  # type: ignore[assignment]
                changed = True
            if changed:
                session.add(existing)
                session.commit()
                session.refresh(existing)
            return _enrich(existing, session)

        # Determine default role.
        any_user = session.exec(select(User)).first()
        if payload.email in _ADMIN_EMAILS:
            default_role_id = admin_role.id if admin_role else None
        elif not any_user:
            default_role_id = admin_role.id if admin_role else None
        else:
            default_role_id = editor_role.id if editor_role else None

        user = User(
            email=payload.email,
            name=payload.name,
            role_id=default_role_id,
            external_provider="google",
            external_subject=payload.external_subject,
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        return _enrich(user, session)
