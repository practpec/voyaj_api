from typing import Dict, Any, Optional
from src.subscriptions.domain.subscription_plan import SubscriptionPlan, get_plan_limits, is_feature_available, get_numeric_limit
from src.subscriptions.infrastructure.persistence.mongo_subscription_repository import MongoSubscriptionRepository
from src.trips.infrastructure.persistence.mongo_trip_repository import MongoTripRepository
from src.photos.infrastructure.persistence.mongo_photo_repository import MongoPhotoRepository

class LimitCheckResult:
    def __init__(
        self, 
        allowed: bool, 
        limit_type: str = None, 
        current_usage: int = 0, 
        max_allowed: int = 0,
        message: str = None,
        upgrade_required: bool = False
    ):
        self.allowed = allowed
        self.limit_type = limit_type
        self.current_usage = current_usage
        self.max_allowed = max_allowed
        self.message = message
        self.upgrade_required = upgrade_required

    def to_dict(self) -> Dict[str, Any]:
        return {
            "allowed": self.allowed,
            "limit_type": self.limit_type,
            "current_usage": self.current_usage,
            "max_allowed": self.max_allowed,
            "message": self.message,
            "upgrade_required": self.upgrade_required
        }

class CheckSubscriptionLimits:
    def __init__(self):
        self.subscription_repository = MongoSubscriptionRepository()
        self.trip_repository = MongoTripRepository()
        self.photo_repository = MongoPhotoRepository()

    async def can_create_trip(self, user_id: str) -> LimitCheckResult:
        subscription = await self.subscription_repository.find_by_user_id(user_id)
        if not subscription:
            return LimitCheckResult(
                allowed=False,
                message="No subscription found"
            )

        plan = SubscriptionPlan(subscription.plan_type)
        max_trips = get_numeric_limit(plan, "max_trips")

        if max_trips == -1:
            return LimitCheckResult(allowed=True)

        current_trips = await self._count_active_trips(user_id)
        
        if current_trips >= max_trips:
            return LimitCheckResult(
                allowed=False,
                limit_type="max_trips",
                current_usage=current_trips,
                max_allowed=max_trips,
                message=f"Has alcanzado el límite de {max_trips} viaje(s) activo(s). Actualiza tu plan para crear más viajes.",
                upgrade_required=True
            )

        return LimitCheckResult(
            allowed=True,
            limit_type="max_trips",
            current_usage=current_trips,
            max_allowed=max_trips
        )

    async def can_upload_photo(self, user_id: str, trip_id: str) -> LimitCheckResult:
        subscription = await self.subscription_repository.find_by_user_id(user_id)
        if not subscription:
            return LimitCheckResult(
                allowed=False,
                message="No subscription found"
            )

        plan = SubscriptionPlan(subscription.plan_type)
        max_photos = get_numeric_limit(plan, "max_photos_per_trip")

        if max_photos == -1:
            return LimitCheckResult(allowed=True)

        current_photos = await self._count_trip_photos(trip_id)
        
        if current_photos >= max_photos:
            return LimitCheckResult(
                allowed=False,
                limit_type="max_photos_per_trip",
                current_usage=current_photos,
                max_allowed=max_photos,
                message=f"Has alcanzado el límite de {max_photos} fotos por viaje. Actualiza tu plan para subir más fotos.",
                upgrade_required=True
            )

        return LimitCheckResult(
            allowed=True,
            limit_type="max_photos_per_trip",
            current_usage=current_photos,
            max_allowed=max_photos
        )

    async def can_invite_members(self, user_id: str, current_members: int = 0) -> LimitCheckResult:
        subscription = await self.subscription_repository.find_by_user_id(user_id)
        if not subscription:
            return LimitCheckResult(
                allowed=False,
                message="No subscription found"
            )

        plan = SubscriptionPlan(subscription.plan_type)
        
        if not is_feature_available(plan, "collaborative_trips"):
            return LimitCheckResult(
                allowed=False,
                limit_type="collaborative_trips",
                message="Los viajes colaborativos no están disponibles en tu plan actual. Actualiza para invitar amigos.",
                upgrade_required=True
            )

        max_members = get_numeric_limit(plan, "max_group_members")
        
        if max_members == -1:
            return LimitCheckResult(allowed=True)

        if current_members >= max_members:
            return LimitCheckResult(
                allowed=False,
                limit_type="max_group_members",
                current_usage=current_members,
                max_allowed=max_members,
                message=f"Has alcanzado el límite de {max_members} miembros por grupo. Actualiza para grupos más grandes.",
                upgrade_required=True
            )

        return LimitCheckResult(
            allowed=True,
            limit_type="max_group_members",
            current_usage=current_members,
            max_allowed=max_members
        )

    async def can_export_data(self, user_id: str) -> LimitCheckResult:
        subscription = await self.subscription_repository.find_by_user_id(user_id)
        if not subscription:
            return LimitCheckResult(
                allowed=False,
                message="No subscription found"
            )

        plan = SubscriptionPlan(subscription.plan_type)
        
        if not is_feature_available(plan, "premium_export"):
            return LimitCheckResult(
                allowed=False,
                limit_type="premium_export",
                message="La exportación premium no está disponible en tu plan actual. Actualiza para exportar tus datos.",
                upgrade_required=True
            )

        return LimitCheckResult(allowed=True)

    async def can_access_analytics(self, user_id: str) -> LimitCheckResult:
        subscription = await self.subscription_repository.find_by_user_id(user_id)
        if not subscription:
            return LimitCheckResult(
                allowed=False,
                message="No subscription found"
            )

        plan = SubscriptionPlan(subscription.plan_type)
        
        if not is_feature_available(plan, "advanced_analytics"):
            return LimitCheckResult(
                allowed=False,
                limit_type="advanced_analytics",
                message="Los análisis avanzados no están disponibles en tu plan actual. Actualiza para ver estadísticas detalladas.",
                upgrade_required=True
            )

        return LimitCheckResult(allowed=True)

    async def _count_active_trips(self, user_id: str) -> int:
        trips = await self.trip_repository.find_by_user_id(user_id)
        return len([trip for trip in trips if not trip.is_deleted])

    async def _count_trip_photos(self, trip_id: str) -> int:
        photos = await self.photo_repository.find_by_trip_id(trip_id)
        return len([photo for photo in photos if not photo.is_deleted])

    async def get_usage_summary(self, user_id: str) -> Dict[str, Any]:
        subscription = await self.subscription_repository.find_by_user_id(user_id)
        if not subscription:
            return {"error": "No subscription found"}

        plan = SubscriptionPlan(subscription.plan_type)
        limits = get_plan_limits(plan)

        active_trips = await self._count_active_trips(user_id)
        
        usage_summary = {
            "plan": subscription.plan_type,
            "status": subscription.status,
            "limits": limits,
            "current_usage": {
                "active_trips": active_trips,
                "max_trips": limits["max_trips"]
            },
            "features": {
                "collaborative_trips": limits["collaborative_trips"],
                "premium_export": limits["premium_export"],
                "advanced_analytics": limits["advanced_analytics"],
                "priority_support": limits["priority_support"],
                "unlimited_devices": limits["unlimited_devices"],
                "auto_backup": limits["auto_backup"]
            }
        }

        if limits["max_trips"] != -1:
            usage_summary["current_usage"]["trips_remaining"] = max(0, limits["max_trips"] - active_trips)
            usage_summary["current_usage"]["trips_percentage"] = min(100, (active_trips / limits["max_trips"]) * 100)

        return usage_summary