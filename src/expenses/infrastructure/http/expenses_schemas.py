from pydantic import BaseModel
from datetime import date
from decimal import Decimal
from typing import Optional, List

class SplitRequest(BaseModel):
    user_id: str
    amount: Decimal

class RegisterExpenseRequest(BaseModel):
    amount: Decimal
    description: str
    date: date
    currency: str = "USD"
    category: Optional[str] = None
    activity_id: Optional[str] = None
    splits: Optional[List[SplitRequest]] = None

class UpdateExpenseRequest(BaseModel):
   amount: Optional[Decimal] = None
   description: Optional[str] = None
   date: Optional[date] = None
   currency: Optional[str] = None
   category: Optional[str] = None
   activity_id: Optional[str] = None
   splits: Optional[List[SplitRequest]] = None

class SplitResponse(BaseModel):
    user_id: str
    amount: Decimal

class ExpenseResponse(BaseModel):
    id: str
    trip_id: str
    user_id: str
    activity_id: Optional[str] = None
    amount: Decimal
    currency: str
    category: Optional[str] = None
    description: str
    date: date
    splits: List[SplitResponse] = []