from fastapi import APIRouter, Request, HTTPException, status
from datetime import datetime
from src.shared.infrastructure.services.stripe_service import StripeService
from src.subscriptions.application.process_stripe_event import ProcessStripeEvent

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

class StripeWebhookHandler:
    def __init__(self):
        self.stripe_service = StripeService()
        self.event_processor = ProcessStripeEvent()

    async def handle_webhook(self, request: Request) -> dict:
        try:
            payload = await request.body()
            signature = request.headers.get("stripe-signature")
            
            if not signature:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Missing Stripe signature"
                )

            event = self.stripe_service.verify_webhook_signature(payload, signature)
            
            if not event:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid webhook signature"
                )

            event_type = event.get("type")
            event_id = event.get("id")

            await self._log_webhook_received(event_id, event_type)

            success = await self.event_processor.execute(event)
            
            if success:
                return {"received": True, "event_id": event_id}
            else:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to process webhook event"
                )

        except HTTPException:
            raise
        except Exception as e:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{timestamp}] [STRIPE_WEBHOOK] [ERROR] Webhook processing failed: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal server error processing webhook"
            )

    async def _log_webhook_received(self, event_id: str, event_type: str) -> None:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] [STRIPE_WEBHOOK] [INFO] Received webhook {event_id} of type {event_type}")

@router.post("/stripe")
async def stripe_webhook(request: Request):
    handler = StripeWebhookHandler()
    return await handler.handle_webhook(request)

@router.get("/stripe/health")
async def webhook_health():
    return {
        "status": "healthy",
        "service": "stripe_webhook_handler",
        "timestamp": datetime.utcnow()
    }

@router.post("/stripe/test")
async def test_webhook():
    test_event = {
        "id": "evt_test_webhook",
        "type": "customer.subscription.updated",
        "data": {
            "object": {
                "id": "sub_test",
                "status": "active",
                "customer": "cus_test",
                "current_period_start": 1234567890,
                "current_period_end": 1234567890,
                "cancel_at_period_end": False
            }
        }
    }
    
    processor = ProcessStripeEvent()
    success = await processor.execute(test_event)
    
    return {
        "test_completed": True,
        "success": success,
        "event_id": test_event["id"]
    }