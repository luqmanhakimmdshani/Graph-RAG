# IDP Platform

Production-shaped successor to FYP-1. See `PRD-IDP-Platform.md` for the full spec.

## Stack

- **Frontend**: Next.js (`frontend/`)
- **Backend**: FastAPI + SQLAlchemy + Alembic (`backend/`)
- **DB**: Postgres (schema in `backend/alembic/versions/`)
- **Vector DB**: Qdrant
- **Auth**: OIDC (Keycloak `start-dev` stub locally)

## Run it

```
docker compose up --build
```

- API: http://localhost:8000 (docs at `/docs`, health at `/health`)
- Frontend: http://localhost:3000
- Postgres: localhost:5433 (mapped off 5432 to avoid local collisions)
- Qdrant: http://localhost:6333
- Keycloak admin: http://localhost:8081 (`admin` / `admin`)

## Backend dev (outside Docker)

```
cd backend
python -m venv .venv
.venv/Scripts/activate
pip install -r requirements.txt
cp .env.example .env   # then point DATABASE_URL at localhost:5433
alembic upgrade head
uvicorn app.main:app --reload
```

## Status: Phase 0 (scaffolding)

Done:
- Repo structure, Docker Compose (API, Postgres, Qdrant, Keycloak, frontend)
- Postgres schema + initial Alembic migration for every entity in the PRD's ER diagram
- FastAPI skeleton with the route shape from the PRD's API table; document upload/get and
  audit-log listing are real, the rest (`extract`, corrections, confirm, benchmark, RAG query)
  return `501` until their phase lands

Not done yet (see PRD §12 for phasing):
- Keycloak realm/client is not pre-configured — `start-dev` runs but no `idp` realm exists yet.
  Create it in the admin console (or script it) before wiring real login.
- Extraction service (OCR/LLM/Hybrid), review/correction workflow, benchmark metrics, RAG —
  all Phase 1-2 work, intentionally stubbed with `501` rather than faked.
