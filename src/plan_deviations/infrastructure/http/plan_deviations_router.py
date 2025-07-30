from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from src.plan_deviations.infrastructure.http.plan_deviations_schemas import RegisterPlanDeviationRequest, PlanDeviationResponse
from src.plan_deviations.application.register_plan_deviation import RegisterPlanDeviation
from src.plan_deviations.application.list_trip_deviations import ListTripDeviations
from src.shared.infrastructure.security.authentication import get_current_user_id

router = APIRouter(prefix="/trips/{trip_id}/plan-deviations", tags=["plan-deviations"])

@router.post("/", response_model=PlanDeviationResponse)
async def register_plan_deviation(trip_id: str, request: RegisterPlanDeviationRequest, user_id: str = Depends(get_current_user_id)):
    try:
        register_deviation_uc = RegisterPlanDeviation()
        deviation = await register_deviation_uc.execute(
            trip_id=trip_id,
            day_id=request.day_id,
            activity_id=request.activity_id,
            metric=request.metric,
            planned_value=request.planned_value,
            actual_value=request.actual_value,
            notes=request.notes
        )
        return PlanDeviationResponse(**deviation.dict())
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/", response_model=List[PlanDeviationResponse])
async def list_trip_deviations(trip_id: str, user_id: str = Depends(get_current_user_id)):
    try:
        list_deviations = ListTripDeviations()
        deviations = await list_deviations.execute(trip_id)
        return [PlanDeviationResponse(**deviation.dict()) for deviation in deviations]
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))