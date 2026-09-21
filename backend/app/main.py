from fastapi import FastAPI
from starlette.middleware.sessions import SessionMiddleware

from app.config import settings
from app.routers import audit, auth, documents, extractions, metrics

app = FastAPI(title="IDP Platform API")
app.add_middleware(SessionMiddleware, secret_key=settings.oidc_client_secret)

app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(extractions.router)
app.include_router(metrics.router)
app.include_router(audit.router)


@app.get("/health")
def health():
    return {"status": "ok"}
