from typing import Dict

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from models_admin import UserPreference


router = APIRouter()

_PREFERENCES: Dict[int, UserPreference] = {}


class PreferenceUpdate(BaseModel):
    theme: str | None = None
    time_zone: str | None = None
    density: str | None = None
    default_view_id: int | None = None
    settings: dict | None = None


def _get_or_create_for_user(user_id: int) -> UserPreference:
    pref = _PREFERENCES.get(user_id)
    if pref:
        return pref
    pref = UserPreference(user_id=user_id)
    _PREFERENCES[user_id] = pref
    return pref


@router.get("/me", response_model=UserPreference)
async def get_my_preferences(user_id: int) -> UserPreference:
    # For now, accept user_id as a query parameter; later this will come from auth.
    return _get_or_create_for_user(user_id)


@router.patch("/me", response_model=UserPreference)
async def update_my_preferences(user_id: int, payload: PreferenceUpdate) -> UserPreference:
    pref = _get_or_create_for_user(user_id)
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(pref, key, value)
    _PREFERENCES[user_id] = pref
    return pref


