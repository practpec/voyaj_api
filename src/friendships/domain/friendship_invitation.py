from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from bson import ObjectId

class FriendshipInvitation(BaseModel):
    id: Optional[str] = None
    sender_id: str
    recipient_id: str
    status: str = "pending"
    message: Optional[str] = None
    sent_at: datetime = datetime.utcnow()
    responded_at: Optional[datetime] = None

    class Config:
        json_encoders = {
            ObjectId: str
        }