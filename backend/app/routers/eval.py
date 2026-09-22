from fastapi import APIRouter

router = APIRouter(prefix="/eval", tags=["eval"])


@router.post("/run")
async def run_eval():
    # ponytail: stub, wire to benchmark harness in Phase 6
    return {"status": "not_implemented"}


@router.get("/results")
async def eval_results():
    return {"results": []}
