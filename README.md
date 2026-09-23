# Graph RAG Capstone

Knowledge-graph-augmented RAG over a tech-news corpus, with a generic-RAG
baseline for side-by-side comparison. See `PRD.md` for full requirements —
all 6 phases of the roadmap (ingestion, generic RAG, Graph RAG, comparison +
explorer UI, community detection, evaluation harness) are implemented.

## Stack
- Backend: FastAPI (`backend/`)
- Frontend: React + Vite + TypeScript + Tailwind (`frontend/`)
- Graph DB: Neo4j AuraDB Free (cloud, not run locally)
- Vector store: ChromaDB (embedded, no service to run)
- LLM: Google Gemini API (free tier)
- Embeddings: `sentence-transformers`, local/CPU

## Run locally

Backend:
```
cd backend
python -m venv .venv
.venv/Scripts/activate   # or source .venv/bin/activate on macOS/Linux
pip install -r requirements.txt
cp .env.example .env     # fill in GEMINI_API_KEY, NEO4J_* credentials
uvicorn app.main:app --reload --port 8000
```

Frontend:
```
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api/*` to `http://localhost:8000`, so the
frontend never needs a hardcoded backend URL.

## Status
All 6 PRD phases are done: ingestion (chunking/embedding/extraction into
Neo4j), generic-RAG baseline, Graph RAG traversal retrieval, comparison +
graph explorer UI, community detection with global-question retrieval, and
an evaluation harness (20 benchmark questions, LLM-as-judge scoring).

A gap-analysis audit against the PRD found a number of rough edges beyond
this point (see `docs/intent/project-audit.md`) — mainly around demo-day
robustness (timeouts, error handling, ingestion progress) and a few
functional gaps (query classification, the Compare page's benchmark
dropdown) — that active development is now addressing.
