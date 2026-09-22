import json
import time
from collections import defaultdict
from pathlib import Path

from fastapi import APIRouter

from app.routers.query import QueryRequest, query_global, query_graph_rag, query_vanilla_rag
from app.services import eval as judge

router = APIRouter(prefix="/eval", tags=["eval"])
DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
BENCHMARK_FILE = DATA_DIR / "benchmark.json"
RESULTS_FILE = DATA_DIR / "eval_results.json"

_MIN_INTERVAL_S = 4.5  # ~13 req/min - headroom under Gemini free tier's 15 RPM cap
_last_call_at = 0.0


def _throttle() -> None:
    global _last_call_at
    wait = _last_call_at + _MIN_INTERVAL_S - time.monotonic()
    if wait > 0:
        time.sleep(wait)
    _last_call_at = time.monotonic()


def _summarize(results: list[dict]) -> dict:
    by_group = defaultdict(list)
    for r in results:
        by_group[r["category"]].append(r)
        by_group["overall"].append(r)

    summary = {}
    for group, rows in by_group.items():
        n = len(rows)
        summary[group] = {
            "n": n,
            "vanilla_relevance": round(sum(r["vanilla_relevance"] for r in rows) / n, 2),
            "vanilla_faithfulness": round(sum(r["vanilla_faithfulness"] for r in rows) / n, 2),
            "graph_relevance": round(sum(r["graph_relevance"] for r in rows) / n, 2),
            "graph_faithfulness": round(sum(r["graph_faithfulness"] for r in rows) / n, 2),
        }
    return summary


@router.post("/run")
async def run_eval():
    """Runs the curated benchmark (FR-20) through both pipelines and scores each
    answer with an LLM judge (FR-21). Throttled since ~20 questions x 2 systems x
    (1 answer + 1 judge call) adds up fast against the free-tier RPM cap."""
    if not BENCHMARK_FILE.exists():
        return {"status": "no_benchmark", "results": [], "summary": {}}

    questions = json.loads(BENCHMARK_FILE.read_text(encoding="utf-8"))
    results = []

    for q in questions:
        req = QueryRequest(question=q["question"])

        _throttle()
        vanilla = await query_vanilla_rag(req)
        _throttle()
        graph = await query_global(req) if q["category"] == "global" else await query_graph_rag(req)

        _throttle()
        vanilla_score = judge.score(q["question"], q["reference_answer"], vanilla["answer"])
        _throttle()
        graph_score = judge.score(q["question"], q["reference_answer"], graph["answer"])

        results.append({
            "id": q["id"],
            "category": q["category"],
            "question": q["question"],
            "reference_answer": q["reference_answer"],
            "vanilla_answer": vanilla["answer"],
            "vanilla_relevance": vanilla_score.relevance,
            "vanilla_faithfulness": vanilla_score.faithfulness,
            "graph_answer": graph["answer"],
            "graph_relevance": graph_score.relevance,
            "graph_faithfulness": graph_score.faithfulness,
        })

    payload = {"results": results, "summary": _summarize(results)}
    RESULTS_FILE.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return payload


@router.get("/results")
async def eval_results():
    if not RESULTS_FILE.exists():
        return {"results": [], "summary": {}}
    return json.loads(RESULTS_FILE.read_text(encoding="utf-8"))
