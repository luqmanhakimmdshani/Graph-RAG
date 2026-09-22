from functools import lru_cache

from google import genai

from app.config import settings


@lru_cache
def _client() -> genai.Client:
    return genai.Client(api_key=settings.gemini_api_key)


def generate(prompt: str) -> str:
    resp = _client().models.generate_content(model=settings.gemini_model, contents=prompt)
    return resp.text.strip()
