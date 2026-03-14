"""Fix ALL stale table schemas: project, integration, environment, workflowrun, taskexecution

The initial migration was created with a different set of column names than what
the current SQLModel models actually define. This migration drops all affected
tables (in FK-safe order) and recreates them matching the current models exactly.

Revision ID: 202603141700
Revises: 202603141600
Create Date: 2026-03-14 17:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON

revision = "202603141700"
down_revision = "202603141600"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Drop in FK-safe order (children first) ───────────────────────────────
    op.drop_table("taskexecution")
    op.drop_table("workflowrun")
    op.drop_table("environment")
    op.drop_table("integration")
    op.drop_table("project")

    # ── Recreate project ──────────────────────────────────────────────────────
    op.create_table(
        "project",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("business_domain", sa.String(), nullable=False, server_default=""),
        sa.Column("use_case_description", sa.String(), nullable=False, server_default=""),
        sa.Column("deployment_status", sa.String(), nullable=False, server_default="draft"),
        sa.Column("selected_architecture_type", sa.String(), nullable=False, server_default=""),
        sa.Column("owners", JSON(), nullable=False, server_default="[]"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )

    # ── Recreate integration ──────────────────────────────────────────────────
    op.create_table(
        "integration",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("project.id"), nullable=True),
        sa.Column("external_id", sa.String(), nullable=False, server_default=""),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("provider_type", sa.String(), nullable=False, server_default=""),
        sa.Column("credentials_reference", sa.String(), nullable=False, server_default=""),
        sa.Column("environment_mapping", JSON(), nullable=False, server_default="{}"),
        sa.Column("default_usage_policies", JSON(), nullable=False, server_default="{}"),
        sa.Column("reusable", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("health_status", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )

    # ── Recreate environment ──────────────────────────────────────────────────
    op.create_table(
        "environment",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("project.id"), nullable=True),
        sa.Column("external_id", sa.String(), nullable=False, server_default=""),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=False, server_default=""),
        sa.Column("integration_bindings", JSON(), nullable=False, server_default="{}"),
        sa.Column("runtime_profile", JSON(), nullable=False, server_default="{}"),
        sa.Column("promotion_status", sa.String(), nullable=False, server_default="draft"),
        sa.Column("approval_state", sa.String(), nullable=True),
        sa.Column("health_status", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )

    # ── Recreate workflowrun ──────────────────────────────────────────────────
    op.create_table(
        "workflowrun",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("workflow_id", sa.String(), nullable=False),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("project.id"), nullable=True),
        sa.Column("environment_id", sa.Integer(), sa.ForeignKey("environment.id"), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="pending"),
        sa.Column("input_payload", JSON(), nullable=False, server_default="{}"),
        sa.Column("output_payload", JSON(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("finished_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    # ── Recreate taskexecution ────────────────────────────────────────────────
    op.create_table(
        "taskexecution",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("run_id", sa.Integer(), sa.ForeignKey("workflowrun.id"), nullable=False),
        sa.Column("node_id", sa.String(), nullable=False),
        sa.Column("node_type", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="pending"),
        sa.Column("input_payload", JSON(), nullable=False, server_default="{}"),
        sa.Column("output_payload", JSON(), nullable=False, server_default="{}"),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("finished_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("taskexecution")
    op.drop_table("workflowrun")
    op.drop_table("environment")
    op.drop_table("integration")
    op.drop_table("project")
