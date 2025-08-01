from fastapi import APIRouter, HTTPException, Request, status, Depends
from typing import Dict, Any
from src.subscriptions.application.subscription_service import SubscriptionService
from src.subscriptions.application.mercadopago_service import MercadoPagoService
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

@router.post("/create-payment")
async def create_payment_preference(
    success_url: str = None,
    failure_url: str = None,
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
            success_url=success_url,
            failure_url=failure_url
        )
        
        return {
            "preference_id": preference["preference_id"],
            "init_point": preference["init_point"],
            "amount": 9.99,
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
        body = await request.body()
        signature = request.headers.get("x-signature", "")
        
        mercadopago_service = MercadoPagoService()
        
        # Validar firma del webhook
        if not mercadopago_service.validate_webhook_signature(body.decode(), signature):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid signature")
        
        # Procesar notificación
        import json
        notification = json.loads(body)
        
        if notification.get("type") == "payment":
            payment_id = notification.get("data", {}).get("id")
            if payment_id:
                await _process_payment_notification(payment_id)
        
        return {"status": "ok"}
    except json.JSONDecodeError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON")
    except Exception as e:
        from datetime import datetime
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] [WEBHOOK] [ERROR] Failed to process webhook: {str(e)}")
        return {"status": "error"}

async def _process_payment_notification(payment_id: str) -> None:
    try:
        mercadopago_service = MercadoPagoService()
        payment_info = await mercadopago_service.get_payment_info(payment_id)
        
        if not payment_info:
            return
        
        # Solo procesar pagos aprobados
        if payment_info.get("status") != "approved":
            return
        
        # Extraer user_id del external_reference
        external_reference = payment_info.get("external_reference", "")
        if not external_reference.startswith("voyaj_pro_"):
            return
        
        parts = external_reference.split("_")
        if len(parts) < 3:
            return
        
        user_id = parts[2]
        
        # Activar suscripción PRO
        subscription_service = SubscriptionService()
        await subscription_service.activate_pro_subscription(user_id, payment_id)
        
    except Exception as e:
        from datetime import datetime
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] [WEBHOOK] [ERROR] Failed to process payment {payment_id}: {str(e)}")