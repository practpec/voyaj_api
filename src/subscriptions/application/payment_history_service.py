from typing import List, Dict, Any
from datetime import datetime
from src.subscriptions.infrastructure.persistence.mongo_subscription_repository import MongoSubscriptionRepository
from src.subscriptions.application.mercadopago_service import MercadoPagoService

class PaymentHistoryService:
    def __init__(self):
        self.subscription_repository = MongoSubscriptionRepository()
        self.mercadopago_service = MercadoPagoService()

    async def get_user_payment_history(self, user_id: str) -> List[Dict[str, Any]]:
        subscription = await self.subscription_repository.find_by_user_id(user_id)
        if not subscription:
            return []

        payments = []
        
        # Obtener todos los payment_ids históricos (por ahora solo el actual)
        if subscription.mercadopago_payment_id:
            payment_info = await self.mercadopago_service.get_payment_info(
                subscription.mercadopago_payment_id
            )
            
            if payment_info:
                payment_data = {
                    "payment_id": payment_info["id"],
                    "amount": payment_info["transaction_amount"],
                    "currency": payment_info["currency_id"],
                    "status": payment_info["status"],
                    "status_detail": payment_info["status_detail"],
                    "payment_method": payment_info["payment_method"]["id"],
                    "payment_type": payment_info["payment_type_id"],
                    "date_created": payment_info["date_created"],
                    "date_approved": payment_info.get("date_approved"),
                    "description": payment_info["description"],
                    "external_reference": payment_info.get("external_reference")
                }
                payments.append(payment_data)

        return payments

    async def get_payment_statistics(self, user_id: str) -> Dict[str, Any]:
        payments = await self.get_user_payment_history(user_id)
        
        total_payments = len(payments)
        total_amount = sum(float(p["amount"]) for p in payments if p["status"] == "approved")
        successful_payments = len([p for p in payments if p["status"] == "approved"])
        
        last_payment = None
        if payments:
            last_payment = max(payments, key=lambda p: p["date_created"])

        return {
            "total_payments": total_payments,
            "successful_payments": successful_payments,
            "total_amount_paid": total_amount,
            "success_rate": (successful_payments / total_payments * 100) if total_payments > 0 else 0,
            "last_payment": last_payment,
            "currency": "MXN"
        }