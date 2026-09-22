import json
from functools import lru_cache
from pathlib import Path

from pydantic import BaseModel
from fastapi import APIRouter

from app.services import embeddings, graphdb, llm, vectorstore

router = APIRouter(prefix="/query", tags=["query"])
DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"


class QueryRequest(BaseModel):
    question: str
    top_k: int = 5


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


def _graph_facts(nodes_by_id: dict[str, dict], edges: list[dict]) -> list[str]:
    facts = []
    for e in edges[:MAX_FACTS]:
        src = nodes_by_id.get(e["source"], {}).get("name", "?")
        tgt = nodes_by_id.get(e["target"], {}).get("name", "?")
        rel = e["type"].replace("_", " ").lower()
        facts.append(f"[{len(facts)+1}] {src} {rel} {tgt} (source: {e.get('source_article') or 'unknown'})")
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


def _build_graph_prompt(question: str, facts: list[str]) -> str:
    context = "\n".join(facts)
    return (
        "Answer the question using ONLY the graph facts below. Each fact is a "
        "relationship extracted from a news article. If the facts don't contain "
        "the answer, say so. Cite facts inline using [1], [2], etc. "
        "Respond in plain text (no markdown formatting).\n\n"
        f"Facts:\n{context}\n\nQuestion: {question}\n\nAnswer:"
    )


@router.post("")
async def query_graph_rag(req: QueryRequest):
    entities = graphdb.find_entities(req.question)
    if not entities:
        return {"answer": "No known entities from the graph were found in the question.",
                 "citations": [], "subgraph": {"nodes": [], "edges": []}}

    data = graphdb.query_subgraph(entities)
    nodes_by_id = {n["id"]: n for n in data["nodes"]}
    facts = _graph_facts(nodes_by_id, data["edges"])
    subgraph = {"nodes": data["nodes"], "edges": data["edges"]}
    if not facts:
        return {"answer": "No relationships found connecting these entities.", "citations": [], "subgraph": subgraph}

    answer = llm.generate(_build_graph_prompt(req.question, facts))
    return {"answer": answer, "citations": _graph_citations(data["edges"]), "subgraph": subgraph}


@router.post("/vanilla")
async def query_vanilla_rag(req: QueryRequest):
    query_vector = embeddings.embed([req.question])[0]
    chunks = vectorstore.query(query_vector, top_k=req.top_k)
    if not chunks:
        return {"answer": "No documents have been ingested yet.", "citations": []}
    answer = llm.generate(_build_prompt(req.question, chunks))
    return {"answer": answer, "citations": _citations(chunks)}


@router.post("/compare")
async def query_compare(req: QueryRequest):
    graph = await query_graph_rag(req)
    vanilla = await query_vanilla_rag(req)
    return {"graph_rag": graph, "vanilla_rag": vanilla}


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
    summaries = graphdb.community_summaries()
    if not summaries:
        return {"answer": "No community summaries available yet - run scripts/detect_communities.py first.",
                 "citations": []}

    answer = llm.generate(_build_global_prompt(req.question, summaries))
    citations = [{"community_id": s["id"], "size": s["size"], "summary": s["summary"]} for s in summaries]
    return {"answer": answer, "citations": citations}
