from functools import lru_cache

from sentence_transformers import SentenceTransformer

from app.config import settings


@lru_cache
def _model() -> SentenceTransformer:
    return SentenceTransformer(settings.embedding_model)


def embed(texts: list[str]) -> list[list[float]]:
    return _model().encode(texts, show_progress_bar=False).tolist()
