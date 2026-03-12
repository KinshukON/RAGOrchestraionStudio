from typing import Dict, List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from models_admin import Team


router = APIRouter()

_TEAMS: Dict[int, Team] = {}
_ID_COUNTER = 1


class TeamCreate(BaseModel):
    name: str
    description: str | None = None
    default_role_id: int | None = None


class TeamUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    default_role_id: int | None = None


@router.get("/", response_model=List[Team])
async def list_teams() -> List[Team]:
    return list(_TEAMS.values())


@router.post("/", response_model=Team)
async def create_team(payload: TeamCreate) -> Team:
    global _ID_COUNTER
    team = Team(
        id=_ID_COUNTER,
        name=payload.name,
        description=payload.description or "",
        default_role_id=payload.default_role_id,
    )
    _TEAMS[_ID_COUNTER] = team
    _ID_COUNTER += 1
    return team


@router.patch("/{team_id}", response_model=Team)
async def update_team(team_id: int, payload: TeamUpdate) -> Team:
    team = _TEAMS.get(team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(team, key, value)
    _TEAMS[team_id] = team
    return team


