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
        success_redirect = success_url or settings.frontend_success_url
        failure_redirect = failure_url or settings.frontend_cancel_url
        
        if not success_redirect or not success_redirect.startswith('http'):
            success_redirect = "https://www.google.com/success"
        if not failure_redirect or not failure_redirect.startswith('http'):
            failure_redirect = "https://www.google.com/cancel"

        preference_data = {
            "items": [
                {
                    "id": "voyaj_pro_monthly",
                    "title": "Suscripción Voyaj PRO",
                    "description": "Plan mensual con beneficios premium",
                    "quantity": 1,
                    "unit_price": 24.99,
                    "currency_id": "MXN",
                    "category_id": "services"
                }
            ],
            "payer": {
                "email": user_email,
                "name": "Usuario Voyaj",
                "surname": "Premium",
                "phone": {
                    "area_code": "52",
                    "number": "5551234567"
                },
                "address": {
                    "street_name": "Av. Principal",
                    "street_number": 123,
                    "zip_code": "01000"
                }
            },
            "external_reference": f"voyaj_pro_{user_id}_{int(datetime.utcnow().timestamp())}",
            "back_urls": {
                "success": f"{settings.base_url}/subscriptions/success",
                "failure": f"{settings.base_url}/subscriptions/failure",
                "pending": f"{settings.base_url}/subscriptions/pending"
            },
            "auto_return": "approved",
            "notification_url": f"{settings.base_url}/subscriptions/webhook",
            "payment_methods": {
                "excluded_payment_methods": [],
                "excluded_payment_types": [
                    {
                        "id": "ticket"
                    }
                ],
                "installments": 1,
                "default_installments": 1
            },
            "shipments": {
                "mode": "not_specified"
            },
            "statement_descriptor": "VOYAJ",
            "additional_info": {
                "items": [
                    {
                        "id": "voyaj_pro_monthly",
                        "title": "Suscripción Voyaj PRO",
                        "description": "Plan mensual premium",
                        "quantity": 1,
                        "unit_price": 24.99,
                        "category_id": "services"
                    }
                ],
                "payer": {
                    "first_name": "Usuario",
                    "last_name": "Voyaj",
                    "phone": {
                        "area_code": "52",
                        "number": "5551234567"
                    }
                },
                "shipments": {
                    "receiver_address": {
                        "zip_code": "01000",
                        "state_name": "Ciudad de México",
                        "city_name": "CDMX",
                        "street_name": "Av. Principal",
                        "street_number": 123
                    }
                }
            },
            "metadata": {
                "user_id": user_id,
                "subscription_type": "pro_monthly",
                "integration": "voyaj_app"
            },
            "expires": True,
            "expiration_date_from": datetime.utcnow().isoformat(),
            "expiration_date_to": (datetime.utcnow().replace(hour=23, minute=59, second=59)).isoformat()
        }

        try:
            preference_response = self.sdk.preference().create(preference_data)
            
            if preference_response.get("status") != 201:
                error_msg = preference_response.get("response", {}).get("message", "Error en API")
                raise ValueError(f"Error MercadoPago: {error_msg}")
            
            preference = preference_response.get("response", {})
            
            if not preference or not preference.get("id"):
                raise ValueError("Respuesta inválida de MercadoPago")
            
            return {
                "preference_id": preference["id"],
                "init_point": preference.get("init_point", ""),
                "sandbox_init_point": preference.get("sandbox_init_point", "")
            }
            
        except Exception as e:
            raise ValueError(f"Error al crear preferencia: {str(e)}")

    async def get_payment_info(self, payment_id: str) -> Optional[Dict[str, Any]]:
        try:
            payment_response = self.sdk.payment().get(payment_id)
            
            if payment_response.get("status") != 200:
                return None
                
            return payment_response.get("response", {})
        except Exception:
            return None