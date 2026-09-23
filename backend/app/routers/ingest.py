import json
import logging

from fastapi import APIRouter, BackgroundTasks, UploadFile

from app.services import graphdb, vectorstore
from app.services.ingestion import ingest_articles

router = APIRouter(prefix="/ingest", tags=["ingest"])
logger = logging.getLogger(__name__)

# Extraction is rate-limited to ~13 req/min (see extraction.py), so a real
# batch can take minutes to tens of minutes - synchronously awaiting the
# whole pipeline inside one HTTP request risked a browser/proxy timeout on
# anything but a tiny upload. Running it as a background task instead means
# the request returns immediately; /ingest/status's "ingesting" flag, the
# chunk/entity counts, and now a per-document status list (FR-9) is how the
# caller watches progress - queued/processing/done/failed per document,
# rather than just an aggregate count with no visibility into which
# document a slow or stuck batch is currently on.
_state = {"ingesting": False, "last_result": None, "last_error": None, "documents": []}


def _run_ingest(articles: list[dict]) -> None:
    documents = [{"id": str(a["id"]), "title": a.get("title", a["id"]), "status": "queued"} for a in articles]
    by_id = {d["id"]: d for d in documents}
    _state.update(ingesting=True, last_result=None, last_error=None, documents=documents)

    def on_start(article: dict) -> None:
        doc = by_id.get(str(article["id"]))
        if doc:
            doc["status"] = "processing"

    def on_done(article: dict, stats: dict) -> None:
        doc = by_id.get(str(article["id"]))
        if doc:
            doc["status"] = "failed" if stats["chunks"] and stats["extraction_failures"] == stats["chunks"] else "done"
            doc.update(stats)

    try:
        _state["last_result"] = ingest_articles(articles, on_article_start=on_start, on_article_done=on_done)
    except Exception as e:
        logger.exception("background ingestion failed")
        _state["last_error"] = str(e)
    finally:
        _state["ingesting"] = False


@router.post("")
async def ingest_documents(files: list[UploadFile], background_tasks: BackgroundTasks):
    articles = []
    for f in files:
        raw = (await f.read()).decode("utf-8")
        if f.filename and f.filename.endswith(".json"):
            data = json.loads(raw)
            for i, item in enumerate(data if isinstance(data, list) else [data]):
                item.setdefault("id", f"{f.filename}_{i}")
                item.setdefault("title", item["id"])
                articles.append(item)
        else:
            articles.append({"id": f.filename, "title": f.filename, "body": raw})

    background_tasks.add_task(_run_ingest, articles)
    return {"status": "processing", "articles": len(articles)}


@router.get("/status")
async def ingest_status():
    try:
        graph_stats = graphdb.stats()
    except Exception:
        graph_stats = {"entities": None, "relationships": None, "communities": None}
    return {
        "chunks_indexed": vectorstore.chunk_count(),
        "graph": graph_stats,
        "ingesting": _state["ingesting"],
        "last_result": _state["last_result"],
        "last_error": _state["last_error"],
        "documents": _state["documents"],
    }
