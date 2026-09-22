"""One-off bulk load of backend/data/corpus.json into Chroma (Phase 1)."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.ingestion import ingest_articles  # noqa: E402

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def main() -> None:
    articles = json.loads((DATA_DIR / "corpus.json").read_text(encoding="utf-8"))
    stats = ingest_articles(articles)
    print(f"Ingested {stats['articles']} articles -> {stats['chunks']} chunks")


if __name__ == "__main__":
    main()
