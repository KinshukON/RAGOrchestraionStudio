"""
Alembic environment configuration.
- Reads DATABASE_URL from environment (same logic as db.py)
- Imports all SQLModel table definitions so Alembic detects every model
- Supports both online (live DB) and offline (SQL script) modes
"""
import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from sqlmodel import SQLModel

from alembic import context

# ── Make sure backend/ is on the path so model imports resolve ────────────────
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# ── Import ALL table models so Alembic can detect them ───────────────────────
import models_admin       # noqa: F401  (Role, RolePermission, Team, TeamMember, User, Session, …)
import models_core        # noqa: F401  (Project, Integration, Environment, WorkflowRun, …)
import models_architecture  # noqa: F401  (ArchitectureTemplate, DesignSession)
# models_governance uses in-memory Pydantic only — nothing to migrate there

# ── Alembic Config object (from alembic.ini) ──────────────────────────────────
config = context.config

# Patch the sqlalchemy.url from environment at runtime
_DEFAULT_URL = "postgresql+psycopg2://postgres:postgres@localhost:5432/rag_studio"

def _fix_db_url(url: str) -> str:
    url = url.replace("postgres://", "postgresql+psycopg2://", 1)
    url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
    url = url.replace("&pgbouncer=true", "").replace("?pgbouncer=true&", "?").replace("?pgbouncer=true", "")
    return url

# Non-pooling URL preferred for Alembic DDL (no PgBouncer in the way)
_raw = (
    os.getenv("rag_POSTGRES_URL_NON_POOLING")
    or os.getenv("rag_POSTGRES_URL")
    or os.getenv("DATABASE_URL")
    or _DEFAULT_URL
)
db_url = _fix_db_url(_raw)
config.set_main_option("sqlalchemy.url", db_url)

# Set up Python logging via alembic.ini [loggers] section
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# This is the metadata object Alembic diffs against
target_metadata = SQLModel.metadata


# ── Offline mode (generate SQL script without connecting to DB) ───────────────
def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


# ── Online mode (apply directly to a live DB) ─────────────────────────────────
def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
