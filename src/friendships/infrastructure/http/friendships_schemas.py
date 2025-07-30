from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class SendFriendRequestRequest(BaseModel):
    recipient_id: str
    message: Optional[str] = None

class RespondFriendRequestRequest(BaseModel):
    accept: bool

class FriendshipInvitationResponse(BaseModel):
    id: str
    sender_id: str
    recipient_id: str
    status: str
    message: Optional[str] = None
    sent_at: datetime
    responded_at: Optional[datetime] = None