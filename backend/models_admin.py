from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy import Column, JSON
from sqlmodel import Field, SQLModel


class Role(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    description: str = ""
    # JSON blob of high-level permissions (e.g., manageUsers, viewObservability).
    permissions: dict = Field(default_factory=dict, sa_column=Column(JSON, nullable=False))


class RolePermission(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    role_id: int = Field(foreign_key="role.id")
    permission_key: str


class Team(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    description: str = ""
    default_role_id: Optional[int] = Field(default=None, foreign_key="role.id")


class TeamMember(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    team_id: int = Field(foreign_key="team.id")
    user_id: int = Field(foreign_key="user.id")
    role_id: Optional[int] = Field(default=None, foreign_key="role.id")


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str
    name: str
    job_title: str | None = None
    department: str | None = None
    company: str | None = None
    location: str | None = None
    team_id: Optional[int] = Field(default=None, foreign_key="team.id")
    picture_url: str | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
    role_id: Optional[int] = Field(default=None, foreign_key="role.id")
    # External identity fields such as Google subject identifier.
    external_provider: str | None = None
    external_subject: str | None = None


class Session(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_activity_at: datetime = Field(default_factory=datetime.utcnow)
    ip: str | None = None
    user_agent: str | None = None
    status: str = "active"


class View(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    key: str  # e.g., workflow-builder, query-studio, admin-users
    name: str
    description: str = ""
    # Default visibility / pinning configuration, by role name or id.
    defaults: dict = Field(default_factory=dict, sa_column=Column(JSON, nullable=False))


class UserPreference(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    theme: str = "system"
    time_zone: str | None = None
    density: str = "comfortable"
    default_view_id: Optional[int] = Field(default=None, foreign_key="view.id")
    settings: dict = Field(default_factory=dict, sa_column=Column(JSON, nullable=False))


class AuditLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    session_id: Optional[int] = Field(default=None, foreign_key="session.id")
    action: str
    resource_type: str
    resource_id: str
    event_data: dict = Field(default_factory=dict, sa_column=Column(JSON, nullable=False))
    ip: str | None = None


class ObservabilityEvent(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    session_id: Optional[int] = Field(default=None, foreign_key="session.id")
    category: str
    name: str
    value: float | None = None
    event_data: dict = Field(default_factory=dict, sa_column=Column(JSON, nullable=False))
