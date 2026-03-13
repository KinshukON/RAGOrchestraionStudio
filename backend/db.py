import os
from contextlib import contextmanager
from typing import Generator

from sqlmodel import SQLModel, create_engine, Session


_DEFAULT_URL = "postgresql+psycopg2://postgres:postgres@localhost:5432/rag_studio"

# Prefer the existing rag_POSTGRES_URL env var, then fall back to DATABASE_URL, then default.
DATABASE_URL = os.getenv("rag_POSTGRES_URL") or os.getenv("DATABASE_URL") or _DEFAULT_URL

engine = create_engine(DATABASE_URL, echo=False)


def init_db() -> None:
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
