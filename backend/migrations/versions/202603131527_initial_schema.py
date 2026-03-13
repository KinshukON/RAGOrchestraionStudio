"""initial_schema

Revision ID: 202603131527
Revises: 
Create Date: 2026-03-13 15:27:00

Initial migration: creates all tables defined in the RAG Studio SQLModel models.
  - models_admin:    role, rolepermission, team, teammember, user, session,
                     view, userpreference, auditlog, observabilityevent
  - models_core:     project, integration, environment, workflowrun, taskexecution
  - models_architecture: architecturetemplate, designsession
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON

# revision identifiers
revision: str = "202603131527"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── models_admin ─────────────────────────────────────────────────────────

    op.create_table(
        "role",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=False, server_default=""),
        sa.Column("permissions", JSON(), nullable=False, server_default="{}"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "rolepermission",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("role_id", sa.Integer(), sa.ForeignKey("role.id"), nullable=False),
        sa.Column("permission_key", sa.String(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "team",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=False, server_default=""),
        sa.Column("default_role_id", sa.Integer(), sa.ForeignKey("role.id"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "user",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("job_title", sa.String(), nullable=True),
        sa.Column("department", sa.String(), nullable=True),
        sa.Column("company", sa.String(), nullable=True),
        sa.Column("location", sa.String(), nullable=True),
        sa.Column("team_id", sa.Integer(), sa.ForeignKey("team.id"), nullable=True),
        sa.Column("picture_url", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("role_id", sa.Integer(), sa.ForeignKey("role.id"), nullable=True),
        sa.Column("external_provider", sa.String(), nullable=True),
        sa.Column("external_subject", sa.String(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "teammember",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("team_id", sa.Integer(), sa.ForeignKey("team.id"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("user.id"), nullable=False),
        sa.Column("role_id", sa.Integer(), sa.ForeignKey("role.id"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "session",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("user.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("last_activity_at", sa.DateTime(), nullable=False),
        sa.Column("ip", sa.String(), nullable=True),
        sa.Column("user_agent", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="active"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "view",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("key", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=False, server_default=""),
        sa.Column("defaults", JSON(), nullable=False, server_default="{}"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "userpreference",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("user.id"), nullable=False),
        sa.Column("theme", sa.String(), nullable=False, server_default="system"),
        sa.Column("time_zone", sa.String(), nullable=True),
        sa.Column("density", sa.String(), nullable=False, server_default="comfortable"),
        sa.Column("default_view_id", sa.Integer(), sa.ForeignKey("view.id"), nullable=True),
        sa.Column("settings", JSON(), nullable=False, server_default="{}"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "auditlog",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("timestamp", sa.DateTime(), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("user.id"), nullable=True),
        sa.Column("session_id", sa.Integer(), sa.ForeignKey("session.id"), nullable=True),
        sa.Column("action", sa.String(), nullable=False),
        sa.Column("resource_type", sa.String(), nullable=False),
        sa.Column("resource_id", sa.String(), nullable=False),
        sa.Column("event_data", JSON(), nullable=False, server_default="{}"),
        sa.Column("ip", sa.String(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "observabilityevent",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("timestamp", sa.DateTime(), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("user.id"), nullable=True),
        sa.Column("session_id", sa.Integer(), sa.ForeignKey("session.id"), nullable=True),
        sa.Column("category", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("value", sa.Float(), nullable=True),
        sa.Column("event_data", JSON(), nullable=False, server_default="{}"),
        sa.PrimaryKeyConstraint("id"),
    )

    # ── models_core ──────────────────────────────────────────────────────────

    op.create_table(
        "project",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("owner_id", sa.Integer(), nullable=True),
        sa.Column("settings", JSON(), nullable=False, server_default="{}"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "integration",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("project.id"), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="disconnected"),
        sa.Column("config", JSON(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "environment",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("project.id"), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("type", sa.String(), nullable=False, server_default="dev"),
        sa.Column("status", sa.String(), nullable=False, server_default="inactive"),
        sa.Column("config", JSON(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "workflowrun",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("workflow_id", sa.String(), nullable=False),
        sa.Column("project_id", sa.String(), nullable=True),
        sa.Column("environment_id", sa.String(), nullable=True),
        sa.Column("architecture_type", sa.String(), nullable=True),
        sa.Column("query", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="pending"),
        sa.Column("answer", sa.String(), nullable=True),
        sa.Column("metrics", JSON(), nullable=False, server_default="{}"),
        sa.Column("started_at", sa.DateTime(), nullable=False),
        sa.Column("finished_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "taskexecution",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("run_id", sa.Integer(), sa.ForeignKey("workflowrun.id"), nullable=False),
        sa.Column("node_id", sa.String(), nullable=False),
        sa.Column("node_type", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="pending"),
        sa.Column("started_at", sa.DateTime(), nullable=False),
        sa.Column("finished_at", sa.DateTime(), nullable=True),
        sa.Column("latency_ms", sa.Float(), nullable=True),
        sa.Column("tokens_in", sa.Integer(), nullable=True),
        sa.Column("tokens_out", sa.Integer(), nullable=True),
        sa.Column("trace_metadata", JSON(), nullable=False, server_default="{}"),
        sa.PrimaryKeyConstraint("id"),
    )

    # ── models_architecture ──────────────────────────────────────────────────

    op.create_table(
        "architecturetemplate",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("arch_type", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=False, server_default=""),
        sa.Column("strengths", JSON(), nullable=False, server_default="[]"),
        sa.Column("tradeoffs", JSON(), nullable=False, server_default="[]"),
        sa.Column("use_cases", JSON(), nullable=False, server_default="[]"),
        sa.Column("complexity", sa.String(), nullable=False, server_default="medium"),
        sa.Column("default_nodes", JSON(), nullable=False, server_default="[]"),
        sa.Column("default_edges", JSON(), nullable=False, server_default="[]"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "designsession",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("project.id"), nullable=True),
        sa.Column("architecture_type", sa.String(), nullable=False),
        sa.Column("nodes", JSON(), nullable=False, server_default="[]"),
        sa.Column("edges", JSON(), nullable=False, server_default="[]"),
        sa.Column("current_step", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    # Drop in reverse dependency order
    op.drop_table("designsession")
    op.drop_table("architecturetemplate")
    op.drop_table("taskexecution")
    op.drop_table("workflowrun")
    op.drop_table("environment")
    op.drop_table("integration")
    op.drop_table("project")
    op.drop_table("observabilityevent")
    op.drop_table("auditlog")
    op.drop_table("userpreference")
    op.drop_table("view")
    op.drop_table("session")
    op.drop_table("teammember")
    op.drop_table("user")
    op.drop_table("team")
    op.drop_table("rolepermission")
    op.drop_table("role")
