from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Dict, Any

class RecommendationRequest(BaseModel):
    note: str
    type: str

class CreateJournalEntryRequest(BaseModel):
    day_id: str
    content: str
    emotions: Optional[Dict[str, Any]] = None
    recommendations: Optional[List[RecommendationRequest]] = None

class RecommendationResponse(BaseModel):
    note: str
    type: str

class JournalEntryResponse(BaseModel):
    id: str
    trip_id: str
    day_id: str
    user_id: str
    content: str
    emotions: Dict[str, Any] = {}
    recommendations: List[RecommendationResponse] = []
    created_at: datetime
    modified_at: datetime