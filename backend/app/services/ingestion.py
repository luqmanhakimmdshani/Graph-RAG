from app.services import embeddings, vectorstore
from app.services.chunking import chunk_text


def ingest_articles(articles: list[dict]) -> dict:
    """articles: [{id, title, body, date, source, url}]. Chunks, embeds, and upserts each."""
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
        return {"articles": 0, "chunks": 0}

    vectors = embeddings.embed(texts)
    vectorstore.add_chunks(ids, texts, vectors, metadatas)
    return {"articles": len(articles), "chunks": len(texts)}
