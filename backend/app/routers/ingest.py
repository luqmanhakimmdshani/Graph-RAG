import json

from fastapi import APIRouter, UploadFile

from app.services import graphdb, vectorstore
from app.services.ingestion import ingest_articles

router = APIRouter(prefix="/ingest", tags=["ingest"])


@router.post("")
async def ingest_documents(files: list[UploadFile]):
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

    stats = ingest_articles(articles)
    return {"status": "ingested", **stats}


@router.get("/status")
async def ingest_status():
    try:
        graph_stats = graphdb.stats()
    except Exception:
        graph_stats = {"entities": None, "relationships": None, "communities": None}
    return {"chunks_indexed": vectorstore.chunk_count(), "graph": graph_stats}
