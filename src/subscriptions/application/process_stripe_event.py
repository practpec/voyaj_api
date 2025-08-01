from datetime import datetime
from typing import Dict, Any, Optional
from src.subscriptions.domain.subscription_events import (
    StripeEventType, SubscriptionAction, SubscriptionStatus,
    get_action_for_event, get_status_from_stripe_status,
    is_critical_event, get_event_priority
)
from src.subscriptions.infrastructure.persistence.mongo_subscription_repository import MongoSubscriptionRepository
from src.auth.infrastructure.persistence.mongo_user_repository import MongoUserRepository
from src.subscriptions.application.update_subscription_status import UpdateSubscriptionStatus
from src.subscriptions.application.create_subscription import CreateSubscription
from src.subscriptions.application.send_subscription_emails import SendSubscriptionEmails

class ProcessStripeEvent:
    def __init__(self):
        self.subscription_repository = MongoSubscriptionRepository()
        self.user_repository = MongoUserRepository()
        self.update_subscription_status = UpdateSubscriptionStatus()
        self.create_subscription = CreateSubscription()
        self.email_service = SendSubscriptionEmails()

    async def execute(self, event_data: Dict[str, Any]) -> bool:
        event_type = event_data.get("type")
        event_id = event_data.get("id")
        
        if not event_type or not event_id:
            return False

        priority = get_event_priority(event_type)
        
        try:
            if await self._is_event_already_processed(event_id):
                return True

            await self._log_event_processing(event_id, event_type, priority.value)

            success = await self._process_event_by_type(event_type, event_data)
            
            await self._mark_event_as_processed(event_id, success)
            
            return success

        except Exception as e:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{timestamp}] [PROCESS_STRIPE_EVENT] [ERROR] Failed to process event {event_id}: {str(e)}")
            await self._mark_event_as_failed(event_id, str(e))
            return False

    async def _process_event_by_type(self, event_type: str, event_data: Dict[str, Any]) -> bool:
        event_object = event_data.get("data", {}).get("object", {})
        
        if event_type == StripeEventType.CHECKOUT_SESSION_COMPLETED:
            return await self._handle_checkout_completed(event_object)
        
        elif event_type == StripeEventType.CUSTOMER_SUBSCRIPTION_CREATED:
            return await self._handle_subscription_created(event_object)
        
        elif event_type == StripeEventType.CUSTOMER_SUBSCRIPTION_UPDATED:
            return await self._handle_subscription_updated(event_object)
        
        elif event_type == StripeEventType.CUSTOMER_SUBSCRIPTION_DELETED:
            return await self._handle_subscription_deleted(event_object)
        
        elif event_type == StripeEventType.INVOICE_PAYMENT_SUCCEEDED:
            return await self._handle_payment_succeeded(event_object)
        
        elif event_type == StripeEventType.INVOICE_PAYMENT_FAILED:
            return await self._handle_payment_failed(event_object)
        
        elif event_type == StripeEventType.CUSTOMER_SUBSCRIPTION_TRIAL_WILL_END:
            return await self._handle_trial_ending(event_object)
        
        else:
            return True

    async def _handle_checkout_completed(self, session_data: Dict[str, Any]) -> bool:
        metadata = session_data.get("metadata", {})
        user_id = metadata.get("user_id")
        plan_type = metadata.get("plan_type")
        
        if not user_id or not plan_type:
            return False

        customer_id = session_data.get("customer")
        subscription_id = session_data.get("subscription")

        if subscription_id:
            from src.subscriptions.domain.subscription_plan import SubscriptionPlan
            await self.create_subscription.create_from_stripe_checkout(
                user_id=user_id,
                plan_type=SubscriptionPlan(plan_type),
                stripe_customer_id=customer_id,
                stripe_subscription_id=subscription_id
            )

        return True

    async def _handle_subscription_created(self, subscription_data: Dict[str, Any]) -> bool:
        return await self._update_subscription_from_stripe_data(subscription_data)

    async def _handle_subscription_updated(self, subscription_data: Dict[str, Any]) -> bool:
        return await self._update_subscription_from_stripe_data(subscription_data)

    async def _handle_subscription_deleted(self, subscription_data: Dict[str, Any]) -> bool:
        stripe_subscription_id = subscription_data.get("id")
        if not stripe_subscription_id:
            return False

        canceled_at = subscription_data.get("canceled_at")
        access_until = None
        if canceled_at:
            access_until = datetime.fromtimestamp(canceled_at)

        await self.update_subscription_status.execute(
            stripe_subscription_id=stripe_subscription_id,
            new_status=SubscriptionStatus.CANCELLED,
            action=SubscriptionAction.SEND_SUBSCRIPTION_CANCELLED_EMAIL,
            metadata={"access_until": access_until}
        )

        return True

    async def _handle_payment_succeeded(self, invoice_data: Dict[str, Any]) -> bool:
        subscription_id = invoice_data.get("subscription")
        if not subscription_id:
            return False

        billing_reason = invoice_data.get("billing_reason")
        
        if billing_reason == "subscription_create":
            await self.update_subscription_status.execute(
                stripe_subscription_id=subscription_id,
                new_status=SubscriptionStatus.ACTIVE,
                action=SubscriptionAction.SEND_PAYMENT_SUCCESS_EMAIL
            )
        elif billing_reason in ["subscription_cycle", "subscription_update"]:
            await self.update_subscription_status.execute(
                stripe_subscription_id=subscription_id,
                action=SubscriptionAction.SEND_PAYMENT_SUCCESS_EMAIL,
                metadata={"renewal": True}
            )

        return True

    async def _handle_payment_failed(self, invoice_data: Dict[str, Any]) -> bool:
        subscription_id = invoice_data.get("subscription")
        if not subscription_id:
            return False

        hosted_invoice_url = invoice_data.get("hosted_invoice_url")
        
        await self.update_subscription_status.execute(
            stripe_subscription_id=subscription_id,
            new_status=SubscriptionStatus.PAST_DUE,
            action=SubscriptionAction.SEND_PAYMENT_FAILED_EMAIL,
            metadata={"retry_url": hosted_invoice_url}
        )

        return True

    async def _handle_trial_ending(self, subscription_data: Dict[str, Any]) -> bool:
        stripe_subscription_id = subscription_data.get("id")
        if not stripe_subscription_id:
            return False

        trial_end = subscription_data.get("trial_end")
        days_remaining = 3
        
        if trial_end:
            trial_end_date = datetime.fromtimestamp(trial_end)
            days_remaining = max(0, (trial_end_date - datetime.utcnow()).days)

        await self.update_subscription_status.execute(
            stripe_subscription_id=stripe_subscription_id,
            action=SubscriptionAction.SEND_TRIAL_ENDING_EMAIL,
            metadata={"days_remaining": days_remaining}
        )

        return True

    async def _update_subscription_from_stripe_data(self, subscription_data: Dict[str, Any]) -> bool:
        stripe_subscription_id = subscription_data.get("id")
        if not stripe_subscription_id:
            return False

        stripe_status = subscription_data.get("status")
        status = get_status_from_stripe_status(stripe_status)

        current_period_start = None
        current_period_end = None
        
        if subscription_data.get("current_period_start"):
            current_period_start = datetime.fromtimestamp(subscription_data["current_period_start"])
        if subscription_data.get("current_period_end"):
            current_period_end = datetime.fromtimestamp(subscription_data["current_period_end"])

        metadata = {
            "current_period_start": current_period_start,
            "current_period_end": current_period_end,
            "cancel_at_period_end": subscription_data.get("cancel_at_period_end", False)
        }

        await self.update_subscription_status.execute(
            stripe_subscription_id=stripe_subscription_id,
            new_status=status,
            metadata=metadata
        )

        return True

    async def _is_event_already_processed(self, event_id: str) -> bool:
        try:
            from src.shared.infrastructure.database.mongo_client import get_database
            db = get_database()
            collection = db.processed_stripe_events
            
            existing_event = await collection.find_one({"event_id": event_id})
            return existing_event is not None
        except Exception:
            return False

    async def _mark_event_as_processed(self, event_id: str, success: bool) -> None:
        try:
            from src.shared.infrastructure.database.mongo_client import get_database
            db = get_database()
            collection = db.processed_stripe_events
            
            await collection.insert_one({
                "event_id": event_id,
                "processed_at": datetime.utcnow(),
                "success": success,
                "status": "completed"
            })
        except Exception as e:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{timestamp}] [PROCESS_STRIPE_EVENT] [ERROR] Failed to mark event as processed: {str(e)}")

    async def _mark_event_as_failed(self, event_id: str, error_message: str) -> None:
        try:
            from src.shared.infrastructure.database.mongo_client import get_database
            db = get_database()
            collection = db.processed_stripe_events
            
            await collection.insert_one({
                "event_id": event_id,
                "processed_at": datetime.utcnow(),
                "success": False,
                "status": "failed",
                "error_message": error_message
            })
        except Exception as e:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{timestamp}] [PROCESS_STRIPE_EVENT] [ERROR] Failed to mark event as failed: {str(e)}")

    async def _log_event_processing(self, event_id: str, event_type: str, priority: str) -> None:
        if is_critical_event(event_type):
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{timestamp}] [PROCESS_STRIPE_EVENT] [INFO] Processing critical event {event_id} of type {event_type}")

    async def get_event_processing_status(self, event_id: str) -> Optional[Dict[str, Any]]:
        try:
            from src.shared.infrastructure.database.mongo_client import get_database
            db = get_database()
            collection = db.processed_stripe_events
            
            event_record = await collection.find_one({"event_id": event_id})
            if event_record:
                return {
                    "event_id": event_record["event_id"],
                    "processed_at": event_record["processed_at"],
                    "success": event_record["success"],
                    "status": event_record["status"],
                    "error_message": event_record.get("error_message")
                }
            return None
        except Exception:
            return None

    async def retry_failed_events(self, limit: int = 10) -> int:
        try:
            from src.shared.infrastructure.database.mongo_client import get_database
            db = get_database()
            collection = db.processed_stripe_events
            
            failed_events = await collection.find({
                "status": "failed",
                "retry_count": {"$lt": 3}
            }).limit(limit).to_list(length=limit)
            
            retry_count = 0
            for event_record in failed_events:
                event_id = event_record["event_id"]
                retry_count += await collection.update_one(
                    {"event_id": event_id},
                    {"$inc": {"retry_count": 1}, "$set": {"last_retry_at": datetime.utcnow()}}
                ).modified_count
            
            return retry_count
        except Exception as e:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{timestamp}] [PROCESS_STRIPE_EVENT] [ERROR] Failed to retry events: {str(e)}")
            return 0