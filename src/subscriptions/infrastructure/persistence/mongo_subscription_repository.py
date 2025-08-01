from typing import Optional, List, Dict, Any
from bson import ObjectId
from datetime import datetime
from src.shared.infrastructure.database.mongo_client import get_database
from src.subscriptions.domain.subscription import Subscription

class MongoSubscriptionRepository:
    def __init__(self):
        self.db = get_database()
        self.collection = self.db.subscriptions

    def _convert_doc_to_subscription(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        """Convert MongoDB document to Subscription-compatible dict"""
        converted = {
            "id": str(doc["_id"]),
            "user_id": str(doc.get("userId", "")),
            "plan_type": doc.get("planType", "explorador"),
            "status": doc.get("status", "active"),
            "stripe_customer_id": doc.get("stripe_customer_id"),
            "stripe_subscription_id": doc.get("stripe_subscription_id"),
            "current_period_start": doc.get("current_period_start"),
            "current_period_end": doc.get("current_period_end"),
            "cancel_at_period_end": doc.get("cancel_at_period_end", False),
            "trial_start": doc.get("trial_start"),
            "trial_end": doc.get("trial_end"),
            "trial_warning_sent": doc.get("trial_warning_sent", False),
            "trial_warning_sent_at": doc.get("trial_warning_sent_at"),
            "downgrade_reason": doc.get("downgrade_reason"),
            "downgraded_at": doc.get("downgraded_at"),
            "last_upgrade_at": doc.get("last_upgrade_at"),
            "created_at": doc.get("createdAt", datetime.utcnow()),
            "updated_at": doc.get("updatedAt", datetime.utcnow())
        }
        return converted

    async def create(self, subscription: Subscription) -> Subscription:
        subscription_dict = subscription.dict(exclude={"id"})
        subscription_dict["userId"] = ObjectId(subscription.user_id)
        subscription_dict["planType"] = subscription.plan_type
        subscription_dict["createdAt"] = subscription.created_at
        subscription_dict["updatedAt"] = subscription.updated_at
        
        if "user_id" in subscription_dict:
            del subscription_dict["user_id"]
        if "plan_type" in subscription_dict:
            del subscription_dict["plan_type"]
        if "created_at" in subscription_dict:
            del subscription_dict["created_at"]
        if "updated_at" in subscription_dict:
            del subscription_dict["updated_at"]
        
        result = await self.collection.insert_one(subscription_dict)
        subscription.id = str(result.inserted_id)
        return subscription

    async def find_by_id(self, subscription_id: str) -> Optional[Subscription]:
        doc: Optional[Dict[str, Any]] = await self.collection.find_one({"_id": ObjectId(subscription_id)})
        if doc:
            converted = self._convert_doc_to_subscription(doc)
            return Subscription(**converted)
        return None

    async def find_by_user_id(self, user_id: str) -> Optional[Subscription]:
        doc: Optional[Dict[str, Any]] = await self.collection.find_one({"userId": ObjectId(user_id)})
        if doc:
            converted = self._convert_doc_to_subscription(doc)
            return Subscription(**converted)
        return None

    async def find_by_stripe_subscription_id(self, stripe_subscription_id: str) -> Optional[Subscription]:
        doc: Optional[Dict[str, Any]] = await self.collection.find_one({"stripe_subscription_id": stripe_subscription_id})
        if doc:
            converted = self._convert_doc_to_subscription(doc)
            return Subscription(**converted)
        return None

    async def find_by_status(self, status: str) -> List[Subscription]:
        cursor = self.collection.find({"status": status})
        
        subscriptions = []
        async for doc in cursor:
            converted = self._convert_doc_to_subscription(doc)
            subscriptions.append(Subscription(**converted))
        return subscriptions

    async def find_trials_expiring_between(self, start_date: datetime, end_date: datetime) -> List[Subscription]:
        cursor = self.collection.find({
            "status": "trialing",
            "trial_end": {
                "$gte": start_date,
                "$lte": end_date
            },
            "trial_warning_sent": {"$ne": True}
        })
        
        subscriptions = []
        async for doc in cursor:
            converted = self._convert_doc_to_subscription(doc)
            subscriptions.append(Subscription(**converted))
        return subscriptions

    async def find_expired_trials(self, current_date: datetime) -> List[Subscription]:
        cursor = self.collection.find({
            "status": "trialing",
            "trial_end": {"$lt": current_date}
        })
        
        subscriptions = []
        async for doc in cursor:
            converted = self._convert_doc_to_subscription(doc)
            subscriptions.append(Subscription(**converted))
        return subscriptions

    async def update(self, subscription_id: str, update_data: dict) -> bool:
        mongo_update_data = {}
        for key, value in update_data.items():
            if key == "user_id":
                mongo_update_data["userId"] = ObjectId(value)
            elif key == "plan_type":
                mongo_update_data["planType"] = value
            elif key == "created_at":
                mongo_update_data["createdAt"] = value
            elif key == "updated_at":
                mongo_update_data["updatedAt"] = value
            else:
                mongo_update_data[key] = value
        
        result = await self.collection.update_one(
            {"_id": ObjectId(subscription_id)},
            {"$set": mongo_update_data}
        )
        return result.modified_count > 0

    async def delete(self, subscription_id: str) -> bool:
        result = await self.collection.delete_one({"_id": ObjectId(subscription_id)})
        return result.deleted_count > 0

    async def find_by_plan_type(self, plan_type: str) -> List[Subscription]:
        cursor = self.collection.find({"planType": plan_type})
        
        subscriptions = []
        async for doc in cursor:
            converted = self._convert_doc_to_subscription(doc)
            subscriptions.append(Subscription(**converted))
        return subscriptions

    async def count_by_status(self, status: str) -> int:
        return await self.collection.count_documents({"status": status})

    async def count_by_plan_type(self, plan_type: str) -> int:
        return await self.collection.count_documents({"planType": plan_type})

    async def find_subscriptions_ending_soon(self, days_ahead: int = 7) -> List[Subscription]:
        from datetime import timedelta
        target_date = datetime.utcnow() + timedelta(days=days_ahead)
        
        cursor = self.collection.find({
            "status": "active",
            "current_period_end": {
                "$lte": target_date,
                "$gte": datetime.utcnow()
            }
        })
        
        subscriptions = []
        async for doc in cursor:
            converted = self._convert_doc_to_subscription(doc)
            subscriptions.append(Subscription(**converted))
        return subscriptions