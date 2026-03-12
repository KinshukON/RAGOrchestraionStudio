from typing import Dict, List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from models_admin import User


router = APIRouter()

_USERS: Dict[int, User] = {}
_ID_COUNTER = 1


class UserCreate(BaseModel):
    email: str
    name: str
    role_id: int | None = None
    team_id: int | None = None


class UserUpdate(BaseModel):
    name: str | None = None
    role_id: int | None = None
    team_id: int | None = None
    is_active: bool | None = None


@router.get("/", response_model=List[User])
async def list_users() -> List[User]:
    return list(_USERS.values())


@router.post("/", response_model=User)
async def create_user(payload: UserCreate) -> User:
    global _ID_COUNTER
    for existing in _USERS.values():
        if existing.email == payload.email:
            return existing
    user = User(
        id=_ID_COUNTER,
        email=payload.email,
        name=payload.name,
        role_id=payload.role_id,
        team_id=payload.team_id,
    )
    _USERS[_ID_COUNTER] = user
    _ID_COUNTER += 1
    return user


@router.patch("/{user_id}", response_model=User)
async def update_user(user_id: int, payload: UserUpdate) -> User:
    user = _USERS.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(user, key, value)
    _USERS[user_id] = user
    return user


