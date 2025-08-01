from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Set, Optional
from src.subscriptions.application.subscription_service import SubscriptionService
from src.shared.infrastructure.security.authentication import verify_token
from src.shared.config import settings

class SubscriptionMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self._subscription_service: Optional[SubscriptionService] = None
        
        # Endpoints que no requieren validación
        self.public_endpoints: Set[str] = {
            "/",
            "/health",
            "/docs",
            "/openapi.json",
            "/redoc",
            "/subscriptions/webhook"
        }
        
        # Endpoints de autenticación
        self.auth_endpoints: Set[str] = {
            "/auth/register",
            "/auth/login", 
            "/auth/send-verification",
            "/auth/verify-email",
            "/auth/send-password-reset",
            "/auth/reset-password",
            "/auth/profile"
        }
        
        # Endpoints de suscripción (siempre permitidos)
        self.subscription_endpoints: Set[str] = {
            "/subscriptions/status",
            "/subscriptions/create-payment",
            "/subscriptions/cancel"
        }
        
        # Endpoints que requieren PRO
        self.pro_required_endpoints = {
            "POST:/trips": "Crear más de 1 viaje requiere plan PRO"
        }

    @property
    def subscription_service(self) -> SubscriptionService:
        if self._subscription_service is None:
            self._subscription_service = SubscriptionService()
        return self._subscription_service

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        method = request.method
        endpoint_key = f"{method}:{path}"
        
        # Permitir endpoints públicos y de auth
        if (path in self.public_endpoints or 
            path in self.auth_endpoints or 
            path in self.subscription_endpoints or
            path.startswith("/auth/")):
            return await call_next(request)
        
        # Verificar si necesita validación PRO
        needs_pro = False
        pro_message = ""
        
        if endpoint_key in self.pro_required_endpoints:
            needs_pro = True
            pro_message = self.pro_required_endpoints[endpoint_key]
        elif endpoint_key == "POST:/trips":
            # Verificar si ya tiene 1 viaje (límite FREE)
            user_id = await self._extract_user_id(request)
            if user_id:
                trip_count = await self._count_user_trips(user_id)
                if trip_count >= 1:
                    needs_pro = True
                    pro_message = "Plan FREE permite solo 1 viaje. Actualiza a PRO para viajes ilimitados."
        
        if needs_pro:
            user_id = await self._extract_user_id(request)
            if not user_id:
                return JSONResponse(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    content={"detail": "Authentication required"}
                )
            
            try:
                subscription_status = await self.subscription_service.get_subscription_status(user_id)
                if not subscription_status["is_pro"]:
                    return JSONResponse(
                        status_code=status.HTTP_402_PAYMENT_REQUIRED,
                        content={
                            "detail": "PRO subscription required",
                            "message": pro_message,
                            "current_plan": subscription_status["plan"],
                            "upgrade_required": True
                        }
                    )
            except Exception:
                # En caso de error, permitir la request
                pass
        
        return await call_next(request)

    async def _extract_user_id(self, request: Request) -> Optional[str]:
        try:
            auth_header = request.headers.get("Authorization")
            if not auth_header or not auth_header.startswith("Bearer "):
                return None
                
            token = auth_header.split(" ")[1]
            payload = verify_token(token, settings.jwt_secret_key)
            
            if not payload or payload.get("type") != "access":
                return None
                
            return payload.get("sub")
        except Exception:
            return None

    async def _count_user_trips(self, user_id: str) -> int:
        try:
            from src.trips.infrastructure.persistence.mongo_trip_repository import MongoTripRepository
            trip_repository = MongoTripRepository()
            trips = await trip_repository.find_by_user_id(user_id)
            return len([trip for trip in trips if not trip.is_deleted])
        except Exception:
            return 0