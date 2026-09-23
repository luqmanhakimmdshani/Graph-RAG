import json
import logging
from collections import Counter
from functools import lru_cache
from pathlib import Path

from fastapi import APIRouter

from app.services import graphdb, vectorstore

router = APIRouter(prefix="/stats", tags=["stats"])
logger = logging.getLogger(__name__)
DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"


@lru_cache
def _corpus() -> dict:
    # corpus.json is the fixed 500-article demo set, so this is cached for the
    # process; uploads via /ingest go to the vector store and graph, not here.
    articles = json.loads((DATA_DIR / "corpus.json").read_text(encoding="utf-8"))
    dates = sorted(a["date"][:10] for a in articles if a.get("date"))
    sources = Counter(a.get("source") or "Unknown" for a in articles)
    return {
        "articles": len(articles),
        "sources": [{"name": n, "count": c} for n, c in sources.most_common()],
        "first_date": dates[0] if dates else None,
        "last_date": dates[-1] if dates else None,
        "days": len(set(dates)),
    }


@router.get("/overview")
async def overview():
    """Everything the dashboard shows, in one call. Each section fails on its
    own (null + error) so a down Neo4j doesn't blank the corpus or eval
    figures, and vice versa."""
    out: dict = {"errors": []}
    for key, load in (
        ("corpus", _corpus),
        ("chunks", vectorstore.chunk_count),
        ("graph", graphdb.overview),
        ("eval", lambda: json.loads((DATA_DIR / "eval_results.json").read_text(encoding="utf-8"))["summary"] or None),
    ):
        try:
            out[key] = load()
        except Exception:
            logger.exception("stats overview: %s failed", key)
            out[key] = None
            out["errors"].append(key)
    return out
