from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel
from decimal import Decimal
from bson import ObjectId

class Split(BaseModel):
    user_id: str
    amount: Decimal

class Expense(BaseModel):
    id: Optional[str] = None
    trip_id: str
    user_id: str
    activity_id: Optional[str] = None
    amount: Decimal
    currency: str = "USD"
    category: Optional[str] = None
    description: str
    date: date
    splits: List[Split] = []
    is_deleted: bool = False

    class Config:
        json_encoders = {
            ObjectId: str,
            Decimal: float
        }