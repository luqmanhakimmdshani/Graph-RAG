from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import eval, graph, ingest, query, stats

app = FastAPI(title="Graph RAG Capstone API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest.router)
app.include_router(graph.router)
app.include_router(query.router)
app.include_router(eval.router)
app.include_router(stats.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
