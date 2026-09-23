"""Single entry point for LLM calls. LLM_PROVIDER picks Gemini (default) or a
local Ollama model - the fallback for when Gemini's free-tier quota runs out.
Ollama's /api/chat takes a JSON schema in `format`, so structured output works
the same way on both."""
import json
import re
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


def _openai(prompt: str, schema=None) -> str:
    # stream must be explicit: OmniRoute defaults to SSE when it's omitted.
    body = {"model": settings.openai_model, "messages": [{"role": "user", "content": prompt}],
            "temperature": 0, "stream": False}
    if schema:
        # Routers (OmniRoute) forward json_schema to some upstreams and downgrade it
        # to plain JSON mode for others - so the schema also goes in the prompt,
        # and generate_json() validates whatever comes back.
        body["response_format"] = {"type": "json_schema", "json_schema": {"name": schema.__name__, "schema": schema.model_json_schema()}}
        body["messages"][0]["content"] += f"\n\nRespond with only JSON matching this schema:\n{json.dumps(schema.model_json_schema())}"
    resp = httpx.post(
        f"{settings.openai_base_url}/chat/completions",
        json=body,
        headers={"Authorization": f"Bearer {settings.openai_api_key}"} if settings.openai_api_key else {},
        timeout=settings.openai_timeout_s,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"]


def _strip_fences(text: str) -> str:
    # Some models wrap JSON in ```json ... ``` even in JSON mode.
    return re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip())


def generate(prompt: str) -> str:
    if settings.llm_provider == "ollama":
        return _ollama(prompt).strip()
    if settings.llm_provider == "openai":
        return _openai(prompt).strip()
    resp = _client().models.generate_content(model=settings.gemini_model, contents=prompt)
    return resp.text.strip()


def generate_json(prompt: str, schema):
    """Structured output (JSON mode) for callers that need a typed result, e.g. the
    eval harness's LLM-as-judge scoring (FR-21)."""
    if settings.llm_provider == "ollama":
        return schema.model_validate_json(_ollama(prompt, schema))
    if settings.llm_provider == "openai":
        return schema.model_validate_json(_strip_fences(_openai(prompt, schema)))
    resp = _client().models.generate_content(
        model=settings.gemini_model,
        contents=prompt,
        config=types.GenerateContentConfig(response_mime_type="application/json", response_schema=schema),
    )
    return resp.parsed
