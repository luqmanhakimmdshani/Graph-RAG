from functools import lru_cache

from google import genai
from google.genai import types

from app.config import settings


@lru_cache
def _client() -> genai.Client:
    return genai.Client(
        api_key=settings.gemini_api_key,
        http_options=types.HttpOptions(timeout=settings.gemini_timeout_ms),
    )


def generate(prompt: str) -> str:
    resp = _client().models.generate_content(model=settings.gemini_model, contents=prompt)
    return resp.text.strip()


def generate_json(prompt: str, schema):
    """Structured output (JSON mode) for callers that need a typed result, e.g. the
    eval harness's LLM-as-judge scoring (FR-21)."""
    resp = _client().models.generate_content(
        model=settings.gemini_model,
        contents=prompt,
        config=types.GenerateContentConfig(response_mime_type="application/json", response_schema=schema),
    )
    return resp.parsed
