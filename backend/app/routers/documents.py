import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.config import settings
from app.database import get_db
from app.models import Document

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("")
def upload_document(
    file: UploadFile,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    storage_dir = Path(settings.storage_dir)
    storage_dir.mkdir(parents=True, exist_ok=True)
    server_name = f"{uuid.uuid4()}{Path(file.filename or '').suffix}"
    dest = storage_dir / server_name
    dest.write_bytes(file.file.read())

    doc = Document(
        file_name=file.filename or server_name,
        storage_path=str(dest),
        uploaded_by=uuid.UUID(user["id"]),
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return {"id": str(doc.id), "status": doc.status}


@router.get("/{document_id}")
def get_document(document_id: uuid.UUID, db: Session = Depends(get_db)):
    doc = db.get(Document, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return {
        "id": str(doc.id),
        "file_name": doc.file_name,
        "document_type": doc.document_type,
        "status": doc.status,
        "uploaded_at": doc.uploaded_at.isoformat(),
    }


@router.post("/{document_id}/extract")
def run_extraction(document_id: uuid.UUID):
    # Dispatches to the OCR/LLM/Hybrid extraction service (app/services).
    # Not yet implemented -- Phase 1 of the PRD milestones.
    raise HTTPException(status_code=501, detail="Extraction service not implemented yet (Phase 1)")


@router.get("/{document_id}/extractions")
def list_extractions(document_id: uuid.UUID):
    raise HTTPException(status_code=501, detail="Not implemented yet (Phase 1)")


@router.post("/{document_id}/rag/query")
def rag_query(document_id: uuid.UUID):
    raise HTTPException(status_code=501, detail="RAG service not implemented yet (Phase 1)")
