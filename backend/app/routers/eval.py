import asyncio
import json
import logging
import time
from collections import defaultdict
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends

from app.config import ensure_writable, settings
from app.routers.query import QueryRequest, query_generic_rag, query_global, query_graph_rag
from app.services import eval as judge

router = APIRouter(prefix="/eval", tags=["eval"])
logger = logging.getLogger(__name__)
DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
BENCHMARK_FILE = DATA_DIR / "benchmark.json"
RESULTS_FILE = DATA_DIR / "eval_results.json"

_MIN_INTERVAL_S = 4.5  # ~13 req/min - headroom under Gemini free tier's 15 RPM cap
_last_call_at = 0.0

# 20 questions x 2 systems x (1 answer + 1 judge call), throttled, adds up to
# several minutes - awaiting the whole run inline blocked the request that
# long with no progress feedback, and one bad judge response killed the
# entire run. Now it's a background task: results are written after every
# question (so a crash mid-run keeps what's done so far) and a failure on
# one question is recorded as an error row instead of aborting the rest.
_state = {"running": False, "completed": 0, "total": 0}


def _throttle() -> None:
    global _last_call_at
    if settings.llm_provider == "ollama":
        return  # local model, no rate limit
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
            "generic_relevance": round(sum(r["generic_relevance"] for r in rows) / n, 2),
            "generic_faithfulness": round(sum(r["generic_faithfulness"] for r in rows) / n, 2),
            "graph_relevance": round(sum(r["graph_relevance"] for r in rows) / n, 2),
            "graph_faithfulness": round(sum(r["graph_faithfulness"] for r in rows) / n, 2),
        }
    return summary


def _write_partial(results: list[dict]) -> None:
    payload = {"results": results, "summary": _summarize(results) if results else {}}
    RESULTS_FILE.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def _run_eval_job(questions: list[dict]) -> None:
    # Deliberately a plain (non-async) function: FastAPI's BackgroundTasks runs
    # a sync callable in a worker thread (run_in_threadpool) automatically, but
    # would run an async one directly on the main event loop. query_generic_rag
    # etc. are async def but have no real await inside - they're synchronous,
    # blocking Gemini/Neo4j/Chroma calls underneath. Awaiting them (and the
    # throttle's time.sleep) from an async version of this function froze the
    # entire server - every other request, including unrelated ones - for the
    # whole multi-minute eval run. asyncio.run() bridges into each async call
    # from here, safely, since this thread has no event loop of its own.
    _state.update(running=True, completed=0, total=len(questions))
    results = []
    for q in questions:
        try:
            req = QueryRequest(question=q["question"])

            _throttle()
            generic = asyncio.run(query_generic_rag(req))
            _throttle()
            graph = asyncio.run(query_global(req) if q["category"] == "global" else query_graph_rag(req))

            # A pipeline that errored returns answer "" - judging that let a small
            # judge model score an empty answer 4-5. Score it 0 and say why.
            pipeline_errors = {}
            scores = {}
            for name, res in (("generic", generic), ("graph", graph)):
                if res.get("error") or not res["answer"].strip():
                    pipeline_errors[name] = res.get("error") or "empty answer"
                    scores[name] = judge.JudgeScore(relevance=0, faithfulness=0, reasoning="")
                else:
                    _throttle()
                    scores[name] = judge.score(q["question"], q["reference_answer"], res["answer"])
            generic_score, graph_score = scores["generic"], scores["graph"]

            results.append({
                **({"error": "; ".join(f"{k}: {v}" for k, v in pipeline_errors.items())} if pipeline_errors else {}),
                "id": q["id"],
                "category": q["category"],
                "question": q["question"],
                "reference_answer": q["reference_answer"],
                "generic_answer": generic["answer"],
                "generic_relevance": generic_score.relevance,
                "generic_faithfulness": generic_score.faithfulness,
                "graph_answer": graph["answer"],
                "graph_relevance": graph_score.relevance,
                "graph_faithfulness": graph_score.faithfulness,
            })
        except Exception:
            logger.exception("eval scoring failed for question %s", q.get("id"))
            results.append({
                "id": q["id"], "category": q["category"], "question": q["question"],
                "reference_answer": q["reference_answer"],
                "generic_answer": "", "generic_relevance": 0, "generic_faithfulness": 0,
                "graph_answer": "", "graph_relevance": 0, "graph_faithfulness": 0,
                "error": "scoring failed for this question - see server logs",
            })
        finally:
            _state["completed"] += 1
            _write_partial(results)
    _state["running"] = False


@router.post("/run", dependencies=[Depends(ensure_writable)])
async def run_eval(background_tasks: BackgroundTasks):
    """Runs the curated benchmark (FR-20) through both pipelines and scores each
    answer with an LLM judge (FR-21), as a background task - see _run_eval_job."""
    if not BENCHMARK_FILE.exists():
        return {"status": "no_benchmark"}
    if _state["running"]:
        return {"status": "already_running", "completed": _state["completed"], "total": _state["total"]}

    questions = json.loads(BENCHMARK_FILE.read_text(encoding="utf-8"))
    background_tasks.add_task(_run_eval_job, questions)
    return {"status": "running", "total": len(questions)}


@router.get("/results")
async def eval_results():
    payload = json.loads(RESULTS_FILE.read_text(encoding="utf-8")) if RESULTS_FILE.exists() else {"results": [], "summary": {}}
    payload["running"] = _state["running"]
    payload["completed"] = _state["completed"]
    payload["total"] = _state["total"]
    return payload


@router.get("/questions")
async def eval_questions():
    """The curated benchmark set (FR-20), for the Compare page's preset-question
    dropdown (FR-18) - id/category/question only, no reference_answer, since that's
    for scoring, not for a user picking a question to ask."""
    if not BENCHMARK_FILE.exists():
        return []
    questions = json.loads(BENCHMARK_FILE.read_text(encoding="utf-8"))
    return [{"id": q["id"], "category": q["category"], "question": q["question"]} for q in questions]
