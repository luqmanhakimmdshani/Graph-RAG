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
# the request returns immediately; /ingest/status's "ingesting" flag plus
# the chunk/entity counts already exposed there is how the caller watches
# progress, in place of full per-document status tracking (a separate,
# larger gap).
_state = {"ingesting": False, "last_result": None, "last_error": None}


def _run_ingest(articles: list[dict]) -> None:
    _state.update(ingesting=True, last_result=None, last_error=None)
    try:
        _state["last_result"] = ingest_articles(articles)
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
    }
