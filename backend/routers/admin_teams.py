from typing import List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlmodel import select

from db import get_session
from models_admin import Team


router = APIRouter()


class TeamCreate(BaseModel):
    name: str
    description: str | None = None
    default_role_id: int | None = None


class TeamUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    default_role_id: int | None = None


@router.get("", response_model=List[Team])
async def list_teams() -> List[Team]:
    with get_session() as session:
        return list(session.exec(select(Team)))


@router.post("", response_model=Team)
async def create_team(payload: TeamCreate) -> Team:
    with get_session() as session:
        team = Team(
            name=payload.name,
            description=payload.description or "",
            default_role_id=payload.default_role_id,
        )
        session.add(team)
        session.commit()
        session.refresh(team)
        return team


@router.patch("/{team_id}", response_model=Team)
async def update_team(team_id: int, payload: TeamUpdate) -> Team:
    with get_session() as session:
        team = session.get(Team, team_id)
        if not team:
            raise HTTPException(status_code=404, detail="Team not found")
        update_data = payload.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(team, key, value)
        session.add(team)
        session.commit()
        session.refresh(team)
        return team

