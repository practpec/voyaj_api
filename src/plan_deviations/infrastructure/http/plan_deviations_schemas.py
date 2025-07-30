from pydantic import BaseModel
from typing import Optional

class RegisterPlanDeviationRequest(BaseModel):
    day_id: Optional[str] = None
    activity_id: Optional[str] = None
    metric: str
    planned_value: str
    actual_value: str
    notes: Optional[str] = None

class PlanDeviationResponse(BaseModel):
    id: str
    trip_id: str
    day_id: Optional[str] = None
    activity_id: Optional[str] = None
    metric: str
    planned_value: str
    actual_value: str
    notes: Optional[str] = None