"""Phase 2 batch: run entity/relationship extraction over every corpus chunk
into Neo4j. Resumable — progress is persisted so an interrupted run (rate
limits, network blip) can restart without re-spending Gemini quota on
already-processed chunks.
"""
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services import graphdb  # noqa: E402
from app.services.chunking import chunk_text  # noqa: E402
from app.services.extraction import extract  # noqa: E402

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
PROGRESS_FILE = DATA_DIR / "graph_progress.json"


def load_progress() -> set[str]:
    if PROGRESS_FILE.exists():
        return set(json.loads(PROGRESS_FILE.read_text(encoding="utf-8")))
    return set()


def save_progress(done: set[str]) -> None:
    PROGRESS_FILE.write_text(json.dumps(sorted(done)), encoding="utf-8")


def main() -> None:
    articles = json.loads((DATA_DIR / "corpus.json").read_text(encoding="utf-8"))
    chunks = [
        (f"{a['id']}_{i}", text, a)
        for a in articles
        for i, text in enumerate(chunk_text(a["body"]))
    ]

    done = load_progress()
    todo = [c for c in chunks if c[0] not in done]
    print(f"{len(chunks)} chunks total, {len(done)} already done, {len(todo)} to process")

    entities_total, failures, start = 0, 0, time.monotonic()
    for n, (chunk_id, text, article) in enumerate(todo, 1):
        try:
            result = extract(text)
            graphdb.write_extraction(
                result.entities, result.relationships, chunk_id,
                str(article["id"]), article["title"], str(article.get("date", "")),
            )
            entities_total += len(result.entities)
        except Exception as e:
            failures += 1
            print(f"  [{n}/{len(todo)}] FAILED {chunk_id}: {e}")
        done.add(chunk_id)

        if n % 20 == 0 or n == len(todo):
            save_progress(done)
            elapsed = time.monotonic() - start
            rate = n / elapsed * 60
            print(f"  [{n}/{len(todo)}] {entities_total} entities, {failures} failures, {rate:.1f}/min")

    save_progress(done)
    print(f"Done. {len(done)}/{len(chunks)} chunks processed, {failures} failures this run.")
    print(graphdb.stats())


if __name__ == "__main__":
    main()
