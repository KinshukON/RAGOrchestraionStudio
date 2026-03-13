from typing import List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlmodel import select

from db import get_session
from models_admin import Role, User


router = APIRouter()


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


@router.get("/", response_model=List[User])
async def list_users() -> List[User]:
    with get_session() as session:
        return list(session.exec(select(User)))


@router.post("/", response_model=User)
async def create_user(payload: UserCreate) -> User:
    with get_session() as session:
        statement = select(User).where(User.email == payload.email)
        existing = session.exec(statement).first()
        if existing:
            return existing
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
        return user


@router.patch("/{user_id}", response_model=User)
async def update_user(user_id: int, payload: UserUpdate) -> User:
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
        return user


@router.post("/bootstrap", response_model=User)
async def bootstrap_user(payload: BootstrapUser) -> User:
    """
    Ensure a User row exists for the currently authenticated Google account.
    The very first user becomes Admin; subsequent users become Editors by default.
    """
    with get_session() as session:
        # If user already exists, return it.
        statement = select(User).where(User.email == payload.email)
        existing = session.exec(statement).first()
        if existing:
            return existing

        # Determine default role.
        admin_role = session.exec(select(Role).where(Role.name == "Admin")).first()
        editor_role = session.exec(select(Role).where(Role.name == "Editor")).first()
        any_user = session.exec(select(User)).first()
        default_role_id = admin_role.id if not any_user and admin_role else editor_role.id if editor_role else None

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
        return user

