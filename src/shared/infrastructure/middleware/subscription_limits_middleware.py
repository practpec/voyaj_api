from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Set, Optional, Dict, Any
from src.subscriptions.application.validate_feature_access import ValidateFeatureAccess
from src.shared.infrastructure.security.authentication import verify_token
from src.shared.config import settings

class SubscriptionLimitsMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self._validator: Optional[ValidateFeatureAccess] = None
        
        self.public_endpoints: Set[str] = {
            "/",
            "/health",
            "/docs",
            "/openapi.json",
            "/redoc",
            "/webhooks/stripe"
        }
        
        self.auth_endpoints: Set[str] = {
            "/auth/register",
            "/auth/login", 
            "/auth/send-verification",
            "/auth/verify-email",
            "/auth/send-password-reset",
            "/auth/reset-password"
        }
        
        self.subscription_endpoints: Set[str] = {
            "/subscriptions/checkout",
            "/subscriptions/upgrade",
            "/subscriptions/cancel",
            "/subscriptions/status",
            "/subscriptions/usage",
            "/subscriptions/reactivate",
            "/subscriptions/plans"
        }
        
        # PATRÓN CORREGIDO: Usar solo el path sin parámetros
        self.limit_controlled_endpoints = {
            "POST:/trips": {
                "feature": "create_trip",
                "limit_type": "max_trips"
            },
            "POST:/trips/{trip_id}/photos": {
                "feature": "upload_photo",
                "limit_type": "max_photos_per_trip"
            },
            "POST:/trips/{trip_id}/photos/upload": {
                "feature": "upload_photo",
                "limit_type": "max_photos_per_trip"
            },
            "POST:/trips/{trip_id}/invite": {
                "feature": "collaborative_trips",
                "limit_type": "collaborative_trips"
            },
            "GET:/trips/{trip_id}/export": {
                "feature": "export_data",
                "limit_type": "premium_export"
            },
            "GET:/trips/{trip_id}/analytics": {
                "feature": "advanced_analytics",
                "limit_type": "advanced_analytics"
            }
        }

    @property
    def validator(self) -> ValidateFeatureAccess:
        if self._validator is None:
            self._validator = ValidateFeatureAccess()
        return self._validator

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        method = request.method
        endpoint_key = f"{method}:{path}"
        
        # VALIDACIÓN TEMPRANA PARA ENDPOINTS EXACTOS
        if path in self.public_endpoints or path in self.auth_endpoints or path in self.subscription_endpoints:
            return await call_next(request)
        
        # VERIFICAR PATHS QUE EMPIEZAN CON /auth/
        if path.startswith("/auth/"):
            return await call_next(request)
            
        # VALIDACIÓN ESPECÍFICA PARA ENDPOINTS CONTROLADOS
        needs_validation = False
        endpoint_config = None
        
        # Verificar endpoint exacto primero
        if endpoint_key in self.limit_controlled_endpoints:
            needs_validation = True
            endpoint_config = self.limit_controlled_endpoints[endpoint_key]
        else:
            # Verificar patrones con parámetros
            for pattern, config in self.limit_controlled_endpoints.items():
                if self._matches_pattern(pattern, endpoint_key):
                    needs_validation = True
                    endpoint_config = config
                    break
        
        if needs_validation and endpoint_config:
            user_id = await self._extract_user_id(request)
            if not user_id:
                return JSONResponse(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    content={"detail": "Authentication required"}
                )
            
            validation_result = await self._validate_endpoint_access(
                endpoint_config, path, user_id, request
            )
            
            if not validation_result["allowed"]:
                return JSONResponse(
                    status_code=validation_result["status_code"],
                    content=validation_result["response"]
                )
        
        return await call_next(request)

    def _matches_pattern(self, pattern: str, endpoint_key: str) -> bool:
        pattern_parts = pattern.split(":")
        endpoint_parts = endpoint_key.split(":")
        
        if len(pattern_parts) != 2 or len(endpoint_parts) != 2:
            return False
            
        if pattern_parts[0] != endpoint_parts[0]:  # Método debe coincidir exactamente
            return False
            
        pattern_path = pattern_parts[1]
        endpoint_path = endpoint_parts[1]
        
        if "{" not in pattern_path:
            return pattern_path == endpoint_path
            
        pattern_segments = pattern_path.split("/")
        endpoint_segments = endpoint_path.split("/")
        
        if len(pattern_segments) != len(endpoint_segments):
            return False
            
        for pattern_seg, endpoint_seg in zip(pattern_segments, endpoint_segments):
            if pattern_seg.startswith("{") and pattern_seg.endswith("}"):
                continue  # Parámetro, acepta cualquier valor
            if pattern_seg != endpoint_seg:
                return False
                
        return True

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

    async def _validate_endpoint_access(
        self, 
        endpoint_config: Dict[str, str], 
        path: str, 
        user_id: str, 
        request: Request,
    ) -> Dict[str, Any]:
        feature = endpoint_config["feature"]
        
        try:
            if feature == "create_trip":
                result = await self.validator.can_create_trip(user_id)
                
            elif feature == "upload_photo":
                trip_id = self._extract_trip_id(path)
                if not trip_id:
                    return {"allowed": True}
                result = await self.validator.can_upload_photo(user_id, trip_id)
                
            elif feature == "collaborative_trips":
                result = await self.validator.can_invite_members(user_id)
                
            elif feature == "export_data":
                result = await self.validator.can_export_data(user_id)
                
            elif feature == "advanced_analytics":
                result = await self.validator.can_access_analytics(user_id)
                
            else:
                return {"allowed": True}
            
            if result.allowed:
                return {"allowed": True}
            else:
                return self._create_limit_response(result, feature)
                
        except Exception as e:
            from datetime import datetime
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{timestamp}] [LIMITS_MIDDLEWARE] [ERROR] Validation failed: {str(e)}")
            return {"allowed": True}  # En caso de error, permitir la request

    def _extract_trip_id(self, path: str) -> Optional[str]:
        try:
            segments = path.split("/")
            trips_index = segments.index("trips")
            if trips_index + 1 < len(segments):
                return segments[trips_index + 1]
        except (ValueError, IndexError):
            pass
        return None

    def _create_limit_response(self, result, feature: str) -> Dict[str, Any]:
        if result.upgrade_required:
            status_code = status.HTTP_402_PAYMENT_REQUIRED
            response_data = {
                "detail": "Upgrade required",
                "message": result.message,
                "limit_info": {
                    "limit_type": result.limit_type,
                    "current_usage": result.current_usage,
                    "max_allowed": result.max_allowed,
                    "upgrade_required": True
                },
                "upgrade_options": self._get_upgrade_options(feature)
            }
        else:
            status_code = status.HTTP_403_FORBIDDEN
            response_data = {
                "detail": "Feature not available",
                "message": result.message,
                "feature_locked": True,
                "upgrade_options": self._get_upgrade_options(feature)
            }
            
        return {
            "allowed": False,
            "status_code": status_code,
            "response": response_data
        }

    def _get_upgrade_options(self, feature: str) -> Dict[str, Any]:
        feature_plans = {
            "create_trip": ["aventurero", "nomada_digital"],
            "upload_photo": ["aventurero", "nomada_digital"],
            "collaborative_trips": ["aventurero", "nomada_digital"],
            "export_data": ["aventurero", "nomada_digital"],
            "advanced_analytics": ["aventurero", "nomada_digital"]
        }
        
        recommended_plans = feature_plans.get(feature, ["aventurero"])
        
        return {
            "recommended_plan": recommended_plans[0],
            "available_plans": recommended_plans,
            "upgrade_url": "/subscriptions/checkout"
        }