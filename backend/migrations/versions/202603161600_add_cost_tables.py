"""Add costprofile and costscenario tables

Revision ID: 202603161600
Revises: 202603141700
Create Date: 2026-03-16 16:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON

revision = "202603161600"
down_revision = "202603141700"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "costprofile",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("architecture_type", sa.String(), nullable=False),
        sa.Column("label", sa.String(), nullable=False, server_default=""),
        sa.Column("default_top_k", sa.Integer(), nullable=False, server_default="8"),
        sa.Column("default_chunk_size", sa.Integer(), nullable=False, server_default="512"),
        sa.Column("latency_estimate_ms", sa.Integer(), nullable=False, server_default="500"),
        sa.Column("latency_source", sa.String(), nullable=False, server_default=""),
        sa.Column("embedding_cost_per_1m", sa.Float(), nullable=False, server_default="0.13"),
        sa.Column("llm_input_cost_per_1m", sa.Float(), nullable=False, server_default="2.5"),
        sa.Column("llm_output_cost_per_1m", sa.Float(), nullable=False, server_default="10.0"),
        sa.Column("notes", sa.String(), nullable=False, server_default=""),
        sa.Column("benchmark_sources", JSON(), nullable=False, server_default="[]"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_costprofile_architecture_type", "costprofile", ["architecture_type"], unique=True)

    op.create_table(
        "costscenario",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False, server_default=""),
        sa.Column("name", sa.String(), nullable=False, server_default=""),
        sa.Column("architecture_type", sa.String(), nullable=False, server_default=""),
        sa.Column("inputs", JSON(), nullable=False, server_default="{}"),
        sa.Column("results", JSON(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("costscenario")
    op.drop_index("ix_costprofile_architecture_type", table_name="costprofile")
    op.drop_table("costprofile")
