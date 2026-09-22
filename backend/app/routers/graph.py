from fastapi import APIRouter

from app.services import graphdb

router = APIRouter(prefix="/graph", tags=["graph"])


@router.get("/stats")
async def graph_stats():
    try:
        return graphdb.stats()
    except Exception:
        return {"entities": None, "relationships": None, "communities": None, "error": "Neo4j not reachable"}


@router.get("/subgraph")
async def subgraph(entity: str, hops: int = 2):
    try:
        return graphdb.subgraph(entity, hops)
    except Exception:
        return {"entity": entity, "nodes": [], "edges": [], "error": "Neo4j not reachable"}
