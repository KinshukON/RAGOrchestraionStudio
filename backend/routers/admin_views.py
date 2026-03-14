from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlmodel import select

from db import get_session
from models_admin import View

router = APIRouter()


class ViewCreate(BaseModel):
    key: str
    name: str
    description: str = ""
    defaults: Dict[str, Any] = {}


class ViewUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    defaults: Dict[str, Any] | None = None


@router.get("", response_model=List[View])
async def list_views() -> List[View]:
    """List all registered views."""
    with get_session() as db:
        return list(db.exec(select(View)))


@router.post("", response_model=View)
async def create_view(payload: ViewCreate) -> View:
    """Create a view, or return the existing one if the key is already registered."""
    with get_session() as db:
        existing = db.exec(select(View).where(View.key == payload.key)).first()
        if existing:
            return existing
        view = View(
            key=payload.key,
            name=payload.name,
            description=payload.description,
            defaults=payload.defaults,
        )
        db.add(view)
        db.commit()
        db.refresh(view)
        return view


@router.patch("/{view_id}", response_model=View)
async def update_view(view_id: int, payload: ViewUpdate) -> View:
    """Partially update a view record."""
    with get_session() as db:
        view = db.get(View, view_id)
        if not view:
            raise HTTPException(status_code=404, detail="View not found")
        update_data = payload.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(view, key, value)
        db.add(view)
        db.commit()
        db.refresh(view)
        return view


@router.delete("/{view_id}", response_model=dict)
async def delete_view(view_id: int) -> dict:
    with get_session() as db:
        view = db.get(View, view_id)
        if not view:
            raise HTTPException(status_code=404, detail="View not found")
        db.delete(view)
        db.commit()
    return {"deleted": view_id}
