"""Neo4j writer + reader (FR-5, FR-6, graph stats/subgraph endpoints).

Entity resolution (FR-5) is name-normalization only: lowercase, strip
punctuation/legal suffixes, collapse whitespace, then MERGE on that key.
This catches "OpenAI" vs "OpenAI." but not "Altman" vs "Sam Altman" —
that needs the LLM-assisted alias merge the PRD flags as a known hard
problem. ponytail: normalization-only resolution; add alias merging if
the demo corpus shows enough fragmentation to matter.
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
        for e in entities:
            session.run(
                f"MERGE (n:{e.type} {{norm_name: $norm_name}}) "
                "ON CREATE SET n.name = $name",
                norm_name=normalize_name(e.name),
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
                src_norm=normalize_name(r.source),
                src_name=r.source,
                tgt_norm=normalize_name(r.target),
                tgt_name=r.target,
                chunk_id=chunk_id,
                article_title=article_title,
                date=date,
                confidence=r.confidence,
            )


def stats() -> dict:
    with _session() as session:
        entities = session.run("MATCH (n) RETURN count(n) AS c").single()["c"]
        relationships = session.run("MATCH ()-[r]->() RETURN count(r) AS c").single()["c"]
        communities = session.run(
            "MATCH (n) WHERE n.community_id IS NOT NULL RETURN count(DISTINCT n.community_id) AS c"
        ).single()["c"]
    return {"entities": entities, "relationships": relationships, "communities": communities}


def subgraph(entity_name: str, hops: int = 2) -> dict:
    norm = normalize_name(entity_name)
    with _session() as session:
        result = session.run(
            f"MATCH (start {{norm_name: $norm}}) "
            f"OPTIONAL MATCH path = (start)-[*1..{hops}]-(other) "
            "RETURN start, collect(path) AS paths",
            norm=norm,
        )
        record = result.single()
        if record is None or record["start"] is None:
            return {"entity": entity_name, "nodes": [], "edges": []}

        nodes, edges, seen_edges = {}, [], set()
        start = record["start"]
        nodes[start.element_id] = {"id": start.element_id, "name": start.get("name"), "type": list(start.labels)[0]}
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
                    }
                )
        return {"entity": entity_name, "nodes": list(nodes.values()), "edges": edges}
