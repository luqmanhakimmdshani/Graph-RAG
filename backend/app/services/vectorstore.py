from functools import lru_cache

import chromadb

from app.config import settings


@lru_cache
def _collection():
    client = chromadb.PersistentClient(path=settings.chroma_persist_dir)
    return client.get_or_create_collection("chunks")


def add_chunks(ids: list[str], texts: list[str], embeddings: list[list[float]], metadatas: list[dict]) -> None:
    # upsert, not add: Neo4j's writes are already idempotent (graphdb.py MERGEs
    # on norm_name/relationship type), but Chroma's .add() errors on a duplicate
    # id - re-running ingestion on the same articles, or resuming a batch that
    # partially failed, would throw here instead of just overwriting.
    _collection().upsert(ids=ids, documents=texts, embeddings=embeddings, metadatas=metadatas)


def query(embedding: list[float], top_k: int = 5) -> list[dict]:
    res = _collection().query(query_embeddings=[embedding], n_results=top_k)
    if not res["ids"][0]:
        return []
    return [
        {"id": res["ids"][0][i], "text": res["documents"][0][i], **res["metadatas"][0][i]}
        for i in range(len(res["ids"][0]))
    ]


def chunk_count() -> int:
    return _collection().count()
