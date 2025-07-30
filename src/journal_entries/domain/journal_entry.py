from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from bson import ObjectId

class Recommendation(BaseModel):
    note: str
    type: str

class JournalEntry(BaseModel):
    id: Optional[str] = None
    trip_id: str
    day_id: str
    user_id: str
    content: str
    emotions: Optional[Dict[str, Any]] = {}
    recommendations: List[Recommendation] = []
    is_deleted: bool = False
    created_at: datetime = datetime.utcnow()
    modified_at: datetime = datetime.utcnow()

    class Config:
        json_encoders = {
            ObjectId: str
        }