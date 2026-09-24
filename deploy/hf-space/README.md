---
title: Graph RAG API
emoji: 🕸️
colorFrom: green
colorTo: gray
sdk: docker
app_port: 7860
pinned: false
short_description: Backend for the Graph RAG capstone (read-only demo)
---

# Graph RAG API

FastAPI backend for the Graph RAG capstone: knowledge-graph retrieval over 500
tech news articles (Nov 2023), compared against plain vector RAG. The web app
is served separately and calls this API through its `/api` proxy.

This deployment is **read-only**: adding articles and running new evaluations
are turned off (`READ_ONLY=true`).

## Configuration (Space secrets)

| Name | Purpose |
|---|---|
| `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`, `NEO4J_DATABASE` | Neo4j AuraDB knowledge graph |
| `OPENAI_BASE_URL` | OpenAI-compatible LLM endpoint (the OmniRoute tunnel, ending in `/v1`) |
| `OPENAI_API_KEY` | Key for that endpoint |

## Built from

`deploy/hf-space/` in the project repo, plus `backend/app`,
`backend/requirements.txt`, `backend/chroma_data` and
`backend/data/{corpus,benchmark,eval_results}.json`.
