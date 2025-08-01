from datetime import datetime
from src.auth.infrastructure.persistence.mongo_user_repository import MongoUserRepository
from src.shared.infrastructure.security.hashing import verify_password
from src.shared.infrastructure.security.authentication import create_access_token, create_refresh_token
from src.subscriptions.infrastructure.persistence.mongo_subscription_repository import MongoSubscriptionRepository
from src.subscriptions.domain.subscription_plan import get_plan_info, SubscriptionPlan

class LoginUser:
    def __init__(self):
        self.user_repository = MongoUserRepository()
        self.subscription_repository = MongoSubscriptionRepository()

    async def execute(self, email: str, password: str) -> dict:
        user = await self.user_repository.find_by_email(email)
        if not user or not verify_password(password, user.password):
            raise ValueError("Invalid credentials")

        await self.user_repository.update(user.id, {"lastLoginAt": datetime.utcnow()})

        subscription = await self.subscription_repository.find_by_user_id(user.id)
        subscription_info = {
            "plan": "explorador",
            "status": "active",
            "limits": {
                "max_trips": 1,
                "max_photos_per_trip": 100,
                "collaborative_trips": False,
                "premium_export": False
            }
        }

        if subscription:
            plan_type = SubscriptionPlan(subscription.plan_type)
            plan_info = get_plan_info(plan_type)
            subscription_info = {
                "plan": subscription.plan_type,
                "status": subscription.status,
                "plan_name": plan_info["name"],
                "price_mxn": float(plan_info["price_mxn"]),
                "limits": plan_info.get("limits", {}),
                "features": plan_info.get("features", [])
            }

        token_data = {"sub": user.id, "email": user.email}
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "profile_photo_url": user.profile_photo_url,
                "email_verified": user.email_verified
            },
            "subscription": subscription_info
        }