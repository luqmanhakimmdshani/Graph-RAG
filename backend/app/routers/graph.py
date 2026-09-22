from fastapi import APIRouter

router = APIRouter(prefix="/graph", tags=["graph"])


@router.get("/stats")
async def graph_stats():
    # ponytail: stub, wire to Neo4j in Phase 2
    return {"entities": 0, "relationships": 0, "communities": 0}


@router.get("/subgraph")
async def subgraph(entity: str):
    return {"entity": entity, "nodes": [], "edges": []}
