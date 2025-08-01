from datetime import datetime, timedelta
from typing import List
from src.subscriptions.infrastructure.persistence.mongo_subscription_repository import MongoSubscriptionRepository
from src.auth.infrastructure.persistence.mongo_user_repository import MongoUserRepository
from src.shared.infrastructure.services.email_service import EmailService

class ExpirationNotificationService:
    def __init__(self):
        self.subscription_repository = MongoSubscriptionRepository()
        self.user_repository = MongoUserRepository()
        self.email_service = EmailService()

    async def check_and_notify_expiring_subscriptions(self) -> int:
        expiring_soon = await self._get_subscriptions_expiring_in_days(7)
        notifications_sent = 0
        
        for subscription in expiring_soon:
            try:
                await self._send_expiration_warning(subscription)
                notifications_sent += 1
            except Exception as e:
                timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                print(f"[{timestamp}] [EXPIRATION_SERVICE] [ERROR] Failed to notify user {subscription.user_id}: {str(e)}")
        
        return notifications_sent

    async def _get_subscriptions_expiring_in_days(self, days: int) -> List:
        now = datetime.utcnow()
        warning_date = now + timedelta(days=days)
        
        # Buscar suscripciones PRO que expiran en los próximos 'days' días
        cursor = self.subscription_repository.collection.find({
            "planType": "pro",
            "status": "active",
            "expiresAt": {
                "$gte": now,
                "$lte": warning_date
            }
        })
        
        subscriptions = []
        async for doc in cursor:
            subscription = self.subscription_repository._doc_to_subscription(doc)
            subscriptions.append(subscription)
        
        return subscriptions

    async def _send_expiration_warning(self, subscription) -> None:
        user = await self.user_repository.find_by_id(subscription.user_id)
        if not user:
            return

        days_remaining = self._calculate_days_remaining(subscription.expires_at)
        
        await self.email_service.send_email(
            to_email=user.email,
            template_type="subscription_expiring_soon",
            template_data={
                "user_name": user.name,
                "days_remaining": days_remaining,
                "expiration_date": subscription.expires_at.strftime("%d/%m/%Y")
            }
        )

    def _calculate_days_remaining(self, expires_at: datetime) -> int:
        if not expires_at:
            return 0
        
        remaining = expires_at - datetime.utcnow()
        return max(0, remaining.days)

    async def get_expiration_summary(self) -> dict:
        now = datetime.utcnow()
        
        # Próximas a expirar (7 días)
        expiring_soon = await self._get_subscriptions_expiring_in_days(7)
        
        # Próximas a expirar (1 día)
        expiring_tomorrow = await self._get_subscriptions_expiring_in_days(1)
        
        # Ya expiradas
        expired_cursor = self.subscription_repository.collection.find({
            "planType": "pro",
            "expiresAt": {"$lt": now},
            "status": "active"
        })
        
        expired_count = await expired_cursor.count()
        
        return {
            "expiring_in_7_days": len(expiring_soon),
            "expiring_tomorrow": len(expiring_tomorrow),
            "already_expired": expired_count,
            "last_check": now.isoformat()
        }