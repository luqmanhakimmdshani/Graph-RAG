"""Single entry point for LLM calls. LLM_PROVIDER picks Gemini (default) or a
local Ollama model - the fallback for when Gemini's free-tier quota runs out.
Ollama's /api/chat takes a JSON schema in `format`, so structured output works
the same way on both."""
from functools import lru_cache

import httpx
from google import genai
from google.genai import types

from app.config import settings


@lru_cache
def _client() -> genai.Client:
    return genai.Client(
        api_key=settings.gemini_api_key,
        http_options=types.HttpOptions(timeout=settings.gemini_timeout_ms),
    )


def _ollama(prompt: str, schema=None) -> str:
    resp = httpx.post(
        f"{settings.ollama_base_url}/api/chat",
        json={
            "model": settings.ollama_model,
            "messages": [{"role": "user", "content": prompt}],
            "stream": False,
            "format": schema.model_json_schema() if schema else None,
            "options": {"temperature": 0},
            # Loading the model costs ~10s; keep it resident between demo questions.
            "keep_alive": "30m",
        },
        timeout=settings.ollama_timeout_s,
    )
    resp.raise_for_status()
    return resp.json()["message"]["content"]


def generate(prompt: str) -> str:
    if settings.llm_provider == "ollama":
        return _ollama(prompt).strip()
    resp = _client().models.generate_content(model=settings.gemini_model, contents=prompt)
    return resp.text.strip()


def generate_json(prompt: str, schema):
    """Structured output (JSON mode) for callers that need a typed result, e.g. the
    eval harness's LLM-as-judge scoring (FR-21)."""
    if settings.llm_provider == "ollama":
        return schema.model_validate_json(_ollama(prompt, schema))
    resp = _client().models.generate_content(
        model=settings.gemini_model,
        contents=prompt,
        config=types.GenerateContentConfig(response_mime_type="application/json", response_schema=schema),
    )
    return resp.parsed
