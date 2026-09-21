"""OIDC auth. Phase 0: validates a bearer token against the IdP's JWKS via authlib
and upserts the local User row from the token claims. Login/callback flow
(authorization code exchange) is wired in Phase 2 alongside the real frontend
session handling -- see PRD Risks (SSO/OIDC) and Phase 0 milestone.
"""
from authlib.integrations.starlette_client import OAuth
from fastapi import Depends, HTTPException, Request

from app.config import settings

oauth = OAuth()
oauth.register(
    name="oidc",
    server_metadata_url=f"{settings.oidc_issuer}/.well-known/openid-configuration",
    client_id=settings.oidc_client_id,
    client_secret=settings.oidc_client_secret,
    client_kwargs={"scope": "openid email profile"},
)


def get_current_user(request: Request) -> dict:
    user = request.session.get("user")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


def require_role(*roles: str):
    def checker(user: dict = Depends(get_current_user)) -> dict:
        if user.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Forbidden")
        return user

    return checker
