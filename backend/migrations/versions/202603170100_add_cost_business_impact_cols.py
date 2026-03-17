"""add cost Layer 1 + Layer 2 business impact columns

Revision ID: 202603170100
Revises: 202603162200
Create Date: 2026-03-17 01:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "202603170100"
down_revision = "202603162200"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Layer 1 — engineering economics
    op.add_column("costprofile", sa.Column("reranker_cost_per_1m", sa.Float, nullable=False, server_default="0"))
    op.add_column("costprofile", sa.Column("graph_traversal_cost_per_1m", sa.Float, nullable=False, server_default="0"))
    op.add_column("costprofile", sa.Column("index_storage_cost_monthly", sa.Float, nullable=False, server_default="0"))
    op.add_column("costprofile", sa.Column("infra_base_cost_monthly", sa.Float, nullable=False, server_default="0"))
    # Layer 2 — business impact
    op.add_column("costprofile", sa.Column("ticket_deflection_rate", sa.Float, nullable=False, server_default="0"))
    op.add_column("costprofile", sa.Column("compliance_hours_saved_monthly", sa.Float, nullable=False, server_default="0"))
    op.add_column("costprofile", sa.Column("escalation_reduction_rate", sa.Float, nullable=False, server_default="0"))
    op.add_column("costprofile", sa.Column("failed_answer_reduction_rate", sa.Float, nullable=False, server_default="0"))
    op.add_column("costprofile", sa.Column("search_effort_reduction_rate", sa.Float, nullable=False, server_default="0"))
    op.add_column("costprofile", sa.Column("analyst_hours_saved_monthly", sa.Float, nullable=False, server_default="40"))


def downgrade() -> None:
    for col in [
        "analyst_hours_saved_monthly", "search_effort_reduction_rate",
        "failed_answer_reduction_rate", "escalation_reduction_rate",
        "compliance_hours_saved_monthly", "ticket_deflection_rate",
        "infra_base_cost_monthly", "index_storage_cost_monthly",
        "graph_traversal_cost_per_1m", "reranker_cost_per_1m",
    ]:
        op.drop_column("costprofile", col)
