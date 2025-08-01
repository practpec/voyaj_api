from typing import Dict, Any, List
from datetime import datetime, timedelta
from src.subscriptions.domain.subscription_plan import SubscriptionPlan, get_plan_limits, get_plan_info
from src.subscriptions.infrastructure.persistence.mongo_subscription_repository import MongoSubscriptionRepository
from src.trips.infrastructure.persistence.mongo_trip_repository import MongoTripRepository
from src.photos.infrastructure.persistence.mongo_photo_repository import MongoPhotoRepository
from src.expenses.infrastructure.persistence.mongo_expense_repository import MongoExpenseRepository
from src.journal_entries.infrastructure.persistence.mongo_journal_entry_repository import MongoJournalEntryRepository

class GetSubscriptionUsage:
    def __init__(self):
        self.subscription_repository = MongoSubscriptionRepository()
        self.trip_repository = MongoTripRepository()
        self.photo_repository = MongoPhotoRepository()
        self.expense_repository = MongoExpenseRepository()
        self.journal_repository = MongoJournalEntryRepository()

    async def execute(self, user_id: str) -> Dict[str, Any]:
        subscription = await self.subscription_repository.find_by_user_id(user_id)
        if not subscription:
            raise ValueError("Subscription not found")

        plan = SubscriptionPlan(subscription.plan_type)
        limits = get_plan_limits(plan)
        plan_info = get_plan_info(plan)

        current_usage = await self._calculate_current_usage(user_id)
        
        usage_analytics = await self._calculate_usage_analytics(user_id, current_usage)
        
        billing_info = await self._get_billing_info(subscription)
        
        recommendations = self._generate_recommendations(plan, current_usage, limits)

        return {
            "subscription": {
                "id": subscription.id,
                "plan": subscription.plan_type,
                "status": subscription.status,
                "created_at": subscription.created_at,
                "updated_at": subscription.updated_at
            },
            "plan_info": plan_info,
            "limits": limits,
            "current_usage": current_usage,
            "usage_analytics": usage_analytics,
            "billing_info": billing_info,
            "recommendations": recommendations
        }

    async def _calculate_current_usage(self, user_id: str) -> Dict[str, Any]:
        trips = await self.trip_repository.find_by_user_id(user_id)
        active_trips = [trip for trip in trips if not trip.is_deleted]
        
        total_photos = 0
        total_expenses = 0
        total_journal_entries = 0
        largest_group_size = 1
        
        for trip in active_trips:
            trip_photos = await self.photo_repository.find_by_trip_id(trip.id)
            total_photos += len([photo for photo in trip_photos if not photo.is_deleted])
            
            trip_expenses = await self.expense_repository.find_by_trip_id(trip.id)
            total_expenses += len([expense for expense in trip_expenses if not expense.is_deleted])
            
            trip_journal_entries = await self.journal_repository.find_by_trip_id(trip.id)
            total_journal_entries += len([entry for entry in trip_journal_entries if not entry.is_deleted])
            
            group_size = len(trip.members)
            if group_size > largest_group_size:
                largest_group_size = group_size

        photos_by_trip = []
        for trip in active_trips[:5]:
            trip_photos = await self.photo_repository.find_by_trip_id(trip.id)
            photo_count = len([photo for photo in trip_photos if not photo.is_deleted])
            photos_by_trip.append({
                "trip_id": trip.id,
                "trip_title": trip.title,
                "photo_count": photo_count
            })

        return {
            "active_trips": len(active_trips),
            "total_photos": total_photos,
            "total_expenses": total_expenses,
            "total_journal_entries": total_journal_entries,
            "largest_group_size": largest_group_size,
            "photos_by_trip": photos_by_trip,
            "last_updated": datetime.utcnow()
        }

    async def _calculate_usage_analytics(self, user_id: str, current_usage: Dict[str, Any]) -> Dict[str, Any]:
        now = datetime.utcnow()
        thirty_days_ago = now - timedelta(days=30)
        
        recent_trips = []
        try:
            trips = await self.trip_repository.find_by_user_id(user_id)
            recent_trips = [
                trip for trip in trips 
                if trip.created_at >= thirty_days_ago and not trip.is_deleted
            ]
        except Exception:
            pass

        return {
            "trips_created_last_30_days": len(recent_trips),
            "average_photos_per_trip": (
                current_usage["total_photos"] / max(1, current_usage["active_trips"])
            ),
            "average_expenses_per_trip": (
                current_usage["total_expenses"] / max(1, current_usage["active_trips"])
            ),
            "most_active_period": self._determine_most_active_period(recent_trips),
            "usage_trend": "increasing" if len(recent_trips) > 0 else "stable"
        }

    def _determine_most_active_period(self, recent_trips: List) -> str:
        if not recent_trips:
            return "no_recent_activity"
        
        if len(recent_trips) >= 3:
            return "very_active"
        elif len(recent_trips) >= 1:
            return "moderately_active"
        else:
            return "low_activity"

    async def _get_billing_info(self, subscription) -> Dict[str, Any]:
        billing_info = {
            "stripe_customer_id": subscription.stripe_customer_id,
            "stripe_subscription_id": subscription.stripe_subscription_id,
            "current_period_start": subscription.current_period_start,
            "current_period_end": subscription.current_period_end,
            "cancel_at_period_end": subscription.cancel_at_period_end or False
        }

        if subscription.trial_start and subscription.trial_end:
            billing_info["trial_info"] = {
                "trial_start": subscription.trial_start,
                "trial_end": subscription.trial_end,
                "days_remaining": max(0, (subscription.trial_end - datetime.utcnow()).days)
            }

        return billing_info

    def _generate_recommendations(
        self, 
        plan: SubscriptionPlan, 
        current_usage: Dict[str, Any], 
        limits: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        recommendations = []

        if plan == SubscriptionPlan.EXPLORADOR:
            if current_usage["active_trips"] >= limits["max_trips"] * 0.8:
                recommendations.append({
                    "type": "upgrade_suggestion",
                    "priority": "high",
                    "title": "Próximo al límite de viajes",
                    "message": "Estás cerca del límite de viajes activos. Considera actualizar para viajes ilimitados.",
                    "action": "upgrade_to_aventurero"
                })

            if current_usage.get("photos_by_trip"):
                max_photos_in_trip = max([trip["photo_count"] for trip in current_usage["photos_by_trip"]])
                if max_photos_in_trip >= limits["max_photos_per_trip"] * 0.8:
                    recommendations.append({
                        "type": "upgrade_suggestion",
                        "priority": "medium",
                        "title": "Próximo al límite de fotos",
                        "message": "Uno de tus viajes está cerca del límite de fotos. Actualiza para fotos ilimitadas.",
                        "action": "upgrade_to_aventurero"
                    })

            if current_usage["largest_group_size"] > 1:
                recommendations.append({
                    "type": "feature_suggestion",
                    "priority": "medium",
                    "title": "Funciones colaborativas disponibles",
                    "message": "Actualiza para acceder a viajes colaborativos y invitar hasta 10 amigos.",
                    "action": "upgrade_to_aventurero"
                })

        elif plan == SubscriptionPlan.AVENTURERO:
            if current_usage["largest_group_size"] >= limits["max_group_members"] * 0.8:
                recommendations.append({
                    "type": "upgrade_suggestion",
                    "priority": "medium",
                    "title": "Grupos grandes detectados",
                    "message": "Tienes grupos grandes. Considera Nómada Digital para grupos ilimitados.",
                    "action": "upgrade_to_nomada"
                })

        if current_usage["total_expenses"] > 50:
            recommendations.append({
                "type": "feature_tip",
                "priority": "low",
                "title": "Análisis de gastos disponible",
                "message": "Con tantos gastos registrados, los análisis avanzados te ayudarían mucho.",
                "action": "explore_analytics"
            })

        return recommendations

    async def get_usage_percentage(self, user_id: str, limit_type: str) -> float:
        subscription = await self.subscription_repository.find_by_user_id(user_id)
        if not subscription:
            return 0.0

        plan = SubscriptionPlan(subscription.plan_type)
        limits = get_plan_limits(plan)
        
        max_value = limits.get(limit_type, 0)
        if max_value == -1:
            return 0.0

        current_usage = await self._calculate_current_usage(user_id)
        
        usage_mapping = {
            "max_trips": current_usage["active_trips"],
            "max_photos_per_trip": max([
                trip["photo_count"] for trip in current_usage.get("photos_by_trip", [])
            ] or [0]),
            "max_group_members": current_usage["largest_group_size"]
        }
        
        current_value = usage_mapping.get(limit_type, 0)
        
        if max_value == 0:
            return 0.0
            
        return min(100.0, (current_value / max_value) * 100)

    async def is_approaching_limit(self, user_id: str, limit_type: str, threshold: float = 80.0) -> bool:
        percentage = await self.get_usage_percentage(user_id, limit_type)
        return percentage >= threshold