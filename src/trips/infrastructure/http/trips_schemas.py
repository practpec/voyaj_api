from pydantic import BaseModel
from datetime import date
from decimal import Decimal
from typing import Optional, List

class CreateTripRequest(BaseModel):
    title: str
    start_date: date
    end_date: date
    base_currency: str = "USD"
    estimated_total_budget: Optional[Decimal] = None
    is_public: bool = False

class UpdateTripRequest(BaseModel):
    title: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    base_currency: Optional[str] = None
    estimated_total_budget: Optional[Decimal] = None
    is_public: Optional[bool] = None
    cover_image_url: Optional[str] = None

class CreateActivityRequest(BaseModel):
    title: str
    description: Optional[str] = None
    location: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    estimated_cost: Optional[Decimal] = None
    order: int = 0

class UpdateActivityRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    estimated_cost: Optional[Decimal] = None
    order: Optional[int] = None

class InviteMemberRequest(BaseModel):
    invited_user_id: str
    role: str = "viewer"

class RespondInvitationRequest(BaseModel):
    accept: bool

class ActivityResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    location: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    estimated_cost: Optional[Decimal] = None
    order: int

class DayResponse(BaseModel):
    id: str
    date: date
    notes: Optional[str] = None
    activities: List[ActivityResponse] = []

class MemberResponse(BaseModel):
    user_id: str
    role: str
    private_notes: Optional[str] = None

class TripResponse(BaseModel):
    id: str
    title: str
    start_date: date
    end_date: date
    created_by: str
    cover_image_url: Optional[str] = None
    is_public: bool
    base_currency: str
    estimated_total_budget: Optional[Decimal] = None
    members: List[MemberResponse] = []
    days: List[DayResponse] = []