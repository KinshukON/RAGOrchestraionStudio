import os

from sqlmodel import SQLModel, create_engine, Session


_DEFAULT_URL = "postgresql+psycopg2://postgres:postgres@localhost:5432/rag_studio"

# Prefer the existing rag_POSTGRES_URL env var, then fall back to DATABASE_URL, then default.
DATABASE_URL = os.getenv("rag_POSTGRES_URL") or os.getenv("DATABASE_URL") or _DEFAULT_URL

engine = create_engine(DATABASE_URL, echo=False)


def init_db() -> None:
    SQLModel.metadata.create_all(engine)


def get_session() -> Session:
    return Session(engine)

