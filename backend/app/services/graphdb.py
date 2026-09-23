"""Neo4j writer + reader (FR-5, FR-6, graph stats/subgraph endpoints).

Entity resolution (FR-5) has two layers. At write time: name normalization
(lowercase, strip punctuation/legal suffixes, collapse whitespace), MERGE on
that key, plus a lookup of alias_norms so a name already merged away by
scripts/resolve_entities.py ("Space X") lands on its canonical node
("SpaceX") instead of being recreated. The alias merging itself (spelling
variants, bare surnames) is rule-based and lives in services/resolution.py.
"""
import re
from functools import lru_cache

from neo4j import GraphDatabase

from app.config import settings
from app.services.extraction import ENTITY_TYPES, RELATION_TYPES, Entity, Relationship

_SUFFIXES = re.compile(r"\b(inc|corp|corporation|ltd|llc|co)\b\.?", re.IGNORECASE)


def normalize_name(name: str) -> str:
    n = name.lower().strip()
    n = _SUFFIXES.sub("", n)
    n = re.sub(r"[^\w\s]", "", n)
    return re.sub(r"\s+", " ", n).strip()


@lru_cache
def _driver():
    return GraphDatabase.driver(settings.neo4j_uri, auth=(settings.neo4j_user, settings.neo4j_password))


def _session():
    return _driver().session(database=settings.neo4j_database)


def write_extraction(
    entities: list[Entity],
    relationships: list[Relationship],
    chunk_id: str,
    article_id: str,
    article_title: str,
    date: str,
) -> None:
    name_to_type = {e.name: e.type for e in entities}

    with _session() as session:
        canonical = _canonical_norms(session, [(e.type, normalize_name(e.name)) for e in entities])

        def norm(name: str) -> str:
            n = normalize_name(name)
            return canonical.get((name_to_type.get(name), n), n)

        for e in entities:
            session.run(
                f"MERGE (n:{e.type} {{norm_name: $norm_name}}) "
                "ON CREATE SET n.name = $name",
                norm_name=norm(e.name),
                name=e.name,
            )

        for r in relationships:
            src_type = name_to_type.get(r.source)
            tgt_type = name_to_type.get(r.target)
            if src_type not in ENTITY_TYPES or tgt_type not in ENTITY_TYPES or r.type not in RELATION_TYPES:
                continue
            session.run(
                f"MERGE (a:{src_type} {{norm_name: $src_norm}}) ON CREATE SET a.name = $src_name "
                f"MERGE (b:{tgt_type} {{norm_name: $tgt_norm}}) ON CREATE SET b.name = $tgt_name "
                f"MERGE (a)-[rel:{r.type}]->(b) "
                "ON CREATE SET rel.source_chunk_ids = [$chunk_id], rel.source_article = $article_title, "
                "  rel.date = $date, rel.confidence = $confidence "
                "ON MATCH SET rel.source_chunk_ids = CASE WHEN NOT $chunk_id IN rel.source_chunk_ids "
                "  THEN rel.source_chunk_ids + $chunk_id ELSE rel.source_chunk_ids END",
                src_norm=norm(r.source),
                src_name=r.source,
                tgt_norm=norm(r.target),
                tgt_name=r.target,
                chunk_id=chunk_id,
                article_title=article_title,
                date=date,
                confidence=r.confidence,
            )


def _canonical_norms(session, keys: list[tuple[str, str]]) -> dict[tuple[str, str], str]:
    """(type, norm_name) -> the canonical node's norm_name, for names that
    resolve_entities.py previously merged into another node as an alias."""
    result = session.run(
        "UNWIND $rows AS row MATCH (c) WHERE row.type IN labels(c) AND row.norm IN c.alias_norms "
        "RETURN row.type AS type, row.norm AS norm, c.norm_name AS canonical",
        rows=[{"type": t, "norm": n} for t, n in keys],
    )
    return {(r["type"], r["norm"]): r["canonical"] for r in result}


def resolution_candidates() -> list[dict]:
    with _session() as session:
        result = session.run(
            "MATCH (n) WHERE NOT n:Community RETURN elementId(n) AS id, labels(n)[0] AS type, "
            "n.name AS name, n.norm_name AS norm_name, coalesce(n.alias_norms, []) AS alias_norms, "
            "COUNT { (n)--() } AS degree"
        )
        return [r.data() for r in result]


def merge_entities(keep_id: str, dup_ids: list[str], alias_norms: list[str]) -> None:
    """Fold dup nodes into keep (APOC, available on Aura). The keep node's
    properties win; relationships to the same neighbor/type are merged, and
    the dups' names are kept as alias_norms for write-time/query-time lookup."""
    with _session() as session:
        session.run(
            "MATCH (k) WHERE elementId(k) = $keep "
            "SET k.alias_norms = [a IN apoc.coll.toSet(coalesce(k.alias_norms, []) + $aliases) "
            "  WHERE a <> k.norm_name] "
            "WITH k MATCH (d) WHERE elementId(d) IN $dups "
            "WITH k, collect(d) AS ds "
            "CALL apoc.refactor.mergeNodes([k] + ds, {properties: 'discard', mergeRels: true}) "
            "YIELD node "
            # A keep<->dup edge becomes a self-loop after the merge - meaningless here.
            "OPTIONAL MATCH (node)-[loop]->(node) DELETE loop",
            keep=keep_id,
            dups=dup_ids,
            aliases=alias_norms,
        )


def all_nodes_and_edges() -> tuple[list[dict], list[dict]]:
    """Pull the whole graph for the Phase 5 community-detection job. AuraDB Free has
    no GDS/Louvain plugin, so Louvain runs in networkx in the backend instead - this
    just hands it the node ids and edges to build that graph from."""
    with _session() as session:
        nodes = [
            {"id": r["n"].element_id, "name": r["n"].get("name")}
            for r in session.run("MATCH (n) WHERE NOT n:Community RETURN n")
        ]
        edges = [
            {"source": r["a"].element_id, "target": r["b"].element_id}
            for r in session.run("MATCH (a)-[r]->(b) WHERE NOT a:Community AND NOT b:Community RETURN a, b")
        ]
    return nodes, edges


def write_communities(assignments: dict[str, int]) -> None:
    rows = [{"id": node_id, "cid": cid} for node_id, cid in assignments.items()]
    with _session() as session:
        session.run(
            "UNWIND $rows AS row MATCH (n) WHERE elementId(n) = row.id SET n.community_id = row.cid",
            rows=rows,
        )


def community_members(community_id: int) -> list[dict]:
    with _session() as session:
        result = session.run(
            "MATCH (n) WHERE n.community_id = $cid RETURN n.name AS name, labels(n)[0] AS type",
            cid=community_id,
        )
        return [{"name": r["name"], "type": r["type"]} for r in result]


def community_relationships(community_id: int, limit: int = 40) -> list[dict]:
    with _session() as session:
        result = session.run(
            "MATCH (a)-[r]->(b) WHERE a.community_id = $cid AND b.community_id = $cid "
            "RETURN a.name AS src, type(r) AS type, b.name AS tgt LIMIT $limit",
            cid=community_id,
            limit=limit,
        )
        return [{"source": r["src"], "type": r["type"], "target": r["tgt"]} for r in result]


def write_community_summary(community_id: int, summary: str, size: int, fingerprint: str) -> None:
    with _session() as session:
        session.run(
            "MERGE (c:Community {id: $id}) SET c.summary = $summary, c.size = $size, c.fingerprint = $fp",
            id=community_id,
            summary=summary,
            size=size,
            fp=fingerprint,
        )


def current_community_members() -> dict[int, list[str]]:
    """community_id -> member element ids, as currently written on the nodes."""
    with _session() as session:
        result = session.run(
            "MATCH (n) WHERE n.community_id IS NOT NULL AND NOT n:Community "
            "RETURN n.community_id AS cid, collect(elementId(n)) AS ids"
        )
        return {r["cid"]: r["ids"] for r in result}


def all_community_nodes() -> list[dict]:
    with _session() as session:
        result = session.run("MATCH (c:Community) RETURN c.id AS id, c.summary AS summary, c.fingerprint AS fp")
        return [r.data() for r in result]


def delete_communities_except(keep: list[tuple[int, str]]) -> None:
    """Drop every :Community whose (id, fingerprint) isn't in keep - its id now
    points at a different member set, or no longer exists."""
    with _session() as session:
        session.run(
            # IS NULL first: [id, null] IN list is null (not false), which would
            # silently keep every pre-fingerprint summary.
            "MATCH (c:Community) WHERE c.fingerprint IS NULL OR NOT [c.id, c.fingerprint] IN $keep "
            "DETACH DELETE c",
            keep=[list(k) for k in keep],
        )


def community_summaries() -> list[dict]:
    # size >= 3 matches detect_communities.py's MIN_SIZE - 2-node pairs are entity-
    # resolution noise (see graphdb.py's module docstring), not real topic clusters.
    with _session() as session:
        result = session.run(
            "MATCH (c:Community) WHERE c.summary IS NOT NULL AND c.size >= 3 "
            "RETURN c.id AS id, c.summary AS summary, c.size AS size ORDER BY c.size DESC"
        )
        return [{"id": r["id"], "summary": r["summary"], "size": r["size"]} for r in result]


def stats() -> dict:
    # :Community nodes are summary metadata (Phase 5), not extracted entities - exclude
    # them here so this count matches what ingestion/extraction actually produced.
    with _session() as session:
        entities = session.run("MATCH (n) WHERE NOT n:Community RETURN count(n) AS c").single()["c"]
        relationships = session.run("MATCH ()-[r]->() RETURN count(r) AS c").single()["c"]
        communities = session.run(
            "MATCH (n) WHERE n.community_id IS NOT NULL RETURN count(DISTINCT n.community_id) AS c"
        ).single()["c"]
    return {"entities": entities, "relationships": relationships, "communities": communities}


def overview(top: int = 8) -> dict:
    """Aggregate counts for the dashboard. Topics counts summarized :Community
    nodes of 3+ members - the same set the global-question path uses - not raw
    community ids, most of which are 1-2 node fragments."""
    with _session() as session:
        by_type = {r["t"]: r["n"] for r in session.run(
            "MATCH (n) WHERE NOT n:Community RETURN labels(n)[0] AS t, count(*) AS n")}
        rels = [{"type": r["t"], "count": r["n"]} for r in session.run(
            "MATCH ()-[r]->() RETURN type(r) AS t, count(*) AS n ORDER BY n DESC")]
        top_entities = [r.data() for r in session.run(
            "MATCH (n) WHERE NOT n:Community "
            "RETURN n.name AS name, labels(n)[0] AS type, COUNT { (n)--() } AS connections "
            "ORDER BY connections DESC, name LIMIT $top", top=top)]
        topics = session.run(
            "MATCH (c:Community) WHERE c.summary IS NOT NULL AND c.size >= 3 RETURN count(c) AS n").single()["n"]
    return {
        "entities": sum(by_type.values()),
        "entities_by_type": by_type,
        "relationships": sum(r["count"] for r in rels),
        "relationships_by_type": rels,
        "top_entities": top_entities,
        "topics": topics,
    }


@lru_cache
def _entity_patterns() -> tuple[tuple[str, re.Pattern], ...]:
    """(name, compiled word-boundary pattern on norm_name) for every entity, cached -
    restart the app to pick up entities from newly ingested articles."""
    with _session() as session:
        result = session.run(
            "MATCH (n) WHERE n.name IS NOT NULL RETURN DISTINCT n.name AS name, "
            "[n.norm_name] + coalesce(n.alias_norms, []) AS norms"
        )
        return tuple(
            (r["name"], re.compile(rf"\b{re.escape(norm)}\b"))
            for r in result
            for norm in r["norms"]
            if norm
        )


def invalidate_entity_cache() -> None:
    """Call after ingestion writes new entities - otherwise find_entities() keeps
    matching against whatever was in the graph at first-call time until the process
    restarts, so a just-uploaded entity is invisible to Chat/Compare until then."""
    _entity_patterns.cache_clear()


def find_entities(text: str) -> list[str]:
    """Match known graph entity names in free text (query-time entity linking for Phase
    3). Plain word-boundary matching on normalized text rather than an LLM call - the
    graph is small enough for this to be reliable, and it keeps query-time Gemini quota
    usage to the single answer-generation call."""
    norm_text = normalize_name(text)
    matches = {name for name, pattern in _entity_patterns() if pattern.search(norm_text)}
    return sorted(matches, key=len, reverse=True)


def query_subgraph(entity_names: list[str], hops: int = 2) -> dict:
    """Merge per-entity subgraphs into one - the graph traversal retriever for Phase 3."""
    nodes, edges, seen_edges = {}, [], set()
    for name in entity_names:
        sub = subgraph(name, hops)
        for node in sub["nodes"]:
            nodes[node["id"]] = node
        for edge in sub["edges"]:
            key = (edge["source"], edge["target"], edge["type"])
            if key in seen_edges:
                continue
            seen_edges.add(key)
            edges.append(edge)
    return {"entities": entity_names, "nodes": list(nodes.values()), "edges": edges}


def subgraph(entity_name: str, hops: int = 2) -> dict:
    # Neo4j can't parameterize a variable-length relationship bound, so hops
    # has to be f-string interpolated below - clamp it first (1..4) so an
    # unvalidated caller can't trigger a very expensive/slow traversal.
    hops = max(1, min(hops, 4))
    norm = normalize_name(entity_name)
    with _session() as session:
        result = session.run(
            "MATCH (start) WHERE start.norm_name = $norm OR $norm IN start.alias_norms "
            "WITH start LIMIT 1 "
            f"OPTIONAL MATCH path = (start)-[*1..{hops}]-(other) "
            "RETURN start, collect(path) AS paths",
            norm=norm,
        )
        record = result.single()
        if record is None or record["start"] is None:
            return {"entity": entity_name, "nodes": [], "edges": []}

        nodes, edges, seen_edges = {}, [], set()
        start = record["start"]
        start_id = start.element_id
        nodes[start_id] = {"id": start_id, "name": start.get("name"), "type": list(start.labels)[0]}
        for path in record["paths"]:
            for node in path.nodes:
                nodes[node.element_id] = {"id": node.element_id, "name": node.get("name"), "type": list(node.labels)[0]}
            for rel in path.relationships:
                if rel.element_id in seen_edges:
                    continue
                seen_edges.add(rel.element_id)
                edges.append(
                    {
                        "source": rel.start_node.element_id,
                        "target": rel.end_node.element_id,
                        "type": rel.type,
                        "source_article": rel.get("source_article"),
                        "confidence": rel.get("confidence"),
                    }
                )

        # Direct (1-hop) edges first - Neo4j's path order isn't hop-sorted, and a hub
        # entity's subgraph can be large enough that callers truncate it (query-time
        # fact cap, UI node cap); truncating should drop distant edges, not arbitrary
        # ones that might include the entity's own direct relationships.
        # Within each tier, highest extraction confidence first.
        edges.sort(key=lambda e: (0 if start_id in (e["source"], e["target"]) else 1,
                                  -(e["confidence"] if e["confidence"] is not None else 1.0)))
        direct_ids = {start_id} | {n for e in edges if start_id in (e["source"], e["target"])
                                    for n in (e["source"], e["target"])}
        ordered_nodes = [nodes[i] for i in nodes if i in direct_ids] + [nodes[i] for i in nodes if i not in direct_ids]
        return {"entity": entity_name, "nodes": ordered_nodes, "edges": edges}
