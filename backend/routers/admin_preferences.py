from typing import Any, Dict, Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel
from sqlmodel import select

from db import get_session
from models_admin import UserPreference

router = APIRouter()


class PreferenceOut(BaseModel):
    id: int
    user_id: int
    theme: str
    time_zone: Optional[str]
    density: str
    default_view_id: Optional[int]
    settings: Dict[str, Any]


class PreferenceUpdate(BaseModel):
    theme: str | None = None
    time_zone: str | None = None
    density: str | None = None
    default_view_id: int | None = None
    settings: Dict[str, Any] | None = None


def _to_out(p: UserPreference) -> PreferenceOut:
    return PreferenceOut(
        id=p.id or 0,
        user_id=p.user_id,
        theme=p.theme,
        time_zone=p.time_zone,
        density=p.density,
        default_view_id=p.default_view_id,
        settings=p.settings,
    )


@router.get("/me", response_model=PreferenceOut)
async def get_my_preferences(user_id: int = Query(..., description="ID of the requesting user")) -> PreferenceOut:
    """Return the preference record for user_id, creating a default one on first access."""
    with get_session() as db:
        pref = db.exec(select(UserPreference).where(UserPreference.user_id == user_id)).first()
        if not pref:
            pref = UserPreference(user_id=user_id)
            db.add(pref)
            db.commit()
            db.refresh(pref)
        return _to_out(pref)


@router.patch("/me", response_model=PreferenceOut)
async def update_my_preferences(
    payload: PreferenceUpdate,
    user_id: int = Query(..., description="ID of the requesting user"),
) -> PreferenceOut:
    """Partially update (or create) preferences for user_id."""
    with get_session() as db:
        pref = db.exec(select(UserPreference).where(UserPreference.user_id == user_id)).first()
        if not pref:
            pref = UserPreference(user_id=user_id)
        update_data = payload.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(pref, key, value)
        db.add(pref)
        db.commit()
        db.refresh(pref)
        return _to_out(pref)
