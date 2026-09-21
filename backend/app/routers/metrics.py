from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/metrics", tags=["metrics"])


@router.get("/benchmark")
def benchmark():
    # Precision/recall/F1/cost/time comparison across approaches -- Phase 2.
    raise HTTPException(status_code=501, detail="Not implemented yet (Phase 2)")
