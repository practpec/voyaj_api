from typing import Optional
from pydantic import BaseModel
from bson import ObjectId

class PlanDeviation(BaseModel):
    id: Optional[str] = None
    trip_id: str
    day_id: Optional[str] = None
    activity_id: Optional[str] = None
    metric: str
    planned_value: str
    actual_value: str
    notes: Optional[str] = None
    is_deleted: bool = False

    class Config:
        json_encoders = {
            ObjectId: str
        }