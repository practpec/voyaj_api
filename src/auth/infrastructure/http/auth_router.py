from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List
from src.auth.infrastructure.http.auth_schemas import RegisterRequest, LoginRequest, LoginResponse, UserResponse, UserProfileResponse
from src.auth.application.register_user import RegisterUser
from src.auth.application.login_user import LoginUser
from src.auth.application.search_users import SearchUsers
from src.auth.application.get_user_profile import GetUserProfile
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