from datetime import datetime
from typing import Dict, Any
from src.subscriptions.domain.subscription import Subscription
from src.subscriptions.infrastructure.persistence.mongo_subscription_repository import MongoSubscriptionRepository
from src.auth.infrastructure.persistence.mongo_user_repository import MongoUserRepository

class SubscriptionService:
    def __init__(self):
        self.subscription_repository = MongoSubscriptionRepository()
        self.user_repository = MongoUserRepository()

    async def create_free_subscription(self, user_id: str) -> Subscription:
        subscription = Subscription(user_id=user_id)
        return await self.subscription_repository.create(subscription)

    async def activate_pro_subscription(self, user_id: str, payment_id: str) -> Subscription:
        subscription = await self.subscription_repository.find_by_user_id(user_id)
        if not subscription:
            raise ValueError("Subscription not found")

        subscription.activate_pro(payment_id)
        await self.subscription_repository.update(subscription.id, subscription)
        
        await self._send_activation_email(user_id)
        return subscription

    async def get_user_subscription(self, user_id: str) -> Subscription:
        subscription = await self.subscription_repository.find_by_user_id(user_id)
        if not subscription:
            subscription = await self.create_free_subscription(user_id)
        
        if subscription.plan_type == "pro" and subscription.expires_at:
            if subscription.expires_at <= datetime.utcnow():
                await self._expire_subscription(subscription)
        
        return subscription

    async def cancel_subscription(self, user_id: str) -> bool:
        subscription = await self.subscription_repository.find_by_user_id(user_id)
        if not subscription:
            return False

        subscription.cancel_to_free()
        await self.subscription_repository.update(subscription.id, subscription)
        await self._send_cancellation_email(user_id)
        return True

    async def process_expired_subscriptions(self) -> int:
        expired_subscriptions = await self.subscription_repository.find_expired_subscriptions()
        processed = 0
        
        for subscription in expired_subscriptions:
            await self._expire_subscription(subscription)
            processed += 1
        
        return processed

    async def get_subscription_status(self, user_id: str) -> Dict[str, Any]:
        subscription = await self.get_user_subscription(user_id)
        
        return {
            "plan": subscription.plan_type,
            "status": subscription.status,
            "is_pro": subscription.is_pro(),
            "expires_at": subscription.expires_at,
            "days_remaining": self._get_days_remaining(subscription)
        }

    async def _expire_subscription(self, subscription: Subscription) -> None:
        subscription.expire_to_free()
        await self.subscription_repository.update(subscription.id, subscription)
        await self._send_expiration_email(subscription.user_id)

    def _get_days_remaining(self, subscription: Subscription) -> int:
        if subscription.expires_at and subscription.plan_type == "pro":
            remaining = subscription.expires_at - datetime.utcnow()
            return max(0, remaining.days)
        return 0

    async def _send_activation_email(self, user_id: str) -> None:
        try:
            user = await self.user_repository.find_by_id(user_id)
            if user:
                from src.shared.infrastructure.services.email_service import EmailService
                email_service = EmailService()
                await email_service.send_email(
                    to_email=user.email,
                    template_type="subscription_activated",
                    template_data={
                        "user_name": user.name,
                        "plan_name": "PRO",
                        "expires_days": 30
                    }
                )
        except Exception as e:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{timestamp}] [SUBSCRIPTION_SERVICE] [ERROR] Failed to send activation email: {str(e)}")

    async def _send_expiration_email(self, user_id: str) -> None:
        try:
            user = await self.user_repository.find_by_id(user_id)
            if user:
                from src.shared.infrastructure.services.email_service import EmailService
                email_service = EmailService()
                await email_service.send_email(
                    to_email=user.email,
                    template_type="subscription_expired",
                    template_data={
                        "user_name": user.name,
                        "plan_name": "PRO"
                    }
                )
        except Exception as e:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{timestamp}] [SUBSCRIPTION_SERVICE] [ERROR] Failed to send expiration email: {str(e)}")

    async def _send_cancellation_email(self, user_id: str) -> None:
        try:
            user = await self.user_repository.find_by_id(user_id)
            if user:
                from src.shared.infrastructure.services.email_service import EmailService
                email_service = EmailService()
                await email_service.send_email(
                    to_email=user.email,
                    template_type="subscription_cancelled",
                    template_data={
                        "user_name": user.name,
                        "plan_name": "PRO"
                    }
                )
        except Exception as e:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{timestamp}] [SUBSCRIPTION_SERVICE] [ERROR] Failed to send cancellation email: {str(e)}")