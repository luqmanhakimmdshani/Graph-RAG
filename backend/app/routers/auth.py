import uuid

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.auth import oauth
from app.database import get_db
from app.models import User

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/login")
async def login(request: Request):
    redirect_uri = request.url_for("auth_callback")
    return await oauth.oidc.authorize_redirect(request, redirect_uri)


@router.get("/callback", name="auth_callback")
async def auth_callback(request: Request, db: Session = Depends(get_db)):
    token = await oauth.oidc.authorize_access_token(request)
    claims = token["userinfo"]

    user = db.query(User).filter_by(sso_subject_id=claims["sub"]).first()
    if not user:
        user = User(id=uuid.uuid4(), email=claims["email"], sso_subject_id=claims["sub"], role="reviewer")
        db.add(user)
        db.commit()
        db.refresh(user)

    request.session["user"] = {"id": str(user.id), "email": user.email, "role": user.role}
    return {"email": user.email, "role": user.role}
