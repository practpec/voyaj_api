from typing import Optional, List
from bson import ObjectId
from datetime import datetime
from src.shared.infrastructure.database.mongo_client import get_database
from src.journal_entries.domain.journal_entry import JournalEntry

class MongoJournalEntryRepository:
    def __init__(self):
        self.db = get_database()
        self.collection = self.db.journalEntries

    async def create(self, entry: JournalEntry) -> JournalEntry:
        entry_dict = entry.dict(exclude={"id"})
        entry_dict["tripId"] = ObjectId(entry.trip_id)
        entry_dict["dayId"] = ObjectId(entry.day_id)
        entry_dict["userId"] = ObjectId(entry.user_id)
        entry_dict["createdAt"] = entry.created_at
        entry_dict["modifiedAt"] = entry.modified_at
        
        if "trip_id" in entry_dict:
            del entry_dict["trip_id"]
        if "day_id" in entry_dict:
            del entry_dict["day_id"]
        if "user_id" in entry_dict:
            del entry_dict["user_id"]
        if "created_at" in entry_dict:
            del entry_dict["created_at"]
        if "modified_at" in entry_dict:
            del entry_dict["modified_at"]
        
        result = await self.collection.insert_one(entry_dict)
        entry.id = str(result.inserted_id)
        return entry

    async def find_by_id(self, entry_id: str) -> Optional[JournalEntry]:
        doc = await self.collection.find_one({"_id": ObjectId(entry_id), "isDeleted": {"$ne": True}})
        if doc:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
            return JournalEntry(**doc)
        return None

    async def find_by_trip_id(self, trip_id: str) -> List[JournalEntry]:
        cursor = self.collection.find({
            "tripId": ObjectId(trip_id),
            "isDeleted": {"$ne": True}
        }).sort("createdAt", -1)
        
        entries = []
        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            doc["trip_id"] = str(doc.get("tripId"))
            doc["day_id"] = str(doc.get("dayId"))
            doc["user_id"] = str(doc.get("userId"))
            doc["created_at"] = doc.get("createdAt")
            doc["modified_at"] = doc.get("modifiedAt")
            
            del doc["_id"]
            if "tripId" in doc:
                del doc["tripId"]
            if "dayId" in doc:
                del doc["dayId"]
            if "userId" in doc:
                del doc["userId"]
            if "createdAt" in doc:
                del doc["createdAt"]
            if "modifiedAt" in doc:
                del doc["modifiedAt"]
                
            entries.append(JournalEntry(**doc))
        return entries

    async def find_by_user_id(self, user_id: str) -> List[JournalEntry]:
        cursor = self.collection.find({
            "userId": ObjectId(user_id),
            "isDeleted": {"$ne": True}
        }).sort("createdAt", -1)
        
        entries = []
        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
            entries.append(JournalEntry(**doc))
        return entries

    async def find_by_day_id(self, day_id: str) -> List[JournalEntry]:
        cursor = self.collection.find({
            "dayId": ObjectId(day_id),
            "isDeleted": {"$ne": True}
        }).sort("createdAt", -1)
        
        entries = []
        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
            entries.append(JournalEntry(**doc))
        return entries

    async def update(self, entry_id: str, update_data: dict) -> bool:
        update_data["modifiedAt"] = datetime.utcnow()
        result = await self.collection.update_one(
            {"_id": ObjectId(entry_id)},
            {"$set": update_data}
        )
        return result.modified_count > 0

    async def delete(self, entry_id: str) -> bool:
        result = await self.collection.update_one(
            {"_id": ObjectId(entry_id)},
            {"$set": {"isDeleted": True}}
        )
        return result.modified_count > 0