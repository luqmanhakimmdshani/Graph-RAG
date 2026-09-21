from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import require_role
from app.database import get_db
from app.models import AuditLog

router = APIRouter(tags=["audit"])


@router.get("/audit-log")
def get_audit_log(
    db: Session = Depends(get_db),
    user: dict = Depends(require_role("admin")),
):
    rows = db.scalars(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(200)).all()
    return [
        {
            "id": str(r.id),
            "actor_id": str(r.actor_id),
            "action": r.action,
            "entity_type": r.entity_type,
            "entity_id": str(r.entity_id) if r.entity_id else None,
            "created_at": r.created_at.isoformat(),
        }
        for r in rows
    ]
