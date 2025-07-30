from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List
from src.auth.infrastructure.http.auth_schemas import (
    RegisterRequest, LoginRequest, LoginResponse, UserResponse, 
    UserProfileResponse, VerifyEmailRequest, SendPasswordResetRequest, 
    ResetPasswordRequest
)
from src.auth.application.register_user import RegisterUser
from src.auth.application.login_user import LoginUser
from src.auth.application.search_users import SearchUsers
from src.auth.application.get_user_profile import GetUserProfile
from src.auth.application.send_verification_email import SendVerificationEmail
from src.auth.application.verify_email import VerifyEmail
from src.auth.application.send_password_reset_email import SendPasswordResetEmail
from src.auth.application.reset_password import ResetPassword
from src.shared.infrastructure.security.authentication import get_current_user_id

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=LoginResponse)
async def register(request: RegisterRequest):
    try:
        register_user = RegisterUser()
        user = await register_user.execute(
            email=request.email,
            password=request.password,
            name=request.name
        )
        
        send_verification_uc = SendVerificationEmail()
        await send_verification_uc.execute(user.email)
        
        login_user = LoginUser()
        return await login_user.execute(request.email, request.password)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    try:
        login_user = LoginUser()
        return await login_user.execute(request.email, request.password)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))

@router.get("/search", response_model=List[UserResponse])
async def search_users(q: str = Query(..., min_length=2), user_id: str = Depends(get_current_user_id)):
    try:
        search_users_uc = SearchUsers()
        users = await search_users_uc.execute(q, user_id)
        return [UserResponse(**user.dict()) for user in users]
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/profile", response_model=UserProfileResponse)
async def get_profile(user_id: str = Depends(get_current_user_id)):
    try:
        get_profile_uc = GetUserProfile()
        user = await get_profile_uc.execute(user_id)
        return UserProfileResponse(**user.dict())
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.post("/send-verification", status_code=status.HTTP_200_OK)
async def send_verification_email(user_id: str = Depends(get_current_user_id)):
    try:
        get_profile_uc = GetUserProfile()
        user = await get_profile_uc.execute(user_id)
        
        send_verification_uc = SendVerificationEmail()
        await send_verification_uc.execute(user.email)
        return {"message": "Verification email sent"}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/verify-email", status_code=status.HTTP_200_OK)
async def verify_email(request: VerifyEmailRequest):
    try:
        verify_email_uc = VerifyEmail()
        await verify_email_uc.execute(request.email, request.token)
        return {"message": "Email verified successfully"}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/send-password-reset", status_code=status.HTTP_200_OK)
async def send_password_reset(request: SendPasswordResetRequest):
    try:
        send_reset_uc = SendPasswordResetEmail()
        await send_reset_uc.execute(request.email)
        return {"message": "Password reset email sent"}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/reset-password", status_code=status.HTTP_200_OK)
async def reset_password(request: ResetPasswordRequest):
    try:
        reset_password_uc = ResetPassword()
        await reset_password_uc.execute(request.email, request.token, request.new_password)
        return {"message": "Password reset successfully"}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))