from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel
from decimal import Decimal
from bson import ObjectId

class Activity(BaseModel):
    id: str = str(ObjectId())
    title: str
    description: Optional[str] = None
    location: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    estimated_cost: Optional[Decimal] = None
    order: int = 0

class Day(BaseModel):
    id: str = str(ObjectId())
    date: date
    notes: Optional[str] = None
    activities: List[Activity] = []

class Member(BaseModel):
    user_id: str
    role: str
    private_notes: Optional[str] = None

class Trip(BaseModel):
    id: Optional[str] = None
    title: str
    start_date: date
    end_date: date
    created_by: str
    cover_image_url: Optional[str] = None
    is_public: bool = False
    base_currency: str = "USD"
    estimated_total_budget: Optional[Decimal] = None
    members: List[Member] = []
    days: List[Day] = []
    is_deleted: bool = False
    created_at: datetime = datetime.utcnow()

    class Config:
        json_encoders = {
            ObjectId: str,
            Decimal: float
        }