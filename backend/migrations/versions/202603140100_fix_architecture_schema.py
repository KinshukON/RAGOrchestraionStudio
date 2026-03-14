"""fix_architecture_schema

Revision ID: 202603140100
Revises: 202603131527
Create Date: 2026-03-14 01:00:00

The initial migration created architecturetemplate and designsession with an
older schema.  The models were updated significantly:

architecturetemplate:
  OLD: id, name, arch_type, description, strengths[], tradeoffs[], use_cases[], complexity, default_nodes[], default_edges[]
  NEW: id, key, type, title, short_definition, when_to_use, strengths{}, tradeoffs{}, typical_backends{}, created_at, updated_at

designsession:
  OLD: id, project_id (FK→project), architecture_type, nodes[], edges[], current_step, created_at, updated_at
  NEW: id, architecture_type, project_id (nullable int, no FK), status, wizard_state{}, derived_architecture_definition{}, created_at, updated_at

Also adds workflowdefinitionrecord which was added to models_architecture after
the initial migration was created.
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON

revision: str = "202603140100"
down_revision = "202603131527"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Drop old tables (in reverse FK order)
    op.drop_table("designsession")
    op.drop_table("architecturetemplate")

    # 2. Recreate architecturetemplate with current schema
    op.create_table(
        "architecturetemplate",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("key", sa.String(), nullable=False),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("short_definition", sa.String(), nullable=False),
        sa.Column("when_to_use", sa.String(), nullable=False),
        sa.Column("strengths", JSON(), nullable=False, server_default="{}"),
        sa.Column("tradeoffs", JSON(), nullable=False, server_default="{}"),
        sa.Column("typical_backends", JSON(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("key"),
    )

    # 3. Recreate designsession with current schema
    op.create_table(
        "designsession",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("architecture_type", sa.String(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="draft"),
        sa.Column("wizard_state", JSON(), nullable=False, server_default="{}"),
        sa.Column("derived_architecture_definition", JSON(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    # 4. Create workflowdefinitionrecord (new table added after initial migration)
    op.create_table(
        "workflowdefinitionrecord",
        sa.Column("workflow_id", sa.String(), nullable=False),
        sa.Column("project_id", sa.String(), nullable=False, server_default=""),
        sa.Column("design_session_id", sa.Integer(), sa.ForeignKey("designsession.id"), nullable=True),
        sa.Column("architecture_type", sa.String(), nullable=False, server_default=""),
        sa.Column("name", sa.String(), nullable=False, server_default=""),
        sa.Column("description", sa.String(), nullable=False, server_default=""),
        sa.Column("version", sa.String(), nullable=False, server_default="1"),
        sa.Column("status", sa.String(), nullable=False, server_default="draft"),
        sa.Column("definition", JSON(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("workflow_id"),
    )


def downgrade() -> None:
    op.drop_table("workflowdefinitionrecord")
    op.drop_table("designsession")
    op.drop_table("architecturetemplate")

    # Restore old architecturetemplate schema
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
