from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr
from bson import ObjectId

class Friend(BaseModel):
    user_id: str
    friendship_date: datetime

class User(BaseModel):
    id: Optional[str] = None
    email: EmailStr
    password: str
    name: str
    profile_photo_url: Optional[str] = None
    last_login_at: Optional[datetime] = None
    email_verified: bool = False
    friends: List[Friend] = []
    is_deleted: bool = False
    created_at: datetime = datetime.utcnow()

    class Config:
        json_encoders = {
            ObjectId: str
        }