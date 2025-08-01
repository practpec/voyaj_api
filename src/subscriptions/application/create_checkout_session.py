from typing import Dict, Any
from src.subscriptions.domain.subscription_plan import SubscriptionPlan, get_stripe_price_id, get_plan_info
from src.subscriptions.infrastructure.persistence.mongo_subscription_repository import MongoSubscriptionRepository
from src.auth.infrastructure.persistence.mongo_user_repository import MongoUserRepository
from src.shared.infrastructure.services.stripe_service import StripeService

class CreateCheckoutSession:
    def __init__(self):
        self.subscription_repository = MongoSubscriptionRepository()
        self.user_repository = MongoUserRepository()
        self.stripe_service = StripeService()

    async def execute(
        self,
        user_id: str,
        plan_type: SubscriptionPlan,
        success_url: str,
        cancel_url: str
    ) -> Dict[str, Any]:
        user = await self.user_repository.find_by_id(user_id)
        if not user:
            raise ValueError("User not found")

        if plan_type == SubscriptionPlan.EXPLORADOR:
            raise ValueError("Free plan does not require checkout")

        subscription = await self.subscription_repository.find_by_user_id(user_id)
        if not subscription:
            raise ValueError("User subscription not found")

        if subscription.plan_type != SubscriptionPlan.EXPLORADOR.value:
            raise ValueError("User already has a premium subscription")

        stripe_price_id = get_stripe_price_id(plan_type)
        if not stripe_price_id:
            raise ValueError(f"No Stripe price ID configured for plan: {plan_type}")

        customer_id = await self._get_or_create_stripe_customer(user)
        plan_info = get_plan_info(plan_type)
        trial_days = plan_info.get("trial_days", 0)

        checkout_session = await self.stripe_service.create_checkout_session(
            customer_id=customer_id,
            price_id=stripe_price_id,
            success_url=success_url,
            cancel_url=cancel_url,
            user_id=user_id,
            plan_type=plan_type.value,
            trial_period_days=trial_days
        )

        if not checkout_session:
            raise ValueError("Failed to create Stripe checkout session")

        return {
            "checkout_url": checkout_session["url"],
            "session_id": checkout_session["session_id"],
            "customer_id": customer_id,
            "plan": {
                "name": plan_info["name"],
                "price_mxn": float(plan_info["price_mxn"]),
                "trial_days": trial_days
            }
        }

    async def _get_or_create_stripe_customer(self, user) -> str:
        subscription = await self.subscription_repository.find_by_user_id(user.id)
        
        if subscription and subscription.stripe_customer_id:
            customer = await self.stripe_service.get_customer(subscription.stripe_customer_id)
            if customer:
                return subscription.stripe_customer_id

        customer_id = await self.stripe_service.create_customer(
            email=user.email,
            name=user.name,
            user_id=user.id
        )

        if not customer_id:
            raise ValueError("Failed to create Stripe customer")

        await self.subscription_repository.update(subscription.id, {
            "stripe_customer_id": customer_id
        })

        return customer_id

    async def create_upgrade_session(
        self,
        user_id: str,
        new_plan_type: SubscriptionPlan,
        success_url: str,
        cancel_url: str
    ) -> Dict[str, Any]:
        user = await self.user_repository.find_by_id(user_id)
        if not user:
            raise ValueError("User not found")

        current_subscription = await self.subscription_repository.find_by_user_id(user_id)
        if not current_subscription:
            raise ValueError("No existing subscription found")

        current_plan = SubscriptionPlan(current_subscription.plan_type)
        
        if not self._is_upgrade(current_plan, new_plan_type):
            raise ValueError("Invalid upgrade path")

        stripe_price_id = get_stripe_price_id(new_plan_type)
        if not stripe_price_id:
            raise ValueError(f"No Stripe price ID configured for plan: {new_plan_type}")

        customer_id = current_subscription.stripe_customer_id
        if not customer_id:
            customer_id = await self._get_or_create_stripe_customer(user)

        checkout_session = await self.stripe_service.create_checkout_session(
            customer_id=customer_id,
            price_id=stripe_price_id,
            success_url=success_url,
            cancel_url=cancel_url,
            user_id=user_id,
            plan_type=new_plan_type.value,
            trial_period_days=0
        )

        if not checkout_session:
            raise ValueError("Failed to create upgrade checkout session")

        plan_info = get_plan_info(new_plan_type)
        current_plan_info = get_plan_info(current_plan)

        return {
            "checkout_url": checkout_session["url"],
            "session_id": checkout_session["session_id"],
            "upgrade_info": {
                "from_plan": current_plan_info["name"],
                "to_plan": plan_info["name"],
                "price_difference_mxn": float(plan_info["price_mxn"] - current_plan_info["price_mxn"]),
                "immediate_access": True
            }
        }

    def _is_upgrade(self, current_plan: SubscriptionPlan, new_plan: SubscriptionPlan) -> bool:
        plan_hierarchy = {
            SubscriptionPlan.EXPLORADOR: 0,
            SubscriptionPlan.AVENTURERO: 1,
            SubscriptionPlan.NOMADA_DIGITAL: 2
        }
        
        current_level = plan_hierarchy.get(current_plan, 0)
        new_level = plan_hierarchy.get(new_plan, 0)
        
        return new_level > current_level

    async def create_reactivation_session(
        self,
        user_id: str,
        success_url: str,
        cancel_url: str
    ) -> Dict[str, Any]:
        user = await self.user_repository.find_by_id(user_id)
        if not user:
            raise ValueError("User not found")

        subscription = await self.subscription_repository.find_by_user_id(user_id)
        if not subscription:
            raise ValueError("No subscription found")

        if subscription.status not in ["cancelled", "expired"]:
            raise ValueError("Subscription is not in a reactivatable state")

        plan_type = SubscriptionPlan(subscription.plan_type)
        
        if plan_type == SubscriptionPlan.EXPLORADOR:
            await self.subscription_repository.update(subscription.id, {
                "status": "active"
            })
            return {"message": "Free plan reactivated successfully"}

        stripe_price_id = get_stripe_price_id(plan_type)
        if not stripe_price_id:
            raise ValueError(f"No Stripe price ID configured for plan: {plan_type}")

        customer_id = subscription.stripe_customer_id
        if not customer_id:
            customer_id = await self._get_or_create_stripe_customer(user)

        checkout_session = await self.stripe_service.create_checkout_session(
            customer_id=customer_id,
            price_id=stripe_price_id,
            success_url=success_url,
            cancel_url=cancel_url,
            user_id=user_id,
            plan_type=plan_type.value,
            trial_period_days=0
        )

        if not checkout_session:
            raise ValueError("Failed to create reactivation checkout session")

        plan_info = get_plan_info(plan_type)

        return {
            "checkout_url": checkout_session["url"],
            "session_id": checkout_session["session_id"],
            "reactivation_info": {
                "plan": plan_info["name"],
                "price_mxn": float(plan_info["price_mxn"]),
                "immediate_access": True
            }
        }