from typing import Optional, List
from bson import ObjectId
from src.shared.infrastructure.database.mongo_client import get_database
from src.photos.domain.photo import Photo

class MongoPhotoRepository:
    def __init__(self):
        self.db = get_database()
        self.collection = self.db.photos

    async def create(self, photo: Photo) -> Photo:
        photo_dict = photo.dict(exclude={"id"})
        photo_dict["tripId"] = ObjectId(photo.trip_id)
        photo_dict["userId"] = ObjectId(photo.user_id)
        photo_dict["associatedDayId"] = ObjectId(photo.associated_day_id) if photo.associated_day_id else None
        photo_dict["associatedJournalEntryId"] = ObjectId(photo.associated_journal_entry_id) if photo.associated_journal_entry_id else None
        photo_dict["takenAt"] = photo.taken_at
        
        if "trip_id" in photo_dict:
            del photo_dict["trip_id"]
        if "user_id" in photo_dict:
            del photo_dict["user_id"]
        if "associated_day_id" in photo_dict:
            del photo_dict["associated_day_id"]
        if "associated_journal_entry_id" in photo_dict:
            del photo_dict["associated_journal_entry_id"]
        if "taken_at" in photo_dict:
            del photo_dict["taken_at"]
        
        result = await self.collection.insert_one(photo_dict)
        photo.id = str(result.inserted_id)
        return photo

    async def find_by_id(self, photo_id: str) -> Optional[Photo]:
        doc = await self.collection.find_one({"_id": ObjectId(photo_id), "isDeleted": {"$ne": True}})
        if doc:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
            return Photo(**doc)
        return None

    async def find_by_trip_id(self, trip_id: str) -> List[Photo]:
        cursor = self.collection.find({
            "tripId": ObjectId(trip_id),
            "isDeleted": {"$ne": True}
        }).sort("takenAt", -1)
        
        photos = []
        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            doc["trip_id"] = str(doc.get("tripId"))
            doc["user_id"] = str(doc.get("userId"))
            doc["associated_day_id"] = str(doc.get("associatedDayId")) if doc.get("associatedDayId") else None
            doc["associated_journal_entry_id"] = str(doc.get("associatedJournalEntryId")) if doc.get("associatedJournalEntryId") else None
            doc["taken_at"] = doc.get("takenAt")
            
            del doc["_id"]
            if "tripId" in doc:
                del doc["tripId"]
            if "userId" in doc:
                del doc["userId"]
            if "associatedDayId" in doc:
                del doc["associatedDayId"]
            if "associatedJournalEntryId" in doc:
                del doc["associatedJournalEntryId"]
            if "takenAt" in doc:
                del doc["takenAt"]
                
            photos.append(Photo(**doc))
        return photos

    async def find_by_user_id(self, user_id: str) -> List[Photo]:
        cursor = self.collection.find({
            "userId": ObjectId(user_id),
            "isDeleted": {"$ne": True}
        }).sort("takenAt", -1)
        
        photos = []
        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
            photos.append(Photo(**doc))
        return photos

    async def find_by_day_id(self, day_id: str) -> List[Photo]:
        cursor = self.collection.find({
            "associatedDayId": ObjectId(day_id),
            "isDeleted": {"$ne": True}
        }).sort("takenAt", -1)
        
        photos = []
        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
            photos.append(Photo(**doc))
        return photos

    async def update(self, photo_id: str, update_data: dict) -> bool:
        result = await self.collection.update_one(
            {"_id": ObjectId(photo_id)},
            {"$set": update_data}
        )
        return result.modified_count > 0

    async def delete(self, photo_id: str) -> bool:
        result = await self.collection.update_one(
            {"_id": ObjectId(photo_id)},
            {"$set": {"isDeleted": True}}
        )
        return result.modified_count > 0