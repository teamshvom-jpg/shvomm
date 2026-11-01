from fastapi import APIRouter
from app.schemas.request import EstimateRequest, EstimateResponse
from app.services.estimator import calculate_estimate

router = APIRouter(prefix="/api/estimate", tags=["estimate"])


@router.post("", response_model=EstimateResponse)
def estimate_price(payload: EstimateRequest):
    """
    Computes rule-based indicative pricing range for a custom gift concept.
    """
    result = calculate_estimate(
        category_key=payload.category,
        packaging_key=payload.packaging or "linen_keepsake_box",
        personalization_key=payload.personalization or "custom_card",
        quantity=payload.quantity,
        budget_per_gift=payload.budget_per_gift
    )
    return EstimateResponse(**result)
