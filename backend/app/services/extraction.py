"""LLM entity/relationship extraction per chunk (FR-4)."""
from functools import lru_cache
from typing import Literal

from google import genai
from google.genai import types
from pydantic import BaseModel

from app.config import settings

ENTITY_TYPES = ("PERSON", "ORG", "PRODUCT")
RELATION_TYPES = (
    "ACQUIRED", "INVESTED_IN", "PARTNERED_WITH", "FOUNDED", "EMPLOYED_BY", "COMPETES_WITH",
)


class Entity(BaseModel):
    name: str
    type: Literal["PERSON", "ORG", "PRODUCT"]


class Relationship(BaseModel):
    source: str
    target: str
    type: Literal[
        "ACQUIRED", "INVESTED_IN", "PARTNERED_WITH", "FOUNDED", "EMPLOYED_BY", "COMPETES_WITH",
    ]
    confidence: float


class ExtractionResult(BaseModel):
    entities: list[Entity]
    relationships: list[Relationship]


PROMPT = """Extract named entities and relationships from this news article excerpt.

Entities: only PERSON, ORG, or PRODUCT. Use the canonical/full name where the text
supports it (e.g. "Sam Altman" not "he", "OpenAI" not "the company").

Relationships: only these types, and only when explicitly stated or clearly implied
in the text: ACQUIRED, INVESTED_IN, PARTNERED_WITH, FOUNDED, EMPLOYED_BY, COMPETES_WITH.
Both source and target must be entities you extracted. Give a confidence 0-1.

If nothing qualifies, return empty lists. Do not invent facts not in the text.

Text:
{text}
"""


@lru_cache
def _client() -> genai.Client:
    return genai.Client(api_key=settings.gemini_api_key)


def extract(text: str) -> ExtractionResult:
    resp = _client().models.generate_content(
        model=settings.gemini_model,
        contents=PROMPT.format(text=text),
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=ExtractionResult,
        ),
    )
    return resp.parsed
