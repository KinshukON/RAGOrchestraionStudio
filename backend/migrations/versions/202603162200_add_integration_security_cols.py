"""add integration security columns

Revision ID: 202603162200
Revises: 202603162100
Create Date: 2026-03-16 22:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "202603162200"
down_revision = "202603162100"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("integration", sa.Column("owner_user_id", sa.Integer, nullable=True))
    op.add_column("integration", sa.Column("sharing_scope", sa.String, nullable=False, server_default="organization"))
    op.add_column("integration", sa.Column("shared_with_team_ids", sa.JSON, nullable=False, server_default="[]"))
    op.add_column("integration", sa.Column("credential_encrypted", sa.Boolean, nullable=False, server_default=sa.text("false")))


def downgrade() -> None:
    op.drop_column("integration", "credential_encrypted")
    op.drop_column("integration", "shared_with_team_ids")
    op.drop_column("integration", "sharing_scope")
    op.drop_column("integration", "owner_user_id")
