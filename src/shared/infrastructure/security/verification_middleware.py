from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Set, Optional
from src.auth.infrastructure.persistence.mongo_user_repository import MongoUserRepository
from src.shared.infrastructure.security.authentication import verify_token
from src.shared.config import settings

class EmailVerificationMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self._user_repository: Optional[MongoUserRepository] = None
        
        self.public_endpoints: Set[str] = {
            "/",
            "/health",
            "/docs",
            "/openapi.json",
            "/redoc"
        }
        
        self.auth_no_verification: Set[str] = {
            "/auth/register",
            "/auth/login", 
            "/auth/send-verification",
            "/auth/verify-email",
            "/auth/send-password-reset",
            "/auth/reset-password",
            "/auth/profile"
        }
        
        self.protected_prefixes = [
            "/trips",
            "/friendships", 
            "/auth/upload-profile-photo",
            "/auth/search"
        ]

    @property
    def user_repository(self) -> MongoUserRepository:
        if self._user_repository is None:
            self._user_repository = MongoUserRepository()
        return self._user_repository

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        method = request.method
        
        # Permitir rutas públicas
        if path in self.public_endpoints:
            return await call_next(request)
            
        # Permitir rutas auth sin verificación
        if path in self.auth_no_verification:
            return await call_next(request)
            
        # Verificar si requiere email verificado
        needs_verification = any(
            path.startswith(prefix) for prefix in self.protected_prefixes
        )
        
        if needs_verification:
            # Extraer token del header Authorization
            auth_header = request.headers.get("Authorization")
            if not auth_header or not auth_header.startswith("Bearer "):
                return JSONResponse(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    content={"detail": "Requiere Autorización"}
                )
                
            token = auth_header.split(" ")[1]
            payload = verify_token(token, settings.jwt_secret_key)
            
            if not payload or payload.get("type") != "access":
                return JSONResponse(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    content={"detail": "Token Invalido"}
                )
                
            user_id = payload.get("sub")
            if not user_id:
                return JSONResponse(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    content={"detail": "Token Invalido"}
                )
                
            # Verificar email verificado
            try:
                user = await self.user_repository.find_by_id(user_id)
                if not user:
                    return JSONResponse(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        content={"detail": "User not found"}
                    )
                    
                if not user.email_verified:
                    return JSONResponse(
                        status_code=status.HTTP_403_FORBIDDEN,
                        content={
                            "detail": "Requiere Verificación de Email",
                            "message": "Porfavor verifique su Email para poder seguir disfrutando",
                            "verification_required": True
                        }
                    )
            except Exception as e:
                return JSONResponse(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    content={"detail": "El checkout de la verificación a fallado"}
                )
        
        return await call_next(request)