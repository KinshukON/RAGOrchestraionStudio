import os
from contextlib import contextmanager
from typing import Generator

from sqlmodel import SQLModel, create_engine, Session


_DEFAULT_URL = "postgresql+psycopg2://postgres:postgres@localhost:5432/rag_studio"

# Prefer the existing rag_POSTGRES_URL env var, then fall back to DATABASE_URL, then default.
DATABASE_URL = os.getenv("rag_POSTGRES_URL") or os.getenv("DATABASE_URL") or _DEFAULT_URL

engine = create_engine(DATABASE_URL, echo=False)


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
        # Ensure the URL is set from our env var, not the blank ini entry
        alembic_cfg.set_main_option("sqlalchemy.url", DATABASE_URL)
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
