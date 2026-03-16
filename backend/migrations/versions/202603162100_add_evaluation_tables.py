"""add evaluation tables

Revision ID: 202603162100
Revises: 202603162000
Create Date: 2026-03-16 21:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "202603162100"
down_revision = "202603162000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # BenchmarkQuery
    op.create_table(
        "benchmarkquery",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("external_id", sa.String, nullable=False, unique=True),
        sa.Column("query", sa.Text, nullable=False),
        sa.Column("expected_answer", sa.Text, nullable=False, server_default=""),
        sa.Column("expected_evidence", sa.JSON, nullable=False, server_default="[]"),
        sa.Column("rubric", sa.Text, nullable=False, server_default=""),
        sa.Column("scenario_tag", sa.String, nullable=False, server_default="semantic"),
        sa.Column("difficulty", sa.String, nullable=False, server_default="medium"),
        sa.Column("scores", sa.JSON, nullable=False, server_default="{}"),
        sa.Column("human_rating", sa.Integer, nullable=True),
        sa.Column("status", sa.String, nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index("ix_benchmarkquery_external_id", "benchmarkquery", ["external_id"])

    # EvaluationTestCase
    op.create_table(
        "evaluationtestcase",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("external_id", sa.String, nullable=False, unique=True),
        sa.Column("workflow_id", sa.String, nullable=False),
        sa.Column("environment_id", sa.String, nullable=False),
        sa.Column("query", sa.Text, nullable=False),
        sa.Column("strategy_id", sa.String, nullable=False),
        sa.Column("expected_answer", sa.Text, nullable=True),
        sa.Column("parameters", sa.JSON, nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index("ix_evaluationtestcase_external_id", "evaluationtestcase", ["external_id"])


def downgrade() -> None:
    op.drop_table("evaluationtestcase")
    op.drop_table("benchmarkquery")
