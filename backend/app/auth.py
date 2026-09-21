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
    client_id=settings.oidc_client_id,
    client_secret=settings.oidc_client_secret,
    # Explicit endpoints instead of server_metadata_url: the browser-facing
    # authorize redirect and the API's own token/jwks/userinfo calls need
    # different hostnames (public vs. docker-internal), which single-URL
    # discovery can't express. `issuer` drives `iss` claim validation.
    authorize_url=f"{settings.oidc_public_base}/protocol/openid-connect/auth",
    access_token_url=f"{settings.oidc_internal_base}/protocol/openid-connect/token",
    userinfo_endpoint=f"{settings.oidc_internal_base}/protocol/openid-connect/userinfo",
    jwks_uri=f"{settings.oidc_internal_base}/protocol/openid-connect/certs",
    issuer=settings.oidc_issuer,
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
