import logging
from typing import Callable

from app.services import embeddings, extraction, graphdb, vectorstore
from app.services.chunking import chunk_text

logger = logging.getLogger(__name__)


def ingest_articles(
    articles: list[dict],
    build_graph: bool = True,
    on_article_start: Callable[[dict], None] | None = None,
    on_article_done: Callable[[dict, dict], None] | None = None,
) -> dict:
    """articles: [{id, title, body, date, source, url}]. Chunks + embeds into Chroma
    (FR-1/2/3), and, if build_graph, runs LLM extraction into Neo4j per chunk (FR-4/5/6).

    Processes article-by-article (rather than flattening every chunk across the whole
    batch first) so on_article_start/on_article_done can report per-document progress
    (FR-9) - previously /ingest/status only had aggregate counts, with no way to tell
    which document a slow or stuck batch was on.
    """
    total_chunks = total_entities = total_failures = 0

    for article in articles:
        if on_article_start:
            on_article_start(article)

        chunks = chunk_text(article["body"])
        if not chunks:
            if on_article_done:
                on_article_done(article, {"chunks": 0, "entities_extracted": 0, "extraction_failures": 0})
            continue

        ids = [f"{article['id']}_{i}" for i in range(len(chunks))]
        metadatas = [
            {
                "article_id": str(article["id"]),
                "article_title": article["title"],
                "date": str(article.get("date", "")),
                "source": article.get("source", ""),
                "url": article.get("url", ""),
            }
            for _ in chunks
        ]

        vectors = embeddings.embed(chunks)
        vectorstore.add_chunks(ids, chunks, vectors, metadatas)

        entities_extracted = failures = 0
        if build_graph:
            for chunk_id, text, meta in zip(ids, chunks, metadatas):
                try:
                    result = extraction.extract(text)
                    graphdb.write_extraction(
                        result.entities, result.relationships, chunk_id,
                        meta["article_id"], meta["article_title"], meta["date"],
                    )
                    entities_extracted += len(result.entities)
                except Exception:
                    failures += 1
                    logger.exception("extraction failed for chunk %s", chunk_id)

            if entities_extracted:
                graphdb.invalidate_entity_cache()

        total_chunks += len(chunks)
        total_entities += entities_extracted
        total_failures += failures

        if on_article_done:
            on_article_done(article, {
                "chunks": len(chunks), "entities_extracted": entities_extracted, "extraction_failures": failures,
            })

    return {
        "articles": len(articles),
        "chunks": total_chunks,
        "entities_extracted": total_entities,
        "extraction_failures": total_failures,
    }
