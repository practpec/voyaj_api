import mercadopago
from datetime import datetime
from typing import Dict, Any, Optional
from src.shared.config import settings

class MercadoPagoService:
    def __init__(self):
        if not settings.mercadopago_access_token:
            raise ValueError("MercadoPago access token not configured")
        self.sdk = mercadopago.SDK(settings.mercadopago_access_token)

    async def create_payment_preference(
        self, 
        user_id: str, 
        user_email: str,
        success_url: str = None,
        failure_url: str = None
    ) -> Dict[str, Any]:
        # Asegurar que las URLs estén definidas y sean válidas
        success_redirect = success_url or settings.frontend_success_url
        failure_redirect = failure_url or settings.frontend_cancel_url
        
        # Validar URLs
        if not success_redirect or not success_redirect.startswith('http'):
            success_redirect = "https://www.google.com/success"
        if not failure_redirect or not failure_redirect.startswith('http'):
            failure_redirect = "https://www.google.com/cancel"
        
        preference_data = {
            "items": [
                {
                    "id": "voyaj_pro_monthly",
                    "title": "Voyaj PRO - Suscripción Mensual",
                    "quantity": 1,
                    "unit_price": float(settings.price_pro_monthly),
                    "currency_id": "MXN"
                }
            ],
            "payer": {
                "email": user_email
            },
            "external_reference": f"voyaj_pro_{user_id}_{int(datetime.utcnow().timestamp())}",
            "back_urls": {
                "success": success_redirect,
                "failure": failure_redirect,
                "pending": success_redirect
            },
            "auto_return": "approved",
            "notification_url": f"{settings.base_url}/subscriptions/webhook"
        }

        try:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{timestamp}] [MERCADOPAGO_SERVICE] Creating preference for user {user_id}")
            print(f"[{timestamp}] [MERCADOPAGO_SERVICE] Success URL: {success_redirect}")
            print(f"[{timestamp}] [MERCADOPAGO_SERVICE] Failure URL: {failure_redirect}")
            print(f"[{timestamp}] [MERCADOPAGO_SERVICE] Notification URL: {settings.base_url}/subscriptions/webhook")
            
            preference_response = self.sdk.preference().create(preference_data)
            
            print(f"[{timestamp}] [MERCADOPAGO_SERVICE] Raw response: {preference_response}")
            
            if preference_response.get("status") != 201:
                error_msg = preference_response.get("response", {}).get("message", "Unknown error")
                print(f"[{timestamp}] [MERCADOPAGO_SERVICE] [ERROR] API Error: {error_msg}")
                raise ValueError(f"MercadoPago API error: {error_msg}")
            
            preference = preference_response.get("response", {})
            
            if not preference or not preference.get("id"):
                print(f"[{timestamp}] [MERCADOPAGO_SERVICE] [ERROR] Invalid response structure: {preference}")
                raise ValueError("Invalid response from MercadoPago API")
            
            # Detectar tipo de credenciales correctamente
            is_prod_token = "APP_USR" in settings.mercadopago_access_token
            is_test_token = "TEST" in settings.mercadopago_access_token
            
            # Para credenciales de producción, usar sandbox_init_point para pruebas
            if is_prod_token:
                init_point_key = "sandbox_init_point"
                print(f"[{timestamp}] [MERCADOPAGO_SERVICE] Using SANDBOX mode (credenciales PROD para testing)")
            elif is_test_token:
                init_point_key = "init_point"
                print(f"[{timestamp}] [MERCADOPAGO_SERVICE] Using TEST mode (credenciales TEST)")
            else:
                init_point_key = "init_point"
                print(f"[{timestamp}] [MERCADOPAGO_SERVICE] Using default mode")
            
            return {
                "preference_id": preference["id"],
                "init_point": preference.get(init_point_key, preference.get("init_point", "")),
                "sandbox_init_point": preference.get("sandbox_init_point", ""),
                "is_test_mode": is_prod_token or is_test_token,
                "credentials_type": "PROD" if is_prod_token else ("TEST" if is_test_token else "UNKNOWN"),
                "url_used": init_point_key
            }
            
        except Exception as e:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{timestamp}] [MERCADOPAGO_SERVICE] [ERROR] Exception: {str(e)}")
            raise ValueError(f"Failed to create payment preference: {str(e)}")

    async def get_payment_info(self, payment_id: str) -> Optional[Dict[str, Any]]:
        try:
            payment_response = self.sdk.payment().get(payment_id)
            
            if payment_response.get("status") != 200:
                return None
                
            payment = payment_response.get("response", {})
            return payment
        except Exception as e:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{timestamp}] [MERCADOPAGO_SERVICE] [ERROR] Failed to get payment {payment_id}: {str(e)}")
            return None