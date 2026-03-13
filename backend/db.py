import os
from contextlib import contextmanager
from typing import Generator

from sqlmodel import SQLModel, create_engine, Session


_DEFAULT_URL = "postgresql+psycopg2://postgres:postgres@localhost:5432/rag_studio"


def _fix_db_url(url: str) -> str:
    """Convert postgres:// → postgresql+psycopg2:// and strip PgBouncer params."""
    url = url.replace("postgres://", "postgresql+psycopg2://", 1)
    url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
    # pgbouncer=true is not understood by psycopg2; strip it
    url = url.replace("&pgbouncer=true", "").replace("?pgbouncer=true&", "?").replace("?pgbouncer=true", "")
    return url


# Pooled URL for the FastAPI connection pool (reads); non-pooling for migrations (DDL)
_RAW_URL = os.getenv("rag_POSTGRES_URL") or os.getenv("DATABASE_URL") or _DEFAULT_URL
DATABASE_URL = _fix_db_url(_RAW_URL)

# Non-pooling URL is safer for Alembic DDL (no pgbouncer in the way)
_RAW_MIGRATION_URL = (
    os.getenv("rag_POSTGRES_URL_NON_POOLING")
    or os.getenv("DATABASE_URL_NON_POOLING")
    or _RAW_URL
)
MIGRATION_URL = _fix_db_url(_RAW_MIGRATION_URL)

engine = create_engine(
    DATABASE_URL,
    echo=False,
    connect_args={"sslmode": "require"} if "supabase.com" in DATABASE_URL else {},
)


def init_db() -> None:
    """Apply all pending Alembic migrations on startup (replaces unsafe create_all)."""
    import logging
    logger = logging.getLogger(__name__)
    try:
        from alembic.config import Config as AlembicConfig
        from alembic import command as alembic_command

        # alembic.ini lives next to this file (backend/)
        ini_path = os.path.join(os.path.dirname(__file__), "alembic.ini")
        alembic_cfg = AlembicConfig(ini_path)
        # Use the non-pooling URL for DDL operations (safe for Supabase/pgbouncer)
        alembic_cfg.set_main_option("sqlalchemy.url", MIGRATION_URL)
        logger.info("Running alembic upgrade head …")
        alembic_command.upgrade(alembic_cfg, "head")
        logger.info("Database schema is up to date.")
    except Exception as exc:  # pragma: no cover
        logger.warning(
            "Alembic migration failed (%s). Falling back to SQLModel.metadata.create_all().",
            exc,
        )
        from sqlmodel import SQLModel
        SQLModel.metadata.create_all(engine)


def get_session() -> Session:
    return Session(engine)


@contextmanager
def get_session_ctx() -> Generator[Session, None, None]:
    """Context-manager variant: `with get_session_ctx() as db: ...`"""
    session = Session(engine)
    try:
        yield session
    finally:
        session.close()


def get_db() -> Generator[Session, None, None]:
    """FastAPI Depends() generator: yields a Session and closes after each request."""
    with Session(engine) as session:
        yield session
