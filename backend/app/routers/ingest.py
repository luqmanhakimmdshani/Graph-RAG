import io
import json
import logging
from pathlib import Path

from docx import Document
from fastapi import APIRouter, BackgroundTasks, HTTPException, UploadFile
from pypdf import PdfReader

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


SUPPORTED = (".txt", ".json", ".pdf", ".docx")


def parse_upload(filename: str, raw: bytes) -> tuple[list[dict], list[dict]]:
    """One uploaded file -> (articles, skipped). Validated here, per file and per
    JSON item, because a bad record used to surface as a KeyError deep inside the
    background task and fail the whole batch with no hint which item or why.
    PDF/DOCX go beyond FR-1's text/JSON: their text is extracted and treated as
    a .txt body (title = filename). DOCX tables and scanned (image-only) PDFs
    carry no extractable text layer and are skipped, not OCR'd."""
    ext = Path(filename).suffix.lower()
    if ext not in SUPPORTED:
        return [], [{"file": filename, "reason": f"unsupported type {ext or '(none)'} - use {', '.join(SUPPORTED)}"}]
    try:
        if ext == ".json":
            data = json.loads(raw.decode("utf-8-sig"))
            articles, skipped = [], []
            for i, item in enumerate(data if isinstance(data, list) else [data]):
                if not isinstance(item, dict) or not str(item.get("body") or "").strip():
                    skipped.append({"file": f"{filename}[{i}]", "reason": 'missing or empty "body"'})
                    continue
                item["body"] = str(item["body"])
                item.setdefault("id", f"{filename}_{i}")
                item.setdefault("title", item["id"])
                articles.append(item)
            return articles, skipped
        if ext == ".pdf":
            text = "\n".join(page.extract_text() or "" for page in PdfReader(io.BytesIO(raw)).pages)
        elif ext == ".docx":
            text = "\n".join(p.text for p in Document(io.BytesIO(raw)).paragraphs)
        else:
            text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        return [], [{"file": filename, "reason": "not UTF-8 text"}]
    except json.JSONDecodeError as e:
        return [], [{"file": filename, "reason": f"invalid JSON (line {e.lineno})"}]
    except Exception:
        logger.exception("could not read upload %s", filename)
        return [], [{"file": filename, "reason": "could not read file - corrupt or password-protected?"}]

    if not text.strip():
        hint = " (scanned PDF? no text layer)" if ext == ".pdf" else ""
        return [], [{"file": filename, "reason": f"no extractable text{hint}"}]
    return [{"id": filename, "title": Path(filename).stem, "body": text}], []


@router.post("")
async def ingest_documents(files: list[UploadFile], background_tasks: BackgroundTasks):
    articles, skipped = [], []
    for f in files:
        parsed, bad = parse_upload(f.filename or "upload", await f.read())
        articles += parsed
        skipped += bad

    if not articles:
        raise HTTPException(400, "Nothing to ingest: " + "; ".join(f"{s['file']} - {s['reason']}" for s in skipped))
    background_tasks.add_task(_run_ingest, articles)
    return {"status": "processing", "articles": len(articles), "skipped": skipped}


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
