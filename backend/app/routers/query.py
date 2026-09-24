import logging
import json
from functools import lru_cache
from pathlib import Path

import numpy as np
from pydantic import BaseModel
from fastapi import APIRouter

from app.services import embeddings, graphdb, llm, vectorstore

log = logging.getLogger("uvicorn.error")

router = APIRouter(prefix="/query", tags=["query"])
DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"


class QueryRequest(BaseModel):
    question: str
    top_k: int = 5
    hops: int = 2


def _build_prompt(question: str, chunks: list[dict]) -> str:
    context = "\n\n".join(
        f"[{i+1}] ({c['article_title']}, {c['source']}, {c['date']})\n{c['text']}"
        for i, c in enumerate(chunks)
    )
    return (
        "Answer the question using ONLY the context below. If the context doesn't "
        "contain the answer, say so. Cite sources inline using [1], [2], etc. "
        "Respond in plain text (no markdown formatting).\n\n"
        f"Context:\n{context}\n\nQuestion: {question}\n\nAnswer:"
    )


def _citations(chunks: list[dict]) -> list[dict]:
    seen, citations = set(), []
    for c in chunks:
        if c["article_id"] in seen:
            continue
        seen.add(c["article_id"])
        citations.append(
            {"article_id": c["article_id"], "title": c["article_title"], "source": c["source"], "url": c["url"]}
        )
    return citations


@lru_cache
def _articles_by_title() -> dict[str, dict]:
    articles = json.loads((DATA_DIR / "corpus.json").read_text(encoding="utf-8"))
    return {a["title"]: a for a in articles}


# Hub entities (e.g. "OpenAI") pull in a big merged subgraph. MAX_FACTS bounds
# what reaches the prompt (edges are already direct-neighbor-first, so this stays
# reasonably complete); MAX_CITATIONS separately bounds the UI list so a few
# hundred distinct source articles don't turn "Sources" into a wall of links.
MAX_FACTS = 60
MAX_CITATIONS = 10
# Extraction confidence is mostly high (avg ~0.93); the few edges under 0.5
# are the LLM hedging on a relationship it wasn't sure the text states.
MIN_CONFIDENCE = 0.5


def _confident(edges: list[dict]) -> list[dict]:
    return [e for e in edges if e.get("confidence") is None or e["confidence"] >= MIN_CONFIDENCE]


def _graph_facts(nodes_by_id: dict[str, dict], edges: list[dict]) -> list[str]:
    facts = []
    for e in edges[:MAX_FACTS]:
        src = nodes_by_id.get(e["source"], {}).get("name", "?")
        tgt = nodes_by_id.get(e["target"], {}).get("name", "?")
        rel = e["type"].replace("_", " ").lower()
        detail = f" - {e['detail']}" if e.get("detail") else ""
        facts.append(f"[{len(facts)+1}] {src} {rel} {tgt}{detail} (source: {e.get('source_article') or 'unknown'})")
    return facts


def _graph_citations(edges: list[dict]) -> list[dict]:
    seen, citations, articles = set(), [], _articles_by_title()
    for e in edges[:MAX_FACTS]:
        if len(citations) >= MAX_CITATIONS:
            break
        title = e.get("source_article")
        if not title or title in seen:
            continue
        seen.add(title)
        article = articles.get(title, {})
        citations.append(
            {"article_id": str(article.get("id", title)), "title": title,
             "source": article.get("source", ""), "url": article.get("url", "")}
        )
    return citations


def _passages(question: str, top_k: int) -> list[dict]:
    """The article text behind the facts: a fact says who is linked, a passage says
    why - "Why was Sam Altman fired?" needs the second. Best-effort: a vector store
    outage still leaves a facts-only answer."""
    try:
        return vectorstore.query(embeddings.embed([question])[0], top_k=top_k)
    except Exception:
        return []


def _build_graph_prompt(question: str, facts: list[str], passages: list[dict]) -> str:
    context = "\n".join(facts)
    text = "\n\n".join(
        f"[{len(facts)+i+1}] ({c['article_title']}, {c['source']}, {c['date']})\n{c['text']}"
        for i, c in enumerate(passages)
    )
    return (
        "Answer the question using ONLY the graph facts and article passages below. "
        "Each fact is a relationship extracted from a news article; use the facts to "
        "connect names and the passages for reasons and details. If neither contains "
        "the answer, say so. Cite inline using [1], [2], etc. "
        "Respond in plain text (no markdown formatting).\n\n"
        f"Facts:\n{context}\n\nPassages:\n{text}\n\nQuestion: {question}\n\nAnswer:"
    )


@router.post("")
async def query_graph_rag(req: QueryRequest):
    """No explicit local/multi-hop/global classification (PRD's own open question,
    FR-10) - instead this always tries the graph traversal first, and falls back to
    the corpus-wide community-summary path (query_global) whenever no entities or no
    connecting relationships were found, on the assumption that's a sign the question
    doesn't name specific things covered by a subgraph (a "what are the main trends"
    question rather than a "who did X" one)."""
    empty_subgraph = {"nodes": [], "edges": []}
    try:
        entities = graphdb.find_entities(req.question)
        data = graphdb.query_subgraph(entities, req.hops) if entities else {"nodes": [], "edges": []}
        edges = _confident(data["edges"])
        linked = {n for e in edges for n in (e["source"], e["target"])}
        nodes = [n for n in data["nodes"] if n["id"] in linked]
        facts = _graph_facts({n["id"]: n for n in nodes}, edges)
        subgraph = {"nodes": nodes, "edges": edges}

        if not facts:
            global_result = await query_global(req)
            return {**global_result, "subgraph": empty_subgraph, "mode": "global"}

        passages = _passages(req.question, req.top_k)
        answer = llm.generate(_build_graph_prompt(req.question, facts, passages))
        citations = _graph_citations(edges)
        cited = {c["title"] for c in citations}
        citations += [c for c in _citations(passages) if c["title"] not in cited]
        return {"answer": answer, "citations": citations, "subgraph": subgraph, "mode": "graph"}
    except Exception:
        log.exception("query failed")
        return {"answer": "", "citations": [], "subgraph": empty_subgraph,
                "error": "Graph RAG query failed - Neo4j or the LLM may be unreachable", "mode": "error"}


@router.post("/generic")
async def query_generic_rag(req: QueryRequest):
    try:
        query_vector = embeddings.embed([req.question])[0]
        chunks = vectorstore.query(query_vector, top_k=req.top_k)
        if not chunks:
            return {"answer": "No documents have been ingested yet.", "citations": []}
        answer = llm.generate(_build_prompt(req.question, chunks))
        return {"answer": answer, "citations": _citations(chunks)}
    except Exception:
        log.exception("query failed")
        return {"answer": "", "citations": [], "error": "Generic RAG query failed - the vector store or LLM may be unreachable"}


@router.post("/compare")
async def query_compare(req: QueryRequest):
    graph = await query_graph_rag(req)
    generic = await query_generic_rag(req)
    return {"graph_rag": graph, "generic_rag": generic}


# All 177 topic summaries made a ~18k-token prompt: over free tiers' per-request
# budgets (Groq's daily quota, OmniRoute's 15s queue deadline) and slow on the
# rest. The question only needs the topics it is about.
GLOBAL_TOP_K = 20


@lru_cache(maxsize=1)
def _summary_vectors(texts: tuple[str, ...]) -> np.ndarray:
    v = np.asarray(embeddings.embed(list(texts)))
    return v / np.linalg.norm(v, axis=1, keepdims=True)


def _relevant_summaries(question: str, summaries: list[dict], k: int = GLOBAL_TOP_K) -> list[dict]:
    """The k summaries closest in meaning to the question, best first."""
    if len(summaries) <= k:
        return summaries
    q = np.asarray(embeddings.embed([question])[0])
    sims = _summary_vectors(tuple(s["summary"] for s in summaries)) @ (q / np.linalg.norm(q))
    return [summaries[i] for i in np.argsort(-sims)[:k]]


def _build_global_prompt(question: str, summaries: list[dict]) -> str:
    context = "\n\n".join(f"[{i+1}] ({s['size']} entities) {s['summary']}" for i, s in enumerate(summaries))
    return (
        "Answer the question using ONLY the corpus-level cluster summaries below - each "
        "describes one densely-connected cluster of entities in the knowledge graph. "
        "Synthesize across clusters if needed. If the summaries don't contain the answer, "
        "say so. Cite clusters inline using [1], [2], etc. Respond in plain text (no "
        "markdown formatting).\n\n"
        f"Cluster summaries:\n{context}\n\nQuestion: {question}\n\nAnswer:"
    )


@router.post("/global")
async def query_global(req: QueryRequest):
    """Corpus-wide synthesis questions (FR-8/Phase 5) - answered from Louvain community
    summaries instead of a subgraph, since no single traversal covers a "what are the
    main trends" question the way it covers a multi-hop one."""
    try:
        summaries = graphdb.community_summaries()
        if not summaries:
            return {"answer": "No community summaries available yet - run scripts/detect_communities.py first.",
                     "citations": []}

        summaries = _relevant_summaries(req.question, summaries)
        answer = llm.generate(_build_global_prompt(req.question, summaries))
        citations = [{"community_id": s["id"], "size": s["size"], "summary": s["summary"]} for s in summaries]
        return {"answer": answer, "citations": citations}
    except Exception:
        log.exception("query failed")
        return {"answer": "", "citations": [], "error": "Global query failed - Neo4j or the LLM may be unreachable"}
