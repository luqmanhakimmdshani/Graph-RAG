"""LLM entity/relationship extraction per chunk (FR-4).

Gemini's free tier is stingy and per-model: gemini-3.6-flash turned out to
be capped at 20 requests/DAY (see config.py's model choice), and even the
more generous flash-lite tier throttles per-minute and intermittently
returns 503 "high demand". At this corpus's scale (1248 chunks = ~1 call/
chunk) both are expected, so extract() self-throttles to ~13 RPM and
retries transient errors with backoff (honoring the server's suggested
retryDelay on 429s, and a short backoff on 503s/network blips) rather than
treating them as failures.
"""
import re
import threading
import time
from functools import lru_cache
from typing import Literal

import httpx
from google import genai
from google.genai import errors, types
from pydantic import BaseModel

from app.config import settings
from app.services import llm

_MIN_INTERVAL_S = 4.5  # ~13 req/min - headroom under the 20 RPM cap for retries/jitter
_MAX_RETRIES = 8
_last_call_at = 0.0
_throttle_lock = threading.Lock()

ENTITY_TYPES = ("PERSON", "ORG", "PRODUCT")
RELATION_TYPES = (
    "ACQUIRED", "INVESTED_IN", "PARTNERED_WITH", "FOUNDED", "EMPLOYED_BY", "COMPETES_WITH",
    # Events, not just standing links - the six above can't express "X was fired".
    "LEFT", "REMOVED_FROM", "APPOINTED_TO", "SUED",
)


class Entity(BaseModel):
    name: str
    type: Literal["PERSON", "ORG", "PRODUCT"]


class Relationship(BaseModel):
    source: str
    target: str
    type: Literal[
        "ACQUIRED", "INVESTED_IN", "PARTNERED_WITH", "FOUNDED", "EMPLOYED_BY", "COMPETES_WITH",
        "LEFT", "REMOVED_FROM", "APPOINTED_TO", "SUED",
    ]
    confidence: float
    # The why/how/when the text gives, e.g. "board said he was not consistently candid".
    detail: str = ""


class ExtractionResult(BaseModel):
    entities: list[Entity]
    relationships: list[Relationship]


PROMPT = """Extract named entities and relationships from this news article excerpt.

Entities: only PERSON, ORG, or PRODUCT. Use the canonical/full name where the text
supports it (e.g. "Sam Altman" not "he", "OpenAI" not "the company").

Relationships: only these types, and only when explicitly stated or clearly implied
in the text: ACQUIRED, INVESTED_IN, PARTNERED_WITH, FOUNDED, EMPLOYED_BY, COMPETES_WITH,
LEFT (resigned or departed), REMOVED_FROM (fired or ousted), APPOINTED_TO (named to a
role, e.g. CEO or board), SUED. Source is the actor, target the object: for LEFT,
REMOVED_FROM and APPOINTED_TO the source is the person and the target the organization
("Sam Altman REMOVED_FROM OpenAI"); for SUED the source is the one suing.
Both source and target must be entities you extracted. Give a confidence 0-1.
Only extract a relationship stated for that specific pair. A loose group statement
("tech giants like Microsoft, Amazon and Google have invested in AI firms like OpenAI
and Anthropic") does not say which company invested in which - skip it.
For each relationship, "detail" is a short phrase (under 20 words) with the reason, role,
amount or date the text gives for it; leave it empty if the text gives none.

If nothing qualifies, return empty lists. Do not invent facts not in the text.

Text:
{text}
"""


@lru_cache
def _client() -> genai.Client:
    return genai.Client(api_key=settings.gemini_api_key)


def _throttle() -> None:
    # Locked: build_graph.py's worker threads can all fall back to Gemini at once.
    global _last_call_at
    with _throttle_lock:
        wait = _last_call_at + _MIN_INTERVAL_S - time.monotonic()
        if wait > 0:
            time.sleep(wait)
        _last_call_at = time.monotonic()


def _retry_delay_s(error: Exception, default: float) -> float:
    # 429 responses carry the server's own suggested wait (e.g. "retryDelay": "26s") -
    # honor that instead of guessing, since the free-tier window's actual reset
    # timing doesn't line up with a fixed exponential backoff.
    match = re.search(r"retryDelay['\"]?\s*:\s*['\"]?(\d+)s", str(error))
    return float(match.group(1)) + 2 if match else default


def extract(text: str, model: str | None = None) -> ExtractionResult:
    if settings.llm_provider == "gemini":
        return _extract_gemini(text, model)
    try:
        return llm.generate_json(PROMPT.format(text=text), ExtractionResult, model)
    except Exception:
        # The free router's upstreams cool down under bulk load; Gemini (configured
        # directly, not through the router) takes over while its own quota lasts.
        if not settings.gemini_api_key:
            raise
        return _extract_gemini(text)


def _extract_gemini(text: str, model: str | None = None) -> ExtractionResult:
    for attempt in range(_MAX_RETRIES):
        _throttle()
        try:
            resp = _client().models.generate_content(
                model=model or settings.gemini_model,
                contents=PROMPT.format(text=text),
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=ExtractionResult,
                ),
            )
            return resp.parsed
        except errors.ClientError as e:
            # A per-DAY cap won't lift in the ~1 min retryDelay it suggests; waiting it
            # out 8 times just stalls the caller (build_graph.py's workers) silently.
            if e.code != 429 or attempt == _MAX_RETRIES - 1 or "PerDay" in str(e):
                raise
            time.sleep(_retry_delay_s(e, default=2**attempt * 5))
        except errors.ServerError:
            if attempt == _MAX_RETRIES - 1:
                raise
            time.sleep(2**attempt * 2)  # 503: transient overload, short backoff
        except httpx.ConnectError:
            if attempt == _MAX_RETRIES - 1:
                raise
            time.sleep(2**attempt * 2)  # DNS/network blip, short backoff
    raise RuntimeError("unreachable")
