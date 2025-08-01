from datetime import datetime
from src.subscriptions.domain.subscription_plan import SubscriptionPlan
from src.subscriptions.infrastructure.persistence.mongo_subscription_repository import MongoSubscriptionRepository
from src.auth.infrastructure.persistence.mongo_user_repository import MongoUserRepository
from src.shared.infrastructure.services.stripe_service import StripeService
from src.subscriptions.application.send_subscription_emails import SendSubscriptionEmails

class CancelSubscription:
    def __init__(self):
        self.subscription_repository = MongoSubscriptionRepository()
        self.user_repository = MongoUserRepository()
        self.stripe_service = StripeService()
        self.email_service = SendSubscriptionEmails()

    async def execute(
        self,
        user_id: str,
        cancel_immediately: bool = False,
        reason: str = None
    ) -> dict:
        user = await self.user_repository.find_by_id(user_id)
        if not user:
            raise ValueError("User not found")

        subscription = await self.subscription_repository.find_by_user_id(user_id)
        if not subscription:
            raise ValueError("No subscription found")

        if subscription.plan_type == SubscriptionPlan.EXPLORADOR.value:
            raise ValueError("Cannot cancel free plan")

        if subscription.status in ["cancelled", "expired"]:
            raise ValueError("Subscription is already cancelled")

        access_until = None
        downgrade_date = None

        if subscription.stripe_subscription_id:
            try:
                stripe_result = await self.stripe_service.cancel_subscription(
                    subscription.stripe_subscription_id,
                    at_period_end=not cancel_immediately
                )
                
                if stripe_result:
                    access_until = stripe_result.get("current_period_end")
                    if cancel_immediately:
                        downgrade_date = datetime.utcnow()
                    else:
                        downgrade_date = access_until
            except Exception as e:
                # Si Stripe falla, continuamos con la cancelación local
                timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                print(f"[{timestamp}] [CANCEL_SUBSCRIPTION] [WARNING] Stripe cancellation failed, proceeding locally: {str(e)}")
                if cancel_immediately:
                    downgrade_date = datetime.utcnow()
                else:
                    access_until = subscription.current_period_end or datetime.utcnow()
                    downgrade_date = access_until

        update_data = {
            "status": "cancelled",
            "cancel_at_period_end": not cancel_immediately,
            "cancelled_at": datetime.utcnow(),
            "cancellation_reason": reason,
            "updated_at": datetime.utcnow()
        }

        if cancel_immediately:
            update_data["plan_type"] = SubscriptionPlan.EXPLORADOR.value
            downgrade_date = datetime.utcnow()
        else:
            access_until = subscription.current_period_end or datetime.utcnow()
            downgrade_date = access_until

        try:
            await self.subscription_repository.update(subscription.id, update_data)

            await self.email_service.send_cancellation_confirmation_email(
                user_email=user.email,
                user_name=user.name,
                plan_name=subscription.plan_type,
                access_until=access_until
            )

            return {
                "success": True,
                "cancelled_at": datetime.utcnow(),
                "access_until": access_until,
                "downgrade_date": downgrade_date,
                "immediate_cancellation": cancel_immediately
            }
        except Exception as e:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{timestamp}] [CANCEL_SUBSCRIPTION] [ERROR] Database update failed: {str(e)}")
            raise ValueError(f"Failed to update subscription: {str(e)}")