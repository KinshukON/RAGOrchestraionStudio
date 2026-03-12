from typing import Dict, List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from models_admin import Role


router = APIRouter()

_ROLES: Dict[int, Role] = {}
_ID_COUNTER = 1


class RoleCreate(BaseModel):
  name: str
  description: str | None = None
  permissions: dict | None = None


class RoleUpdate(BaseModel):
  description: str | None = None
  permissions: dict | None = None


@router.get("/", response_model=List[Role])
async def list_roles() -> List[Role]:
  return list(_ROLES.values())


@router.post("/", response_model=Role)
async def create_role(payload: RoleCreate) -> Role:
  global _ID_COUNTER
  for existing in _ROLES.values():
    if existing.name == payload.name:
      return existing
  role = Role(
    id=_ID_COUNTER,
    name=payload.name,
    description=payload.description or "",
    permissions=payload.permissions or {},
  )
  _ROLES[_ID_COUNTER] = role
  _ID_COUNTER += 1
  return role


@router.patch("/{role_id}", response_model=Role)
async def update_role(role_id: int, payload: RoleUpdate) -> Role:
  role = _ROLES.get(role_id)
  if not role:
    raise HTTPException(status_code=404, detail="Role not found")
  update_data = payload.model_dump(exclude_unset=True)
  for key, value in update_data.items():
    setattr(role, key, value)
  _ROLES[role_id] = role
  return role


