from src.subscriptions.domain.subscription import Subscription
from src.subscriptions.domain.subscription_plan import SubscriptionPlan, SubscriptionStatus, is_premium_plan
from src.subscriptions.infrastructure.persistence.mongo_subscription_repository import MongoSubscriptionRepository
from src.auth.infrastructure.persistence.mongo_user_repository import MongoUserRepository
from src.subscriptions.application.send_subscription_emails import SendSubscriptionEmails

class CreateSubscription:
    def __init__(self):
        self.subscription_repository = MongoSubscriptionRepository()
        self.user_repository = MongoUserRepository()
        self.email_service = SendSubscriptionEmails()

    async def execute(
        self,
        user_id: str,
        plan_type: SubscriptionPlan,
        stripe_customer_id: str = None,
        stripe_subscription_id: str = None
    ) -> Subscription:
        user = await self.user_repository.find_by_id(user_id)
        if not user:
            raise ValueError("User not found")

        existing_subscription = await self.subscription_repository.find_by_user_id(user_id)
        if existing_subscription:
            raise ValueError("User already has a subscription")

        initial_status = self._determine_initial_status(plan_type)
        
        subscription = Subscription(
            user_id=user_id,
            plan_type=plan_type.value,
            status=initial_status.value,
            stripe_customer_id=stripe_customer_id,
            stripe_subscription_id=stripe_subscription_id
        )

        if is_premium_plan(plan_type) and initial_status == SubscriptionStatus.TRIALING:
            from datetime import datetime, timedelta
            subscription.trial_start = datetime.utcnow()
            subscription.trial_end = datetime.utcnow() + timedelta(days=7)

        created_subscription = await self.subscription_repository.create(subscription)

        await self._update_user_subscription_reference(user_id, created_subscription.id)

        await self._send_welcome_email(user, plan_type, initial_status)

        return created_subscription

    def _determine_initial_status(self, plan_type: SubscriptionPlan) -> SubscriptionStatus:
        if plan_type == SubscriptionPlan.EXPLORADOR:
            return SubscriptionStatus.ACTIVE
        else:
            return SubscriptionStatus.TRIALING

    async def _update_user_subscription_reference(self, user_id: str, subscription_id: str) -> None:
        from bson import ObjectId
        await self.user_repository.update(user_id, {
            "subscriptionId": ObjectId(subscription_id)
        })

    async def _send_welcome_email(
        self, 
        user, 
        plan_type: SubscriptionPlan, 
        status: SubscriptionStatus
    ) -> None:
        try:
            if plan_type == SubscriptionPlan.EXPLORADOR:
                await self.email_service.send_welcome_free_email(
                    user_email=user.email,
                    user_name=user.name
                )
            else:
                await self.email_service.send_welcome_premium_email(
                    user_email=user.email,
                    user_name=user.name,
                    plan_name=plan_type.value
                )
                
                if status == SubscriptionStatus.TRIALING:
                    await self.email_service.send_payment_pending_email(
                        user_email=user.email,
                        user_name=user.name,
                        plan_name=plan_type.value
                    )
        except Exception as e:
            from datetime import datetime
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{timestamp}] [CREATE_SUBSCRIPTION] [ERROR] Failed to send welcome email: {str(e)}")

    async def create_from_stripe_checkout(
        self,
        user_id: str,
        plan_type: SubscriptionPlan,
        stripe_customer_id: str,
        stripe_subscription_id: str
    ) -> Subscription:
        user = await self.user_repository.find_by_id(user_id)
        if not user:
            raise ValueError("User not found")

        existing_subscription = await self.subscription_repository.find_by_user_id(user_id)
        if existing_subscription and existing_subscription.status not in [
            SubscriptionStatus.TRIALING.value, 
            SubscriptionStatus.PENDING.value
        ]:
            raise ValueError("User already has an active subscription")

        if existing_subscription:
            update_data = {
                "status": SubscriptionStatus.ACTIVE.value,
                "stripe_customer_id": stripe_customer_id,
                "stripe_subscription_id": stripe_subscription_id,
                "trial_start": None,
                "trial_end": None
            }
            await self.subscription_repository.update(existing_subscription.id, update_data)
            
            await self.email_service.send_payment_successful_email(
                user_email=user.email,
                user_name=user.name,
                plan_name=plan_type.value
            )
            
            return await self.subscription_repository.find_by_id(existing_subscription.id)
        else:
            subscription = Subscription(
                user_id=user_id,
                plan_type=plan_type.value,
                status=SubscriptionStatus.ACTIVE.value,
                stripe_customer_id=stripe_customer_id,
                stripe_subscription_id=stripe_subscription_id
            )

            created_subscription = await self.subscription_repository.create(subscription)
            await self._update_user_subscription_reference(user_id, created_subscription.id)

            await self.email_service.send_payment_successful_email(
                user_email=user.email,
                user_name=user.name,
                plan_name=plan_type.value
            )

            return created_subscription