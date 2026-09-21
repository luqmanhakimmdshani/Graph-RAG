# IDP Platform

Production-shaped successor to FYP-1. See `PRD-IDP-Platform.md` for the full spec.

## Stack

- **Frontend**: Next.js (`frontend/`)
- **Backend**: FastAPI + SQLAlchemy + Alembic (`backend/`)
- **DB**: Postgres (schema in `backend/alembic/versions/`)
- **Vector DB**: Qdrant
- **Auth**: OIDC (Keycloak `start-dev` stub locally, realm auto-imported from `keycloak/realm-export.json`)

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

## Status: Phase 0 complete

Done:
- Repo structure, Docker Compose (API, Postgres, Qdrant, Keycloak, frontend)
- Postgres schema + initial Alembic migration for every entity in the PRD's ER diagram
- FastAPI skeleton with the route shape from the PRD's API table; document upload/get and
  audit-log listing are real, the rest (`extract`, corrections, confirm, benchmark, RAG query)
  return `501` until their phase lands
- OIDC wired end-to-end against the Keycloak stub: `GET /auth/login` → Keycloak login →
  `GET /auth/callback` creates/loads the `User` row and starts a session; role-based
  authorization (`require_role`) verified against `/audit-log` (403 for non-admins).
  Test users: `reviewer` / `reviewer123` (role `reviewer`), `admin.user` / `admin123`
  (created in Keycloak but starts as `reviewer` in the app DB until promoted — there's no
  admin UI yet, so promote by hand: `UPDATE users SET role='admin' WHERE email='admin@example.com';`
  after their first login).

Known local-dev quirk: the API container talks to Keycloak over the docker network
(`keycloak:8080`), but the browser needs `localhost:8081` — `auth.py` registers explicit
`authorize_url`/`access_token_url`/`jwks_uri`/`issuer` instead of single-URL OIDC discovery
to make both work. `host.docker.internal` was tried first and rejected: it resolves on paper
but Windows Firewall was blocking the actual connection, so it's not the fix here.

Not done yet (see PRD §12 for phasing):
- Extraction service (OCR/LLM/Hybrid), review/correction workflow, benchmark metrics, RAG —
  all Phase 1-2 work, intentionally stubbed with `501` rather than faked.
