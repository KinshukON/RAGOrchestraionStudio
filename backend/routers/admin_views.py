from typing import Dict, List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from models_admin import View


router = APIRouter()

_VIEWS: Dict[int, View] = {}
_ID_COUNTER = 1


class ViewCreate(BaseModel):
    key: str
    name: str
    description: str | None = None
    defaults: dict | None = None


class ViewUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    defaults: dict | None = None


@router.get("/", response_model=List[View])
async def list_views() -> List[View]:
    return list(_VIEWS.values())


@router.post("/", response_model=View)
async def create_view(payload: ViewCreate) -> View:
    global _ID_COUNTER
    for existing in _VIEWS.values():
        if existing.key == payload.key:
            return existing
    view = View(
        id=_ID_COUNTER,
        key=payload.key,
        name=payload.name,
        description=payload.description or "",
        defaults=payload.defaults or {},
    )
    _VIEWS[_ID_COUNTER] = view
    _ID_COUNTER += 1
    return view


@router.patch("/{view_id}", response_model=View)
async def update_view(view_id: int, payload: ViewUpdate) -> View:
    view = _VIEWS.get(view_id)
    if not view:
        raise HTTPException(status_code=404, detail="View not found")
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(view, key, value)
    _VIEWS[view_id] = view
    return view


