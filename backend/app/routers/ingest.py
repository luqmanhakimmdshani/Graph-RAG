from fastapi import APIRouter, UploadFile

router = APIRouter(prefix="/ingest", tags=["ingest"])


@router.post("")
async def ingest_documents(files: list[UploadFile]):
    # ponytail: stub, wire to chunker/extractor pipeline in Phase 1-2
    return {"accepted": [f.filename for f in files], "status": "queued"}


@router.get("/status")
async def ingest_status():
    return {"documents": []}
