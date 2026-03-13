"""
RAG Studio – Backend configuration
Reads all integration credentials from environment variables.
Falls back gracefully so the app boots with no keys set.
"""
import os
from functools import lru_cache
from dataclasses import dataclass, field


@dataclass
class Settings:
    # ── LLM / Embedding ──────────────────────────────────────────────────────
    openai_api_key: str = field(default_factory=lambda: os.getenv("OPENAI_API_KEY", ""))
    openai_embedding_model: str = field(
        default_factory=lambda: os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
    )
    openai_chat_model: str = field(
        default_factory=lambda: os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini")
    )

    anthropic_api_key: str = field(default_factory=lambda: os.getenv("ANTHROPIC_API_KEY", ""))
    anthropic_model: str = field(
        default_factory=lambda: os.getenv("ANTHROPIC_MODEL", "claude-3-5-haiku-20241022")
    )

    cohere_api_key: str = field(default_factory=lambda: os.getenv("COHERE_API_KEY", ""))
    cohere_rerank_model: str = field(
        default_factory=lambda: os.getenv("COHERE_RERANK_MODEL", "rerank-english-v3.0")
    )

    # ── Vector DB ────────────────────────────────────────────────────────────
    pgvector_url: str = field(
        default_factory=lambda: os.getenv("PGVECTOR_URL", os.getenv("DATABASE_URL", ""))
    )
    pgvector_collection: str = field(
        default_factory=lambda: os.getenv("PGVECTOR_COLLECTION", "rag_documents")
    )

    # ── Graph DB ─────────────────────────────────────────────────────────────
    neo4j_url: str = field(default_factory=lambda: os.getenv("NEO4J_URL", ""))
    neo4j_user: str = field(default_factory=lambda: os.getenv("NEO4J_USER", "neo4j"))
    neo4j_password: str = field(default_factory=lambda: os.getenv("NEO4J_PASSWORD", ""))

    # ── Elasticsearch / Lexical ───────────────────────────────────────────────
    elasticsearch_url: str = field(
        default_factory=lambda: os.getenv("ELASTICSEARCH_URL", "")
    )
    elasticsearch_index: str = field(
        default_factory=lambda: os.getenv("ELASTICSEARCH_INDEX", "rag_documents")
    )

    # ── General ───────────────────────────────────────────────────────────────
    rag_top_k: int = field(
        default_factory=lambda: int(os.getenv("RAG_TOP_K", "5"))
    )
    rag_max_context_tokens: int = field(
        default_factory=lambda: int(os.getenv("RAG_MAX_CONTEXT_TOKENS", "4000"))
    )
    database_url: str = field(
        default_factory=lambda: os.getenv("DATABASE_URL", "")
    )
    secret_key: str = field(
        default_factory=lambda: os.getenv("SECRET_KEY", "change-me-in-production")
    )
    google_client_id: str = field(
        default_factory=lambda: os.getenv("GOOGLE_CLIENT_ID", "")
    )

    def has_openai(self) -> bool:
        return bool(self.openai_api_key)

    def has_anthropic(self) -> bool:
        return bool(self.anthropic_api_key)

    def has_cohere(self) -> bool:
        return bool(self.cohere_api_key)

    def has_pgvector(self) -> bool:
        return bool(self.pgvector_url)

    def has_neo4j(self) -> bool:
        return bool(self.neo4j_url and self.neo4j_password)

    def has_elasticsearch(self) -> bool:
        return bool(self.elasticsearch_url)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
