from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from bson import ObjectId

class Photo(BaseModel):
    id: Optional[str] = None
    trip_id: str
    user_id: str
    file_url: str
    taken_at: Optional[datetime] = None
    location: Optional[str] = None
    associated_day_id: Optional[str] = None
    associated_journal_entry_id: Optional[str] = None
    is_deleted: bool = False

    class Config:
        json_encoders = {
            ObjectId: str
        }