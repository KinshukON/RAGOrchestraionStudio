"""add governance tables

Revision ID: 202603162000
Revises: 202603161700
Create Date: 2026-03-16 20:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "202603162000"
down_revision = "202603161700"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # GovernancePolicy
    op.create_table(
        "governancepolicy",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("name", sa.String, nullable=False),
        sa.Column("scope", sa.String, nullable=False, server_default="workflow"),
        sa.Column("rules", sa.JSON, nullable=False, server_default="{}"),
        sa.Column("created_by", sa.Integer, nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now()),
    )

    # ApprovalRule
    op.create_table(
        "approvalrule",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("name", sa.String, nullable=False),
        sa.Column("applies_to", sa.String, nullable=False, server_default="publish_workflow"),
        sa.Column("required_roles", sa.JSON, nullable=False, server_default="[]"),
        sa.Column("escalation_path", sa.JSON, nullable=False, server_default="{}"),
        sa.Column("active", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now()),
    )

    # GovernanceBinding
    op.create_table(
        "governancebinding",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("policy_id", sa.Integer, nullable=False),
        sa.Column("workflow_id", sa.String, nullable=True),
        sa.Column("environment_id", sa.String, nullable=True),
        sa.Column("architecture_type", sa.String, nullable=True),
        sa.Column("status", sa.String, nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("governancebinding")
    op.drop_table("approvalrule")
    op.drop_table("governancepolicy")
