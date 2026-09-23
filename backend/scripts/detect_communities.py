"""Phase 5: Louvain community detection over the Neo4j graph, then an LLM summary
per community (FR-7/FR-8). AuraDB Free has no GDS/Louvain plugin, so the graph is
pulled into networkx here and community_id is written back as a node property.

Resumable like build_graph.py: community_id assignment is cheap and always re-run,
but summarization (the slow, rate-limited part) is keyed on a fingerprint of each
cluster's member set, not its id - Louvain renumbers clusters whenever the graph
changes (new ingestion, resolve_entities.py merges), so an id alone would pin an old
summary onto a different cluster. Unchanged clusters keep their summary; only new or
changed ones hit the LLM, and an interrupted run restarts where it left off.
"""
import hashlib
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


def _fingerprint(member_ids) -> str:
    return hashlib.sha1("|".join(sorted(member_ids)).encode()).hexdigest()


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

    # Summaries reusable by member set: from fingerprinted :Community nodes, plus
    # (for summaries written before fingerprints existed) the membership still on
    # the nodes from the previous run - read before it's overwritten below.
    existing = graphdb.all_community_nodes()
    by_id = {c["id"]: c["summary"] for c in existing if c["summary"]}
    reusable = {_fingerprint(ids): by_id[cid] for cid, ids in graphdb.current_community_members().items() if cid in by_id}
    reusable.update({c["fp"]: c["summary"] for c in existing if c["fp"] and c["summary"]})

    assignments = {node_id: i for i, com in enumerate(communities) for node_id in com}
    graphdb.write_communities(assignments)

    sized_fps = [(i, com, _fingerprint(com)) for i, com in enumerate(communities) if len(com) >= MIN_SIZE]
    done = {(c["id"], c["fp"]) for c in existing if c["summary"]} & {(i, fp) for i, _, fp in sized_fps}
    graphdb.delete_communities_except(list(done))

    reused = 0
    for i, com, fp in sized_fps:
        if (i, fp) not in done and fp in reusable:
            graphdb.write_community_summary(i, reusable[fp], len(com), fp)
            done.add((i, fp))
            reused += 1
    todo = [(i, com, fp) for i, com, fp in sized_fps if (i, fp) not in done]
    print(f"{len(done) - reused} unchanged, {reused} reused after renumbering, {len(todo)} to summarize")

    for n, (i, com, fp) in enumerate(todo, 1):
        members = graphdb.community_members(i)
        relationships = graphdb.community_relationships(i)
        try:
            summary = _summarize_with_retry(members, relationships)
        except Exception as e:
            print(f"  [{n}/{len(todo)}] community {i} FAILED: {e}")
            continue
        graphdb.write_community_summary(i, summary, len(com), fp)
        print(f"  [{n}/{len(todo)}] community {i}: {len(com)} members - {summary[:80]}")


if __name__ == "__main__":
    main()
