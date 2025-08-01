from datetime import datetime
from src.subscriptions.domain.subscription_events import SubscriptionStatus, SubscriptionAction
from src.subscriptions.infrastructure.persistence.mongo_subscription_repository import MongoSubscriptionRepository
from src.auth.infrastructure.persistence.mongo_user_repository import MongoUserRepository
from src.subscriptions.application.send_subscription_emails import SendSubscriptionEmails

class UpdateSubscriptionStatus:
    def __init__(self):
        self.subscription_repository = MongoSubscriptionRepository()
        self.user_repository = MongoUserRepository()
        self.email_service = SendSubscriptionEmails()

    async def execute(
        self,
        user_id: str = None,
        stripe_subscription_id: str = None,
        new_status: SubscriptionStatus = None,
        action: SubscriptionAction = None,
        metadata: dict = None
    ) -> bool:
        if not user_id and not stripe_subscription_id:
            raise ValueError("Either user_id or stripe_subscription_id must be provided")

        subscription = None
        if stripe_subscription_id:
            subscription = await self.subscription_repository.find_by_stripe_subscription_id(stripe_subscription_id)
        elif user_id:
            subscription = await self.subscription_repository.find_by_user_id(user_id)

        if not subscription:
            raise ValueError("Subscription not found")

        user = await self.user_repository.find_by_id(subscription.user_id)
        if not user:
            raise ValueError("User not found")

        old_status = subscription.status
        
        if new_status and new_status.value != old_status:
            await self._update_status(subscription.id, new_status, metadata)
            await self._log_status_change(subscription.id, old_status, new_status.value)

        if action:
            await self._execute_action(action, user, subscription, metadata)

        return True

    async def _update_status(
        self, 
        subscription_id: str, 
        new_status: SubscriptionStatus, 
        metadata: dict = None
    ) -> None:
        update_data = {
            "status": new_status.value,
            "updated_at": datetime.utcnow()
        }

        if metadata:
            if "current_period_start" in metadata:
                update_data["current_period_start"] = metadata["current_period_start"]
            if "current_period_end" in metadata:
                update_data["current_period_end"] = metadata["current_period_end"]
            if "cancel_at_period_end" in metadata:
                update_data["cancel_at_period_end"] = metadata["cancel_at_period_end"]

        await self.subscription_repository.update(subscription_id, update_data)

    async def _execute_action(
        self, 
        action: SubscriptionAction, 
        user, 
        subscription, 
        metadata: dict = None
    ) -> None:
        try:
            if action == SubscriptionAction.SEND_PAYMENT_SUCCESS_EMAIL:
                await self.email_service.send_payment_successful_email(
                    user_email=user.email,
                    user_name=user.name,
                    plan_name=subscription.plan_type
                )
            
            elif action == SubscriptionAction.SEND_PAYMENT_FAILED_EMAIL:
                await self.email_service.send_payment_failed_email(
                    user_email=user.email,
                    user_name=user.name,
                    retry_url=metadata.get("retry_url") if metadata else None
                )
            
            elif action == SubscriptionAction.SEND_TRIAL_ENDING_EMAIL:
                await self.email_service.send_trial_ending_email(
                    user_email=user.email,
                    user_name=user.name,
                    plan_name=subscription.plan_type,
                    days_remaining=metadata.get("days_remaining", 3) if metadata else 3
                )
            
            elif action == SubscriptionAction.SEND_SUBSCRIPTION_CANCELLED_EMAIL:
                await self.email_service.send_cancellation_confirmation_email(
                    user_email=user.email,
                    user_name=user.name,
                    plan_name=subscription.plan_type,
                    access_until=metadata.get("access_until") if metadata else None
                )

        except Exception as e:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{timestamp}] [UPDATE_SUBSCRIPTION] [ERROR] Failed to execute action {action}: {str(e)}")

    async def _log_status_change(
        self, 
        subscription_id: str, 
        old_status: str, 
        new_status: str
    ) -> None:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] [UPDATE_SUBSCRIPTION] [INFO] Subscription {subscription_id} status changed: {old_status} → {new_status}")

    async def expire_trial(self, user_id: str) -> bool:
        subscription = await self.subscription_repository.find_by_user_id(user_id)
        if not subscription:
            return False

        if subscription.status != SubscriptionStatus.TRIALING.value:
            return False

        user = await self.user_repository.find_by_id(user_id)
        if not user:
            return False

        await self._update_status(subscription.id, SubscriptionStatus.EXPIRED)

        await self.email_service.send_subscription_expired_email(
            user_email=user.email,
            user_name=user.name,
            plan_name=subscription.plan_type
        )

        return True

    async def mark_subscription_past_due(
        self, 
        stripe_subscription_id: str, 
        retry_url: str = None
    ) -> bool:
        subscription = await self.subscription_repository.find_by_stripe_subscription_id(stripe_subscription_id)
        if not subscription:
            return False

        user = await self.user_repository.find_by_id(subscription.user_id)
        if not user:
            return False

        await self._update_status(subscription.id, SubscriptionStatus.PAST_DUE)

        await self.email_service.send_payment_failed_email(
            user_email=user.email,
            user_name=user.name,
            retry_url=retry_url
        )

        return True

    async def reactivate_subscription(self, user_id: str) -> bool:
        subscription = await self.subscription_repository.find_by_user_id(user_id)
        if not subscription:
            return False

        if subscription.status not in [
            SubscriptionStatus.CANCELLED.value, 
            SubscriptionStatus.EXPIRED.value
        ]:
            return False

        await self._update_status(subscription.id, SubscriptionStatus.ACTIVE)
        return True