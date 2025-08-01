from datetime import datetime
from src.subscriptions.domain.subscription_plan import SubscriptionPlan, get_stripe_price_id, get_plan_info
from src.subscriptions.infrastructure.persistence.mongo_subscription_repository import MongoSubscriptionRepository
from src.auth.infrastructure.persistence.mongo_user_repository import MongoUserRepository
from src.shared.infrastructure.services.stripe_service import StripeService
from src.subscriptions.application.send_subscription_emails import SendSubscriptionEmails

class UpgradeSubscription:
    def __init__(self):
        self.subscription_repository = MongoSubscriptionRepository()
        self.user_repository = MongoUserRepository()
        self.stripe_service = StripeService()
        self.email_service = SendSubscriptionEmails()

    async def execute(
        self,
        user_id: str,
        new_plan_type: SubscriptionPlan,
        proration_behavior: str = "create_prorations"
    ) -> dict:
        user = await self.user_repository.find_by_id(user_id)
        if not user:
            raise ValueError("User not found")

        current_subscription = await self.subscription_repository.find_by_user_id(user_id)
        if not current_subscription:
            raise ValueError("No existing subscription found")

        current_plan = SubscriptionPlan(current_subscription.plan_type)
        
        if not self._is_valid_upgrade(current_plan, new_plan_type):
            raise ValueError("Invalid upgrade path")

        if new_plan_type == SubscriptionPlan.EXPLORADOR:
            raise ValueError("Cannot upgrade to free plan")

        if current_subscription.status not in ["active", "trialing"]:
            raise ValueError(f"Cannot upgrade subscription with status: {current_subscription.status}")

        new_stripe_price_id = get_stripe_price_id(new_plan_type)
        if not new_stripe_price_id:
            raise ValueError(f"No Stripe price ID configured for plan: {new_plan_type}")

        upgrade_result = await self._process_stripe_upgrade(
            current_subscription, 
            new_stripe_price_id, 
            proration_behavior
        )

        if not upgrade_result:
            raise ValueError("Failed to process Stripe upgrade")

        await self._update_subscription_in_database(
            current_subscription.id,
            new_plan_type,
            upgrade_result
        )

        await self._send_upgrade_confirmation_email(user, new_plan_type)

        new_plan_info = get_plan_info(new_plan_type)
        current_plan_info = get_plan_info(current_plan)

        return {
            "success": True,
            "upgrade_details": {
                "from_plan": current_plan_info["name"],
                "to_plan": new_plan_info["name"],
                "price_difference_mxn": float(new_plan_info["price_mxn"] - current_plan_info["price_mxn"]),
                "upgraded_at": datetime.utcnow(),
                "effective_immediately": True
            },
            "new_subscription": {
                "plan_type": new_plan_type.value,
                "plan_name": new_plan_info["name"],
                "price_mxn": float(new_plan_info["price_mxn"]),
                "features": new_plan_info["features"]
            }
        }

    async def downgrade_to_free(self, user_id: str, reason: str = None) -> dict:
        user = await self.user_repository.find_by_id(user_id)
        if not user:
            raise ValueError("User not found")

        subscription = await self.subscription_repository.find_by_user_id(user_id)
        if not subscription:
            raise ValueError("No subscription found")

        if subscription.plan_type == SubscriptionPlan.EXPLORADOR.value:
            raise ValueError("Already on free plan")

        current_plan_info = get_plan_info(SubscriptionPlan(subscription.plan_type))

        if subscription.stripe_subscription_id:
            cancel_result = await self.stripe_service.cancel_subscription(
                subscription.stripe_subscription_id,
                at_period_end=True
            )
            
            access_until = None
            if cancel_result and cancel_result.get("current_period_end"):
                access_until = cancel_result["current_period_end"]

        update_data = {
            "plan_type": SubscriptionPlan.EXPLORADOR.value,
            "status": "active",
            "downgrade_reason": reason,
            "downgraded_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }

        if not subscription.stripe_subscription_id:
            await self.subscription_repository.update(subscription.id, update_data)
            access_until = datetime.utcnow()
        else:
            update_data["status"] = "cancelled"
            update_data["cancel_at_period_end"] = True
            await self.subscription_repository.update(subscription.id, update_data)

        await self.email_service.send_downgrade_warning_email(
            user_email=user.email,
            user_name=user.name,
            access_until=access_until
        )

        return {
            "success": True,
            "downgrade_details": {
                "from_plan": current_plan_info["name"],
                "to_plan": "Explorador",
                "access_until": access_until,
                "reason": reason
            }
        }

    def _is_valid_upgrade(self, current_plan: SubscriptionPlan, new_plan: SubscriptionPlan) -> bool:
        plan_hierarchy = {
            SubscriptionPlan.EXPLORADOR: 0,
            SubscriptionPlan.AVENTURERO: 1,
            SubscriptionPlan.NOMADA_DIGITAL: 2
        }
        
        current_level = plan_hierarchy.get(current_plan, 0)
        new_level = plan_hierarchy.get(new_plan, 0)
        
        return new_level > current_level

    async def _process_stripe_upgrade(
        self, 
        subscription, 
        new_price_id: str, 
        proration_behavior: str
    ) -> dict:
        if not subscription.stripe_subscription_id:
            return None

        try:
            return await self.stripe_service.update_subscription(
                subscription.stripe_subscription_id,
                new_price_id,
                proration_behavior
            )
        except Exception as e:
            from datetime import datetime
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{timestamp}] [UPGRADE_SUBSCRIPTION] [ERROR] Stripe upgrade failed: {str(e)}")
            return None

    async def _update_subscription_in_database(
        self, 
        subscription_id: str, 
        new_plan_type: SubscriptionPlan, 
        stripe_result: dict
    ) -> None:
        update_data = {
            "plan_type": new_plan_type.value,
            "updated_at": datetime.utcnow(),
            "last_upgrade_at": datetime.utcnow()
        }

        if stripe_result:
            update_data.update({
                "status": stripe_result.get("status", "active"),
                "current_period_start": stripe_result.get("current_period_start"),
                "current_period_end": stripe_result.get("current_period_end")
            })

        await self.subscription_repository.update(subscription_id, update_data)

    async def _send_upgrade_confirmation_email(self, user, new_plan_type: SubscriptionPlan) -> None:
        try:
            await self.email_service.send_upgrade_confirmation_email(
                user_email=user.email,
                user_name=user.name,
                plan_name=new_plan_type.value
            )
        except Exception as e:
            from datetime import datetime
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{timestamp}] [UPGRADE_SUBSCRIPTION] [ERROR] Failed to send upgrade email: {str(e)}")

    async def get_upgrade_preview(self, user_id: str, new_plan_type: SubscriptionPlan) -> dict:
        subscription = await self.subscription_repository.find_by_user_id(user_id)
        if not subscription:
            raise ValueError("No subscription found")

        current_plan = SubscriptionPlan(subscription.plan_type)
        
        if not self._is_valid_upgrade(current_plan, new_plan_type):
            raise ValueError("Invalid upgrade path")

        current_plan_info = get_plan_info(current_plan)
        new_plan_info = get_plan_info(new_plan_type)

        price_difference = new_plan_info["price_mxn"] - current_plan_info["price_mxn"]
        
        proration_amount = 0
        if subscription.current_period_end and subscription.current_period_start:
            days_remaining = (subscription.current_period_end - datetime.utcnow()).days
            monthly_price_diff = float(price_difference)
            proration_amount = (monthly_price_diff / 30) * days_remaining

        return {
            "current_plan": {
                "name": current_plan_info["name"],
                "price_mxn": float(current_plan_info["price_mxn"])
            },
            "new_plan": {
                "name": new_plan_info["name"],
                "price_mxn": float(new_plan_info["price_mxn"]),
                "features": new_plan_info["features"]
            },
            "pricing": {
                "monthly_difference": float(price_difference),
                "prorated_charge": round(proration_amount, 2),
                "next_billing_amount": float(new_plan_info["price_mxn"])
            },
            "upgrade_benefits": self._get_upgrade_benefits(current_plan, new_plan_type)
        }

    def _get_upgrade_benefits(self, current_plan: SubscriptionPlan, new_plan: SubscriptionPlan) -> list:
        from src.subscriptions.domain.subscription_plan import get_plan_limits
        
        current_limits = get_plan_limits(current_plan)
        new_limits = get_plan_limits(new_plan)
        
        benefits = []
        
        if current_limits["max_trips"] != -1 and new_limits["max_trips"] == -1:
            benefits.append("Viajes ilimitados")
        
        if current_limits["max_photos_per_trip"] != -1 and new_limits["max_photos_per_trip"] == -1:
            benefits.append("Fotos ilimitadas por viaje")
        
        if not current_limits["collaborative_trips"] and new_limits["collaborative_trips"]:
            benefits.append("Viajes colaborativos con amigos")
        
        if not current_limits["premium_export"] and new_limits["premium_export"]:
            benefits.append("Exportación PDF/Excel")
        
        if not current_limits["advanced_analytics"] and new_limits["advanced_analytics"]:
            benefits.append("Análisis avanzados de gastos")
        
        if current_limits["max_group_members"] < new_limits["max_group_members"]:
            if new_limits["max_group_members"] == -1:
                benefits.append("Grupos ilimitados")
            else:
                benefits.append(f"Grupos hasta {new_limits['max_group_members']} personas")
        
        return benefits