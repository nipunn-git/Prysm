from fastapi import APIRouter
import schemas
from services.openai_service import optimize_prompt

router = APIRouter(prefix="/api/optimize", tags=["optimizer"])

@router.post("", response_model=schemas.OptimizationResponse)
def optimize_prompt_endpoint(payload: schemas.OptimizationRequest):
    result = optimize_prompt(payload.prompt, payload.instructions or "")
    return schemas.OptimizationResponse(
        improved_prompt=result["improved_prompt"],
        changes=result["changes"]
    )
