import uuid

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/extractions", tags=["extractions"])

# Field correction / confirm-as-ground-truth workflow -- Phase 2 (human-in-the-loop
# review) per the PRD milestones. Stubbed now so the route shape is fixed early.


@router.patch("/{run_id}/fields/{field_id}")
def correct_field(run_id: uuid.UUID, field_id: uuid.UUID):
    raise HTTPException(status_code=501, detail="Not implemented yet (Phase 2)")


@router.post("/{run_id}/confirm")
def confirm_extraction(run_id: uuid.UUID):
    raise HTTPException(status_code=501, detail="Not implemented yet (Phase 2)")
