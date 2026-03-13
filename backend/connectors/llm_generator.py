"""
LLM Generator connectors.
Supports OpenAI (GPT-4o-mini default) and Anthropic (Claude 3.5 Haiku default).
Falls back to a simulated answer when no API keys are configured.
"""
from __future__ import annotations

import time
from typing import List

from connectors.pgvector_retriever import RetrievedChunk


class GeneratorResult:
    def __init__(
        self,
        answer: str,
        model: str,
        input_tokens: int,
        output_tokens: int,
        latency_ms: float,
        simulated: bool = False,
    ):
        self.answer = answer
        self.model = model
        self.input_tokens = input_tokens
        self.output_tokens = output_tokens
        self.latency_ms = latency_ms
        self.simulated = simulated

    def to_dict(self) -> dict:
        return {
            "model": self.model,
            "input_tokens": self.input_tokens,
            "output_tokens": self.output_tokens,
            "latency_ms": round(self.latency_ms, 1),
            "simulated": self.simulated,
        }


def _build_prompt(query: str, chunks: List[RetrievedChunk]) -> str:
    context_blocks = "\n\n".join(
        f"[Source: {c.source}]\n{c.content}" for c in chunks
    )
    return (
        f"You are a helpful AI assistant. Answer the question based ONLY on the provided context. "
        f"If the context does not contain the answer, say so clearly.\n\n"
        f"CONTEXT:\n{context_blocks}\n\n"
        f"QUESTION: {query}\n\n"
        f"ANSWER:"
    )


_SIMULATED_ANSWER = (
    "Based on the retrieved documents, RAG (Retrieval-Augmented Generation) is a technique that "
    "combines information retrieval with language model generation to produce factual, grounded answers. "
    "The system first retrieves relevant passages from a knowledge base, then uses an LLM to synthesize "
    "a coherent answer from those passages. This approach reduces hallucinations and allows the model "
    "to cite specific sources. [Note: This is a simulated response — connect an API key to get real answers.]"
)


async def generate_with_openai(query: str, chunks: List[RetrievedChunk]) -> GeneratorResult:
    """Generate an answer using OpenAI. Falls back to simulated response if key is missing."""
    from config import get_settings
    settings = get_settings()
    start = time.perf_counter()

    if not settings.has_openai():
        latency = (time.perf_counter() - start) * 1000
        return GeneratorResult(
            answer=_SIMULATED_ANSWER,
            model="simulated",
            input_tokens=0,
            output_tokens=0,
            latency_ms=latency,
            simulated=True,
        )

    try:
        from openai import AsyncOpenAI  # type: ignore
        client = AsyncOpenAI(api_key=settings.openai_api_key)
        prompt = _build_prompt(query, chunks)
        response = await client.chat.completions.create(
            model=settings.openai_chat_model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=800,
            temperature=0.2,
        )
        latency = (time.perf_counter() - start) * 1000
        choice = response.choices[0]
        usage = response.usage
        return GeneratorResult(
            answer=choice.message.content or "",
            model=settings.openai_chat_model,
            input_tokens=usage.prompt_tokens if usage else 0,
            output_tokens=usage.completion_tokens if usage else 0,
            latency_ms=latency,
            simulated=False,
        )
    except Exception as exc:
        latency = (time.perf_counter() - start) * 1000
        return GeneratorResult(
            answer=f"[Error calling OpenAI: {exc}. Connect API key to enable real answers.]",
            model=f"error:{type(exc).__name__}",
            input_tokens=0,
            output_tokens=0,
            latency_ms=latency,
            simulated=True,
        )


async def generate_with_anthropic(query: str, chunks: List[RetrievedChunk]) -> GeneratorResult:
    """Generate an answer using Anthropic Claude. Falls back to simulated response if key is missing."""
    from config import get_settings
    settings = get_settings()
    start = time.perf_counter()

    if not settings.has_anthropic():
        latency = (time.perf_counter() - start) * 1000
        return GeneratorResult(
            answer=_SIMULATED_ANSWER,
            model="simulated",
            input_tokens=0,
            output_tokens=0,
            latency_ms=latency,
            simulated=True,
        )

    try:
        import anthropic  # type: ignore
        client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
        prompt = _build_prompt(query, chunks)
        message = await client.messages.create(
            model=settings.anthropic_model,
            max_tokens=800,
            messages=[{"role": "user", "content": prompt}],
        )
        latency = (time.perf_counter() - start) * 1000
        answer_text = message.content[0].text if message.content else ""
        return GeneratorResult(
            answer=answer_text,
            model=settings.anthropic_model,
            input_tokens=message.usage.input_tokens,
            output_tokens=message.usage.output_tokens,
            latency_ms=latency,
            simulated=False,
        )
    except Exception as exc:
        latency = (time.perf_counter() - start) * 1000
        return GeneratorResult(
            answer=f"[Error calling Anthropic: {exc}. Connect API key to enable real answers.]",
            model=f"error:{type(exc).__name__}",
            input_tokens=0,
            output_tokens=0,
            latency_ms=latency,
            simulated=True,
        )
