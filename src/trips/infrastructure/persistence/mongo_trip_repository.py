from typing import Optional, List
from bson import ObjectId
from src.shared.infrastructure.database.mongo_client import get_database
from src.trips.domain.trip import Trip

class MongoTripRepository:
    def __init__(self):
        self.db = get_database()
        self.collection = self.db.trips

    async def create(self, trip: Trip) -> Trip:
        from datetime import datetime
        trip_dict = trip.dict(exclude={"id"})
        trip_dict["startDate"] = datetime.combine(trip.start_date, datetime.min.time())
        trip_dict["endDate"] = datetime.combine(trip.end_date, datetime.min.time())
        trip_dict["createdBy"] = ObjectId(trip.created_by)
        trip_dict["estimatedTotalBudget"] = float(trip.estimated_total_budget) if trip.estimated_total_budget else None
        trip_dict["createdAt"] = trip.created_at
        
        for day in trip_dict["days"]:
            day["_id"] = ObjectId(day["id"])
            day["date"] = datetime.combine(day["date"], datetime.min.time())
            del day["id"]
        
        if trip_dict.get("start_date"):
            del trip_dict["start_date"]
        if trip_dict.get("end_date"):
            del trip_dict["end_date"]
        if trip_dict.get("created_by"):
            del trip_dict["created_by"]
        if trip_dict.get("estimated_total_budget"):
            del trip_dict["estimated_total_budget"]
        if trip_dict.get("created_at"):
            del trip_dict["created_at"]
        
        for member in trip_dict["members"]:
            member["userId"] = ObjectId(member["user_id"])
            del member["user_id"]
        
        result = await self.collection.insert_one(trip_dict)
        trip.id = str(result.inserted_id)
        return trip

    async def find_by_id(self, trip_id: str) -> Optional[Trip]:
        doc = await self.collection.find_one({"_id": ObjectId(trip_id), "isDeleted": {"$ne": True}})
        if doc:
            doc["id"] = str(doc["_id"])
            doc["start_date"] = doc.get("startDate").date() if doc.get("startDate") else None
            doc["end_date"] = doc.get("endDate").date() if doc.get("endDate") else None
            doc["created_by"] = str(doc.get("createdBy"))
            doc["estimated_total_budget"] = doc.get("estimatedTotalBudget")
            doc["created_at"] = doc.get("createdAt")
            
            for member in doc.get("members", []):
                member["user_id"] = str(member.get("userId"))
                if "userId" in member:
                    del member["userId"]
            
            for day in doc.get("days", []):
                day["id"] = str(day.get("_id"))
                day["date"] = day.get("date").date() if day.get("date") else None
                if "_id" in day:
                    del day["_id"]
            
            del doc["_id"]
            if "startDate" in doc:
                del doc["startDate"]
            if "endDate" in doc:
                del doc["endDate"]
            if "createdBy" in doc:
                del doc["createdBy"]
            if "estimatedTotalBudget" in doc:
                del doc["estimatedTotalBudget"]
            if "createdAt" in doc:
                del doc["createdAt"]
                
            return Trip(**doc)
        return None

    async def find_by_user_id(self, user_id: str) -> List[Trip]:
        print(f"[DEBUG] Searching trips for user_id: {user_id}")
        print(f"[DEBUG] ObjectId conversion: {ObjectId(user_id)}")
        
        cursor = self.collection.find({
            "$or": [
                {"createdBy": ObjectId(user_id)},
                {"members.userId": ObjectId(user_id)}
            ],
            "isDeleted": {"$ne": True}
        })
        
        trips = []
        async for doc in cursor:
            print(f"[DEBUG] Found trip: {doc.get('title')} with members: {[str(m.get('userId')) for m in doc.get('members', [])]}")
            
            doc["id"] = str(doc["_id"])
            doc["start_date"] = doc.get("startDate").date() if doc.get("startDate") else None
            doc["end_date"] = doc.get("endDate").date() if doc.get("endDate") else None
            doc["created_by"] = str(doc.get("createdBy"))
            doc["estimated_total_budget"] = doc.get("estimatedTotalBudget")
            doc["created_at"] = doc.get("createdAt")
            
            for member in doc.get("members", []):
                member["user_id"] = str(member.get("userId"))
                if "userId" in member:
                    del member["userId"]
            
            for day in doc.get("days", []):
                day["id"] = str(day.get("_id"))
                day["date"] = day.get("date").date() if day.get("date") else None
                if "_id" in day:
                    del day["_id"]
                
                for activity in day.get("activities", []):
                    if "estimated_cost" in activity and activity["estimated_cost"] is not None:
                        activity["estimated_cost"] = float(activity["estimated_cost"])
            
            del doc["_id"]
            if "startDate" in doc:
                del doc["startDate"]
            if "endDate" in doc:
                del doc["endDate"]
            if "createdBy" in doc:
                del doc["createdBy"]
            if "estimatedTotalBudget" in doc:
                del doc["estimatedTotalBudget"]
            if "createdAt" in doc:
                del doc["createdAt"]
                
            trips.append(Trip(**doc))
        
        print(f"[DEBUG] Total trips found: {len(trips)}")
        return trips

    async def update(self, trip_id: str, update_data: dict) -> bool:
        result = await self.collection.update_one(
            {"_id": ObjectId(trip_id)},
            {"$set": update_data}
        )
        return result.modified_count > 0

    async def add_member(self, trip_id: str, member_data: dict) -> bool:
        # Convertir user_id a ObjectId antes de insertar
        if "userId" in member_data:
            member_data["userId"] = ObjectId(member_data["userId"])
        elif "user_id" in member_data:
            member_data["userId"] = ObjectId(member_data["user_id"])
            del member_data["user_id"]
            
        result = await self.collection.update_one(
            {"_id": ObjectId(trip_id)},
            {"$push": {"members": member_data}}
        )
        return result.modified_count > 0

    async def remove_member(self, trip_id: str, user_id: str) -> bool:
        result = await self.collection.update_one(
            {"_id": ObjectId(trip_id)},
            {"$pull": {"members": {"userId": ObjectId(user_id)}}}
        )
        return result.modified_count > 0

    async def add_day(self, trip_id: str, day_data: dict) -> bool:
        result = await self.collection.update_one(
            {"_id": ObjectId(trip_id)},
            {"$push": {"days": day_data}}
        )
        return result.modified_count > 0

    async def update_day(self, trip_id: str, day_id: str, day_data: dict) -> bool:
        result = await self.collection.update_one(
            {"_id": ObjectId(trip_id), "days._id": ObjectId(day_id)},
            {"$set": {"days.$": day_data}}
        )
        return result.modified_count > 0

    async def delete(self, trip_id: str) -> bool:
        result = await self.collection.update_one(
            {"_id": ObjectId(trip_id)},
            {"$set": {"isDeleted": True}}
        )
        return result.modified_count > 0