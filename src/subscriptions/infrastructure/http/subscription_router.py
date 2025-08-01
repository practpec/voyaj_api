from fastapi import APIRouter, HTTPException, Request, status, Depends
from typing import Dict, Any, List
from src.subscriptions.application.subscription_service import SubscriptionService
from src.subscriptions.application.mercadopago_service import MercadoPagoService
from src.subscriptions.application.payment_history_service import PaymentHistoryService
from src.subscriptions.application.expiration_notification_service import ExpirationNotificationService
from src.shared.infrastructure.security.authentication import get_current_user_id
from src.auth.infrastructure.persistence.mongo_user_repository import MongoUserRepository

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])

@router.get("/status")
async def get_subscription_status(user_id: str = Depends(get_current_user_id)) -> Dict[str, Any]:
    try:
        subscription_service = SubscriptionService()
        return await subscription_service.get_subscription_status(user_id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/payment-history")
async def get_payment_history(user_id: str = Depends(get_current_user_id)) -> List[Dict[str, Any]]:
    try:
        payment_history_service = PaymentHistoryService()
        return await payment_history_service.get_user_payment_history(user_id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/payment-statistics")
async def get_payment_statistics(user_id: str = Depends(get_current_user_id)) -> Dict[str, Any]:
    try:
        payment_history_service = PaymentHistoryService()
        return await payment_history_service.get_payment_statistics(user_id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/create-payment")
async def create_payment_preference(
    user_id: str = Depends(get_current_user_id)
) -> Dict[str, Any]:
    try:
        user_repository = MongoUserRepository()
        user = await user_repository.find_by_id(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        mercadopago_service = MercadoPagoService()
        preference = await mercadopago_service.create_payment_preference(
            user_id=user_id,
            user_email=user.email,
            success_url="https://www.google.com/success",
            failure_url="https://www.google.com/cancel"
        )
        
        return {
            "preference_id": preference["preference_id"],
            "init_point": preference["init_point"],
            "amount": 24.99,
            "currency": "MXN"
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/cancel")
async def cancel_subscription(user_id: str = Depends(get_current_user_id)) -> Dict[str, str]:
    try:
        subscription_service = SubscriptionService()
        success = await subscription_service.cancel_subscription(user_id)
        
        if not success:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found")
        
        return {"message": "Subscription cancelled successfully"}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/webhook")
async def mercadopago_webhook(request: Request) -> Dict[str, str]:
    try:
        topic = request.query_params.get("topic")
        id_param = request.query_params.get("id")
        
        if topic == "payment" and id_param:
            await _process_payment_notification(id_param)
        elif topic == "merchant_order" and id_param:
            pass  # Merchant orders procesados pero sin logging
        
        return {"status": "ok"}
        
    except Exception as e:
        from datetime import datetime
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] [WEBHOOK] [ERROR] {str(e)}")
        return {"status": "error", "message": str(e)}

async def _process_payment_notification(payment_id: str) -> None:
    try:
        mercadopago_service = MercadoPagoService()
        payment_info = await mercadopago_service.get_payment_info(payment_id)
        
        if not payment_info or payment_info.get("status") != "approved":
            return
        
        external_reference = payment_info.get("external_reference", "")
        if not external_reference.startswith("voyaj_pro_"):
            return
        
        parts = external_reference.split("_")
        if len(parts) < 3:
            return
        
        user_id = parts[2]
        
        subscription_service = SubscriptionService()
        await subscription_service.activate_pro_subscription(user_id, payment_id)
        
    except Exception as e:
        from datetime import datetime
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] [WEBHOOK] [ERROR] Payment processing failed {payment_id}: {str(e)}")

# Endpoint administrativo para verificar expiraciones
@router.get("/admin/expiration-summary")
async def get_expiration_summary() -> Dict[str, Any]:
    try:
        expiration_service = ExpirationNotificationService()
        return await expiration_service.get_expiration_summary()
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/admin/send-expiration-notifications")
async def send_expiration_notifications() -> Dict[str, Any]:
    try:
        expiration_service = ExpirationNotificationService()
        notifications_sent = await expiration_service.check_and_notify_expiring_subscriptions()
        return {
            "notifications_sent": notifications_sent,
            "message": f"Sent {notifications_sent} expiration warnings"
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))