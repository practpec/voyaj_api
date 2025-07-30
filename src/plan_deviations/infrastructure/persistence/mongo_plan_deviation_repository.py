from typing import Optional, List
from bson import ObjectId
from src.shared.infrastructure.database.mongo_client import get_database
from src.plan_deviations.domain.plan_deviation import PlanDeviation

class MongoPlanDeviationRepository:
    def __init__(self):
        self.db = get_database()
        self.collection = self.db.planRealityDeviations

    async def create(self, deviation: PlanDeviation) -> PlanDeviation:
        deviation_dict = deviation.dict(exclude={"id"})
        deviation_dict["tripId"] = ObjectId(deviation.trip_id)
        deviation_dict["dayId"] = ObjectId(deviation.day_id) if deviation.day_id else None
        deviation_dict["activityId"] = ObjectId(deviation.activity_id) if deviation.activity_id else None
        
        if "trip_id" in deviation_dict:
            del deviation_dict["trip_id"]
        if "day_id" in deviation_dict:
            del deviation_dict["day_id"]
        if "activity_id" in deviation_dict:
            del deviation_dict["activity_id"]
        
        result = await self.collection.insert_one(deviation_dict)
        deviation.id = str(result.inserted_id)
        return deviation

    async def find_by_id(self, deviation_id: str) -> Optional[PlanDeviation]:
        doc = await self.collection.find_one({"_id": ObjectId(deviation_id), "isDeleted": {"$ne": True}})
        if doc:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
            return PlanDeviation(**doc)
        return None

    async def find_by_trip_id(self, trip_id: str) -> List[PlanDeviation]:
        cursor = self.collection.find({
            "tripId": ObjectId(trip_id),
            "isDeleted": {"$ne": True}
        })
        
        deviations = []
        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            doc["trip_id"] = str(doc.get("tripId"))
            doc["day_id"] = str(doc.get("dayId")) if doc.get("dayId") else None
            doc["activity_id"] = str(doc.get("activityId")) if doc.get("activityId") else None
            
            del doc["_id"]
            if "tripId" in doc:
                del doc["tripId"]
            if "dayId" in doc:
                del doc["dayId"]
            if "activityId" in doc:
                del doc["activityId"]
                
            deviations.append(PlanDeviation(**doc))
        return deviations

    async def find_by_day_id(self, day_id: str) -> List[PlanDeviation]:
        cursor = self.collection.find({
            "dayId": ObjectId(day_id),
            "isDeleted": {"$ne": True}
        })
        
        deviations = []
        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
            deviations.append(PlanDeviation(**doc))
        return deviations

    async def find_by_activity_id(self, activity_id: str) -> List[PlanDeviation]:
        cursor = self.collection.find({
            "activityId": ObjectId(activity_id),
            "isDeleted": {"$ne": True}
        })
        
        deviations = []
        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
            deviations.append(PlanDeviation(**doc))
        return deviations

    async def update(self, deviation_id: str, update_data: dict) -> bool:
        result = await self.collection.update_one(
            {"_id": ObjectId(deviation_id)},
            {"$set": update_data}
        )
        return result.modified_count > 0

    async def delete(self, deviation_id: str) -> bool:
        result = await self.collection.update_one(
            {"_id": ObjectId(deviation_id)},
            {"$set": {"isDeleted": True}}
        )
        return result.modified_count > 0