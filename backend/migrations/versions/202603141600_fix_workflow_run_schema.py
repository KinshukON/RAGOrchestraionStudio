"""fix workflowrun and taskexecution schema to match current models

Revision ID: 202603141600
Revises: 202603140100
Create Date: 2026-03-14 16:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON

revision = "202603141600"
down_revision = "202603140100"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── taskexecution depends on workflowrun, drop it first ──────────────────
    op.drop_table("taskexecution")
    op.drop_table("workflowrun")

    # ── Recreate workflowrun with the correct schema ──────────────────────────
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

    # ── Recreate taskexecution with the correct schema ────────────────────────
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
