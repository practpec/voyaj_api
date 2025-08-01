import mercadopago
from datetime import datetime
from typing import Dict, Any, Optional
from src.shared.config import settings

class MercadoPagoService:
    def __init__(self):
        self.sdk = mercadopago.SDK(settings.mercadopago_access_token)

    async def create_payment_preference(
        self, 
        user_id: str, 
        user_email: str,
        success_url: str = None,
        failure_url: str = None
    ) -> Dict[str, Any]:
        preference_data = {
            "items": [
                {
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
                "success": success_url or settings.frontend_success_url,
                "failure": failure_url or settings.frontend_cancel_url,
                "pending": success_url or settings.frontend_success_url
            },
            "auto_return": "approved",
            "expires": True,
            "expiration_date_from": datetime.utcnow().isoformat(),
            "expiration_date_to": (datetime.utcnow().replace(hour=23, minute=59, second=59)).isoformat()
        }

        try:
            preference_response = self.sdk.preference().create(preference_data)
            preference = preference_response["response"]
            
            return {
                "preference_id": preference["id"],
                "init_point": preference["init_point"],
                "sandbox_init_point": preference.get("sandbox_init_point")
            }
        except Exception as e:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{timestamp}] [MERCADOPAGO_SERVICE] [ERROR] Failed to create preference: {str(e)}")
            raise ValueError("Failed to create payment preference")

    async def get_payment_info(self, payment_id: str) -> Optional[Dict[str, Any]]:
        try:
            payment_response = self.sdk.payment().get(payment_id)
            payment = payment_response["response"]
            return payment
        except Exception as e:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{timestamp}] [MERCADOPAGO_SERVICE] [ERROR] Failed to get payment {payment_id}: {str(e)}")
            return None

    def validate_webhook_signature(self, payload: str, signature: str) -> bool:
        import hmac
        import hashlib
        
        try:
            parts = signature.split(',')
            ts = None
            hash_received = None
            
            for part in parts:
                key_value = part.split('=', 1)
                if len(key_value) == 2:
                    key = key_value[0].strip()
                    value = key_value[1].strip()
                    if key == "ts":
                        ts = value
                    elif key == "v1":
                        hash_received = value
            
            if not ts or not hash_received:
                return False
            
            manifest = f"ts={ts}&payload={payload}"
            hash_calculated = hmac.new(
                settings.mercadopago_webhook_secret.encode(),
                manifest.encode(),
                hashlib.sha256
            ).hexdigest()
            
            return hash_calculated == hash_received
            
        except Exception as e:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{timestamp}] [MERCADOPAGO_SERVICE] [ERROR] Webhook validation failed: {str(e)}")
            return False