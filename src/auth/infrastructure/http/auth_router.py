from fastapi import APIRouter, HTTPException, status
from src.auth.infrastructure.http.auth_schemas import RegisterRequest, LoginRequest, LoginResponse
from src.auth.application.register_user import RegisterUser
from src.auth.application.login_user import LoginUser

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