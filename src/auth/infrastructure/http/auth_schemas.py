from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class VerifyEmailRequest(BaseModel):
    email: EmailStr
    token: str

class SendPasswordResetRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    token: str
    new_password: str

class UpdateProfilePhotoRequest(BaseModel):
    pass

class FriendResponse(BaseModel):
    user_id: str
    friendship_date: datetime

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    profile_photo_url: Optional[str] = None

class UserProfileResponse(BaseModel):
    id: str
    email: str
    name: str
    profile_photo_url: Optional[str] = None
    email_verified: bool
    friends: List[FriendResponse] = []
    created_at: datetime

class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    user: UserResponse