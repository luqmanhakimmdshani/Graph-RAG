"""Phase 5: Louvain community detection over the Neo4j graph, then an LLM summary
per community (FR-7/FR-8). AuraDB Free has no GDS/Louvain plugin, so the graph is
pulled into networkx here and community_id is written back as a node property.

Resumable like build_graph.py: community_id assignment is cheap and always re-run,
but summarization (the slow, rate-limited part) skips communities that already have
a summary in Neo4j, so an interrupted run can restart without re-spending quota.
"""
import re
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import networkx as nx  # noqa: E402
from google.genai import errors  # noqa: E402
from networkx.algorithms.community import louvain_communities  # noqa: E402

from app.config import settings  # noqa: E402
from app.services import community, graphdb  # noqa: E402

_MIN_INTERVAL_S = 4.5  # ~13 req/min - headroom under Gemini free tier's 15 RPM cap
_MAX_RETRIES = 5
_last_call_at = 0.0
# Weak entity resolution (see graphdb.py) fragments the graph into many isolated
# 2-node pairs ("X employed_by Y") - real noise, not corpus-level clusters. Only
# summarize communities big enough to represent an actual topic/trend.
MIN_SIZE = 3


def _throttle() -> None:
    global _last_call_at
    if settings.llm_provider == "ollama":
        return  # local model, no rate limit
    wait = _last_call_at + _MIN_INTERVAL_S - time.monotonic()
    if wait > 0:
        time.sleep(wait)
    _last_call_at = time.monotonic()


def _retry_delay_s(error: Exception, default: float) -> float:
    match = re.search(r"retryDelay['\"]?\s*:\s*['\"]?(\d+)s", str(error))
    return float(match.group(1)) + 2 if match else default


def _summarize_with_retry(members: list[dict], relationships: list[dict]) -> str | None:
    for attempt in range(_MAX_RETRIES):
        _throttle()
        try:
            return community.summarize(members, relationships)
        except errors.ClientError as e:
            if e.code != 429 or attempt == _MAX_RETRIES - 1:
                raise
            time.sleep(_retry_delay_s(e, default=2**attempt * 5))
    return None


def main() -> None:
    nodes, edges = graphdb.all_nodes_and_edges()
    if not nodes:
        print("No nodes in the graph - run extraction (build_graph.py) first.")
        return

    g = nx.Graph()
    g.add_nodes_from(n["id"] for n in nodes)
    g.add_edges_from((e["source"], e["target"]) for e in edges)

    communities = louvain_communities(g, seed=42)
    sized = [c for c in communities if len(c) >= MIN_SIZE]
    print(f"{len(nodes)} nodes, {len(edges)} edges -> {len(communities)} communities ({len(sized)} with {MIN_SIZE}+ members)")

    assignments = {node_id: i for i, com in enumerate(communities) for node_id in com}
    graphdb.write_communities(assignments)

    done = {s["id"] for s in graphdb.community_summaries()}
    todo = [(i, com) for i, com in enumerate(communities) if len(com) >= MIN_SIZE and i not in done]
    print(f"{len(done)} already summarized, {len(todo)} to go")

    for n, (i, com) in enumerate(todo, 1):
        members = graphdb.community_members(i)
        relationships = graphdb.community_relationships(i)
        try:
            summary = _summarize_with_retry(members, relationships)
        except Exception as e:
            print(f"  [{n}/{len(todo)}] community {i} FAILED: {e}")
            continue
        graphdb.write_community_summary(i, summary, len(com))
        print(f"  [{n}/{len(todo)}] community {i}: {len(com)} members - {summary[:80]}")


if __name__ == "__main__":
    main()
