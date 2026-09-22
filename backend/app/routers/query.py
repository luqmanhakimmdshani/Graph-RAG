from pydantic import BaseModel
from fastapi import APIRouter

router = APIRouter(prefix="/query", tags=["query"])


class QueryRequest(BaseModel):
    question: str


@router.post("")
async def query_graph_rag(req: QueryRequest):
    # ponytail: stub, wire to graph retriever in Phase 3
    return {"answer": "", "citations": [], "subgraph": {"nodes": [], "edges": []}}


@router.post("/vanilla")
async def query_vanilla_rag(req: QueryRequest):
    # ponytail: stub, wire to vector retriever in Phase 1
    return {"answer": "", "citations": []}


@router.post("/compare")
async def query_compare(req: QueryRequest):
    graph = await query_graph_rag(req)
    vanilla = await query_vanilla_rag(req)
    return {"graph_rag": graph, "vanilla_rag": vanilla}
