from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class UploadPhotoRequest(BaseModel):
    file_url: str
    taken_at: Optional[datetime] = None
    location: Optional[str] = None
    associated_day_id: Optional[str] = None
    associated_journal_entry_id: Optional[str] = None

class PhotoResponse(BaseModel):
    id: str
    trip_id: str
    user_id: str
    file_url: str
    taken_at: Optional[datetime] = None
    location: Optional[str] = None
    associated_day_id: Optional[str] = None
    associated_journal_entry_id: Optional[str] = None