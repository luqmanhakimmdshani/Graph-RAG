from pydantic import BaseModel
from fastapi import APIRouter

from app.services import embeddings, llm, vectorstore

router = APIRouter(prefix="/query", tags=["query"])


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
        "contain the answer, say so. Cite sources inline using [1], [2], etc.\n\n"
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


@router.post("")
async def query_graph_rag(req: QueryRequest):
    # ponytail: stub, wire to graph retriever in Phase 3
    return {"answer": "", "citations": [], "subgraph": {"nodes": [], "edges": []}}


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
