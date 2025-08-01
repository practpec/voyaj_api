from typing import Optional, List
from bson import ObjectId
from datetime import datetime
from src.shared.infrastructure.database.mongo_client import get_database
from src.subscriptions.domain.subscription import Subscription

class MongoSubscriptionRepository:
    def __init__(self):
        self.db = get_database()
        self.collection = self.db.subscriptions

    async def create(self, subscription: Subscription) -> Subscription:
        subscription_dict = subscription.dict(exclude={"id"})
        subscription_dict["userId"] = ObjectId(subscription.user_id)
        subscription_dict["planType"] = subscription.plan_type
        subscription_dict["createdAt"] = subscription.created_at
        subscription_dict["updatedAt"] = subscription.updated_at
        subscription_dict["expiresAt"] = subscription.expires_at
        subscription_dict["mercadopagoPaymentId"] = subscription.mercadopago_payment_id
        
        del subscription_dict["user_id"]
        del subscription_dict["plan_type"] 
        del subscription_dict["created_at"]
        del subscription_dict["updated_at"]
        del subscription_dict["expires_at"]
        del subscription_dict["mercadopago_payment_id"]
        
        result = await self.collection.insert_one(subscription_dict)
        subscription.id = str(result.inserted_id)
        return subscription

    async def find_by_user_id(self, user_id: str) -> Optional[Subscription]:
        doc = await self.collection.find_one({"userId": ObjectId(user_id)})
        if doc:
            return self._doc_to_subscription(doc)
        return None

    async def find_by_id(self, subscription_id: str) -> Optional[Subscription]:
        doc = await self.collection.find_one({"_id": ObjectId(subscription_id)})
        if doc:
            return self._doc_to_subscription(doc)
        return None

    async def update(self, subscription_id: str, subscription: Subscription) -> bool:
        update_data = {
            "planType": subscription.plan_type,
            "status": subscription.status,
            "mercadopagoPaymentId": subscription.mercadopago_payment_id,
            "expiresAt": subscription.expires_at,
            "updatedAt": datetime.utcnow()
        }
        
        result = await self.collection.update_one(
            {"_id": ObjectId(subscription_id)},
            {"$set": update_data}
        )
        return result.modified_count > 0

    async def find_expired_subscriptions(self) -> List[Subscription]:
        now = datetime.utcnow()
        cursor = self.collection.find({
            "planType": "pro",
            "status": "active",
            "expiresAt": {"$lt": now}
        })
        
        subscriptions = []
        async for doc in cursor:
            subscriptions.append(self._doc_to_subscription(doc))
        return subscriptions

    def _doc_to_subscription(self, doc) -> Subscription:
        return Subscription(
            id=str(doc["_id"]),
            user_id=str(doc["userId"]),
            plan_type=doc.get("planType", "free"),
            status=doc.get("status", "active"),
            mercadopago_payment_id=doc.get("mercadopagoPaymentId"),
            expires_at=doc.get("expiresAt"),
            created_at=doc.get("createdAt", datetime.utcnow()),
            updated_at=doc.get("updatedAt", datetime.utcnow())
        )