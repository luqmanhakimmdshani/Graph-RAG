# Graph RAG Capstone

Knowledge-graph-augmented RAG over a tech-news corpus, with a generic-RAG
baseline for side-by-side comparison. See `PRD.md` for full requirements
(if present) — this repo currently implements **Phase 0: scaffolding**.

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
Phase 0 done: FastAPI and React skeletons wired together (health check
round-trips through the dev proxy). Endpoints under `backend/app/routers/`
are stubs pending Phase 1 (generic RAG) onward.
