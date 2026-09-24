"""Phase 2 batch: run entity/relationship extraction over every corpus chunk
into Neo4j. Resumable — progress is persisted so an interrupted run (rate
limits, network blip) can restart without re-spending Gemini quota on
already-processed chunks.
"""
import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import settings  # noqa: E402
from app.services import graphdb  # noqa: E402
from app.services.chunking import chunk_text  # noqa: E402
from app.services.extraction import extract  # noqa: E402

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
# v2 = the event relation types + detail. A new file so every chunk is re-read
# under the new schema; MERGE keeps the v1 nodes/edges and entity merges intact.
PROGRESS_FILE = DATA_DIR / "graph_progress_v2.json"
# Optional CLI override, e.g. `python build_graph.py gemini-3.1-flash-lite` -
# lets a continuation run switch to a fresh per-model quota bucket after the
# default model's daily cap is hit, without changing the app's live default.
MODEL = sys.argv[1] if len(sys.argv) > 1 else None
WORKERS = int(os.environ.get("BUILD_WORKERS", 4))  # parallel LLM calls (openai/ollama providers); lower it if the router rate-limits


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

    entities_total, failures, consecutive_failures, start = 0, 0, 0, time.monotonic()
    # LLM calls run in parallel; Neo4j writes stay on this thread so concurrent
    # MERGEs can't race into duplicate nodes. Gemini's extract() throttles through
    # one global timestamp, so it stays sequential.
    workers = WORKERS if settings.llm_provider != "gemini" else 1
    pool = ThreadPoolExecutor(workers)
    futures = {pool.submit(extract, text, MODEL): (chunk_id, text, article) for chunk_id, text, article in todo}
    for n, future in enumerate(as_completed(futures), 1):
        chunk_id, text, article = futures[future]
        try:
            result = future.result()
            graphdb.write_extraction(
                result.entities, result.relationships, chunk_id,
                str(article["id"]), article["title"], str(article.get("date", "")),
            )
            entities_total += len(result.entities)
            done.add(chunk_id)  # only mark done on success - failures retry on resume
            consecutive_failures = 0
        except Exception as e:
            failures += 1
            consecutive_failures += 1
            print(f"  [{n}/{len(todo)}] FAILED {chunk_id}: {e}")
            # One hung upstream times out every in-flight call at once, so "quota
            # exhausted" means a full round of failures per worker, not just 3.
            if consecutive_failures >= 3 * workers:
                print(f"  {consecutive_failures} failures in a row - likely quota exhausted, stopping early")
                pool.shutdown(wait=False, cancel_futures=True)
                break

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
