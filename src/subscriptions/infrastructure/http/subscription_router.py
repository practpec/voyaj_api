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
        # Obtener parámetros de la URL
        topic = request.query_params.get("topic")
        id_param = request.query_params.get("id")
        
        # Log detallado para debug
        from datetime import datetime
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] [WEBHOOK] Received notification:")
        print(f"[{timestamp}] [WEBHOOK] Topic: {topic}")
        print(f"[{timestamp}] [WEBHOOK] ID: {id_param}")
        print(f"[{timestamp}] [WEBHOOK] Headers: {dict(request.headers)}")
        
        # Leer el body también
        body = await request.body()
        if body:
            import json
            try:
                body_data = json.loads(body)
                print(f"[{timestamp}] [WEBHOOK] Body: {body_data}")
            except:
                print(f"[{timestamp}] [WEBHOOK] Body (raw): {body.decode()}")
        
        # Procesar según el tipo de notificación
        if topic == "payment" and id_param:
            print(f"[{timestamp}] [WEBHOOK] Processing payment: {id_param}")
            await _process_payment_notification(id_param)
        elif topic == "merchant_order" and id_param:
            print(f"[{timestamp}] [WEBHOOK] Processing merchant order: {id_param}")
            await _process_merchant_order_notification(id_param)
        else:
            print(f"[{timestamp}] [WEBHOOK] Unknown notification type: {topic}")
        
        return {"status": "ok"}
        
    except Exception as e:
        from datetime import datetime
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] [WEBHOOK] [ERROR] Failed to process webhook: {str(e)}")
        return {"status": "error", "message": str(e)}

async def _process_payment_notification(payment_id: str) -> None:
    try:
        mercadopago_service = MercadoPagoService()
        payment_info = await mercadopago_service.get_payment_info(payment_id)
        
        from datetime import datetime
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] [WEBHOOK] Payment info: {payment_info}")
        
        if not payment_info or payment_info.get("status") != "approved":
            print(f"[{timestamp}] [WEBHOOK] Payment not approved: {payment_info.get('status') if payment_info else 'No info'}")
            return
        
        external_reference = payment_info.get("external_reference", "")
        if not external_reference.startswith("voyaj_pro_"):
            print(f"[{timestamp}] [WEBHOOK] Invalid external reference: {external_reference}")
            return
        
        parts = external_reference.split("_")
        if len(parts) < 3:
            print(f"[{timestamp}] [WEBHOOK] Invalid external reference format: {external_reference}")
            return
        
        user_id = parts[2]
        print(f"[{timestamp}] [WEBHOOK] Activating PRO for user: {user_id}")
        
        subscription_service = SubscriptionService()
        await subscription_service.activate_pro_subscription(user_id, payment_id)
        
        print(f"[{timestamp}] [WEBHOOK] PRO subscription activated successfully for user: {user_id}")
        
    except Exception as e:
        from datetime import datetime
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] [WEBHOOK] [ERROR] Failed to process payment {payment_id}: {str(e)}")

async def _process_merchant_order_notification(order_id: str) -> None:
    try:
        from datetime import datetime
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] [WEBHOOK] Processing merchant order {order_id}")
        
        # Para merchant_order, necesitamos obtener la orden y luego los pagos asociados
        mercadopago_service = MercadoPagoService()
        
        # Intentar obtener información de la orden
        # Nota: Necesitarías implementar get_merchant_order_info en el servicio
        print(f"[{timestamp}] [WEBHOOK] Merchant order {order_id} received but not fully processed yet")
        
    except Exception as e:
        from datetime import datetime
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] [WEBHOOK] [ERROR] Failed to process merchant order {order_id}: {str(e)}")