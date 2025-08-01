from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from src.subscriptions.application.check_subscription_limits import CheckSubscriptionLimits, LimitCheckResult
from src.subscriptions.infrastructure.persistence.mongo_subscription_repository import MongoSubscriptionRepository
from src.subscriptions.domain.subscription_plan import SubscriptionPlan, is_feature_available

class ValidateFeatureAccess:
    def __init__(self):
        self.limits_checker = CheckSubscriptionLimits()
        self.subscription_repository = MongoSubscriptionRepository()
        self._cache = {}
        self._cache_ttl = timedelta(minutes=5)

    async def can_create_trip(self, user_id: str) -> LimitCheckResult:
        cache_key = f"create_trip:{user_id}"
        cached_result = self._get_cached_result(cache_key)
        if cached_result:
            return cached_result

        result = await self.limits_checker.can_create_trip(user_id)
        self._cache_result(cache_key, result)
        
        if not result.allowed and result.upgrade_required:
            await self._track_limit_hit(user_id, "create_trip", result.message)
        
        return result

    async def can_upload_photo(self, user_id: str, trip_id: str) -> LimitCheckResult:
        cache_key = f"upload_photo:{user_id}:{trip_id}"
        cached_result = self._get_cached_result(cache_key)
        if cached_result:
            return cached_result

        result = await self.limits_checker.can_upload_photo(user_id, trip_id)
        self._cache_result(cache_key, result)
        
        if not result.allowed and result.upgrade_required:
            await self._track_limit_hit(user_id, "upload_photo", result.message)
        
        return result

    async def can_invite_members(self, user_id: str, current_members: int = 0) -> LimitCheckResult:
        cache_key = f"invite_members:{user_id}:{current_members}"
        cached_result = self._get_cached_result(cache_key)
        if cached_result:
            return cached_result

        result = await self.limits_checker.can_invite_members(user_id, current_members)
        self._cache_result(cache_key, result)
        
        if not result.allowed:
            await self._track_limit_hit(user_id, "collaborative_trips", result.message)
        
        return result

    async def can_export_data(self, user_id: str) -> LimitCheckResult:
        cache_key = f"export_data:{user_id}"
        cached_result = self._get_cached_result(cache_key)
        if cached_result:
            return cached_result

        result = await self.limits_checker.can_export_data(user_id)
        self._cache_result(cache_key, result)
        
        if not result.allowed:
            await self._track_limit_hit(user_id, "export_data", result.message)
        
        return result

    async def can_access_analytics(self, user_id: str) -> LimitCheckResult:
        cache_key = f"analytics:{user_id}"
        cached_result = self._get_cached_result(cache_key)
        if cached_result:
            return cached_result

        result = await self.limits_checker.can_access_analytics(user_id)
        self._cache_result(cache_key, result)
        
        if not result.allowed:
            await self._track_limit_hit(user_id, "advanced_analytics", result.message)
        
        return result

    async def validate_subscription_status(self, user_id: str) -> Dict[str, Any]:
        subscription = await self.subscription_repository.find_by_user_id(user_id)
        if not subscription:
            return {
                "valid": False,
                "reason": "no_subscription",
                "message": "No subscription found"
            }

        if subscription.status == "expired":
            return {
                "valid": False,
                "reason": "expired",
                "message": "Subscription has expired"
            }

        if subscription.status == "cancelled":
            if subscription.current_period_end and subscription.current_period_end < datetime.utcnow():
                return {
                    "valid": False,
                    "reason": "cancelled_expired",
                    "message": "Cancelled subscription has expired"
                }

        if subscription.status in ["past_due", "unpaid"]:
            return {
                "valid": False,
                "reason": "payment_required",
                "message": "Payment required to continue service"
            }

        return {
            "valid": True,
            "subscription": {
                "id": subscription.id,
                "plan": subscription.plan_type,
                "status": subscription.status
            }
        }

    async def get_feature_availability(self, user_id: str) -> Dict[str, Any]:
        subscription = await self.subscription_repository.find_by_user_id(user_id)
        if not subscription:
            plan = SubscriptionPlan.EXPLORADOR
        else:
            plan = SubscriptionPlan(subscription.plan_type)

        features = {
            "create_trip": await self._can_use_feature(user_id, "create_trip"),
            "upload_photo": await self._can_use_feature(user_id, "upload_photo"),
            "collaborative_trips": is_feature_available(plan, "collaborative_trips"),
            "export_data": is_feature_available(plan, "premium_export"),
            "advanced_analytics": is_feature_available(plan, "advanced_analytics"),
            "priority_support": is_feature_available(plan, "priority_support"),
            "unlimited_devices": is_feature_available(plan, "unlimited_devices"),
            "auto_backup": is_feature_available(plan, "auto_backup")
        }

        return {
            "plan": plan.value,
            "status": subscription.status if subscription else "active",
            "features": features
        }

    async def _can_use_feature(self, user_id: str, feature: str) -> bool:
        try:
            if feature == "create_trip":
                result = await self.can_create_trip(user_id)
            elif feature == "upload_photo":
                result = await self.can_upload_photo(user_id, "dummy_trip")
            else:
                return True
            
            return result.allowed
        except Exception:
            return False

    def _get_cached_result(self, cache_key: str) -> Optional[LimitCheckResult]:
        if cache_key in self._cache:
            cached_data = self._cache[cache_key]
            if datetime.utcnow() - cached_data["timestamp"] < self._cache_ttl:
                return cached_data["result"]
            else:
                del self._cache[cache_key]
        return None

    def _cache_result(self, cache_key: str, result: LimitCheckResult) -> None:
        self._cache[cache_key] = {
            "result": result,
            "timestamp": datetime.utcnow()
        }

        if len(self._cache) > 1000:
            self._clean_cache()

    def _clean_cache(self) -> None:
        now = datetime.utcnow()
        expired_keys = [
            key for key, data in self._cache.items()
            if now - data["timestamp"] >= self._cache_ttl
        ]
        for key in expired_keys:
            del self._cache[key]

    async def _track_limit_hit(self, user_id: str, feature: str, message: str) -> None:
        try:
            from src.shared.infrastructure.database.mongo_client import get_database
            db = get_database()
            collection = db.limit_hits
            
            await collection.insert_one({
                "user_id": user_id,
                "feature": feature,
                "message": message,
                "timestamp": datetime.utcnow(),
                "notified": False
            })

            recent_hits = await collection.count_documents({
                "user_id": user_id,
                "feature": feature,
                "timestamp": {"$gte": datetime.utcnow() - timedelta(hours=24)},
                "notified": False
            })

            if recent_hits == 1:
                await self._send_first_limit_notification(user_id, feature, message)
                await collection.update_many(
                    {"user_id": user_id, "feature": feature, "notified": False},
                    {"$set": {"notified": True}}
                )

        except Exception as e:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{timestamp}] [VALIDATE_FEATURE_ACCESS] [ERROR] Failed to track limit hit: {str(e)}")

    async def _send_first_limit_notification(self, user_id: str, feature: str, message: str) -> None:
        try:
            from src.subscriptions.application.send_subscription_emails import SendSubscriptionEmails
            from src.auth.infrastructure.persistence.mongo_user_repository import MongoUserRepository
            
            user_repository = MongoUserRepository()
            email_service = SendSubscriptionEmails()
            
            user = await user_repository.find_by_id(user_id)
            if user:
                await email_service.send_limit_reached_email(
                    user_email=user.email,
                    user_name=user.name,
                    limit_message=message
                )
        except Exception as e:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{timestamp}] [VALIDATE_FEATURE_ACCESS] [ERROR] Failed to send notification: {str(e)}")

    async def check_approaching_limits(self, user_id: str) -> Dict[str, Any]:
        warnings = []
        
        try:
            subscription = await self.subscription_repository.find_by_user_id(user_id)
            if not subscription or subscription.plan_type == SubscriptionPlan.EXPLORADOR.value:
                
                trip_check = await self.can_create_trip(user_id)
                if not trip_check.allowed:
                    warnings.append({
                        "type": "limit_reached",
                        "feature": "create_trip",
                        "message": trip_check.message,
                        "severity": "high"
                    })
                elif trip_check.current_usage >= trip_check.max_allowed * 0.8:
                    warnings.append({
                        "type": "approaching_limit",
                        "feature": "create_trip",
                        "message": f"Estás cerca del límite de viajes ({trip_check.current_usage}/{trip_check.max_allowed})",
                        "severity": "medium"
                    })

            if subscription and subscription.status == "trialing":
                if subscription.trial_end:
                    days_remaining = (subscription.trial_end - datetime.utcnow()).days
                    if days_remaining <= 3:
                        warnings.append({
                            "type": "trial_ending",
                            "feature": "subscription",
                            "message": f"Tu período de prueba termina en {days_remaining} días",
                            "severity": "high"
                        })

        except Exception as e:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{timestamp}] [VALIDATE_FEATURE_ACCESS] [ERROR] Failed to check limits: {str(e)}")

        return {
            "user_id": user_id,
            "warnings": warnings,
            "checked_at": datetime.utcnow()
        }