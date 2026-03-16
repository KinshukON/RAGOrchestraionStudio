"""Add missing columns: integration.last_tested_at

The Integration model defines last_tested_at but the initial migration
(202603141700) didn't include it.  This causes a 500 error on
GET /api/integrations in production.

Revision ID: 202603161700
Revises: 202603161600
Create Date: 2026-03-16 17:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "202603161700"
down_revision = "202603161600"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("integration", sa.Column("last_tested_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("integration", "last_tested_at")
