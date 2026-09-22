from functools import lru_cache

import chromadb

from app.config import settings


@lru_cache
def _collection():
    client = chromadb.PersistentClient(path=settings.chroma_persist_dir)
    return client.get_or_create_collection("chunks")


def add_chunks(ids: list[str], texts: list[str], embeddings: list[list[float]], metadatas: list[dict]) -> None:
    _collection().add(ids=ids, documents=texts, embeddings=embeddings, metadatas=metadatas)


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
