import logging

from app.services import embeddings, extraction, graphdb, vectorstore
from app.services.chunking import chunk_text

logger = logging.getLogger(__name__)


def ingest_articles(articles: list[dict], build_graph: bool = True) -> dict:
    """articles: [{id, title, body, date, source, url}]. Chunks + embeds into Chroma
    (FR-1/2/3), and, if build_graph, runs LLM extraction into Neo4j per chunk (FR-4/5/6).
    """
    ids, texts, metadatas = [], [], []
    for article in articles:
        chunks = chunk_text(article["body"])
        for i, chunk in enumerate(chunks):
            ids.append(f"{article['id']}_{i}")
            texts.append(chunk)
            metadatas.append(
                {
                    "article_id": str(article["id"]),
                    "article_title": article["title"],
                    "date": str(article.get("date", "")),
                    "source": article.get("source", ""),
                    "url": article.get("url", ""),
                }
            )

    if not texts:
        return {"articles": 0, "chunks": 0, "entities_extracted": 0, "extraction_failures": 0}

    vectors = embeddings.embed(texts)
    vectorstore.add_chunks(ids, texts, vectors, metadatas)

    entities_extracted, failures = 0, 0
    if build_graph:
        for chunk_id, text, meta in zip(ids, texts, metadatas):
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

    return {
        "articles": len(articles),
        "chunks": len(texts),
        "entities_extracted": entities_extracted,
        "extraction_failures": failures,
    }
