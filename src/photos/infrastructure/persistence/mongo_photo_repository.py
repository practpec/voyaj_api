from typing import Optional, List, Dict, Any
from bson import ObjectId
from src.shared.infrastructure.database.mongo_client import get_database
from src.photos.domain.photo import Photo

class MongoPhotoRepository:
    def __init__(self):
        self.db = get_database()
        self.collection = self.db.photos

    def _convert_doc_to_photo(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        """Convert MongoDB document to Photo-compatible dict"""
        converted = {
            "id": str(doc["_id"]),
            "trip_id": str(doc.get("tripId", "")),
            "user_id": str(doc.get("userId", "")),
            "file_url": doc.get("fileUrl", ""),
            "taken_at": doc.get("takenAt"),
            "location": doc.get("location"),
            "associated_day_id": str(doc.get("associatedDayId")) if doc.get("associatedDayId") else None,
            "associated_journal_entry_id": str(doc.get("associatedJournalEntryId")) if doc.get("associatedJournalEntryId") else None,
            "is_deleted": doc.get("isDeleted", False)
        }
        return converted

    async def create(self, photo: Photo) -> Photo:
        photo_dict = photo.dict(exclude={"id"})
        photo_dict["tripId"] = ObjectId(photo.trip_id)
        photo_dict["userId"] = ObjectId(photo.user_id)
        photo_dict["associatedDayId"] = ObjectId(photo.associated_day_id) if photo.associated_day_id else None
        photo_dict["associatedJournalEntryId"] = ObjectId(photo.associated_journal_entry_id) if photo.associated_journal_entry_id else None
        photo_dict["fileUrl"] = photo.file_url
        photo_dict["takenAt"] = photo.taken_at
        
        if "file_url" in photo_dict:
            del photo_dict["file_url"]
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
        doc: Optional[Dict[str, Any]] = await self.collection.find_one({"_id": ObjectId(photo_id), "isDeleted": {"$ne": True}})
        if doc:
            converted = self._convert_doc_to_photo(doc)
            return Photo(**converted)
        return None

    async def find_by_trip_id(self, trip_id: str) -> List[Photo]:
        cursor = self.collection.find({
            "tripId": ObjectId(trip_id),
            "isDeleted": {"$ne": True}
        }).sort("takenAt", -1)
        
        photos = []
        async for doc in cursor:
            converted = self._convert_doc_to_photo(doc)
            photos.append(Photo(**converted))
        return photos

    async def find_by_user_id(self, user_id: str) -> List[Photo]:
        cursor = self.collection.find({
            "userId": ObjectId(user_id),
            "isDeleted": {"$ne": True}
        }).sort("takenAt", -1)
        
        photos = []
        async for doc in cursor:
            converted = self._convert_doc_to_photo(doc)
            photos.append(Photo(**converted))
        return photos

    async def find_by_day_id(self, day_id: str) -> List[Photo]:
        cursor = self.collection.find({
            "associatedDayId": ObjectId(day_id),
            "isDeleted": {"$ne": True}
        }).sort("takenAt", -1)
        
        photos = []
        async for doc in cursor:
            converted = self._convert_doc_to_photo(doc)
            photos.append(Photo(**converted))
        return photos

    async def update(self, photo_id: str, update_data: dict) -> bool:
        result = await self.collection.update_one(
            {"_id": ObjectId(photo_id)},
            {"$set": update_data}
        )
        return result.modified_count > 0

    async def delete(self, photo_id: str) -> bool:
        result = await self.collection.delete_one(
            {"_id": ObjectId(photo_id)}
        )
        return result.deleted_count > 0

    async def soft_delete(self, photo_id: str) -> bool:
        result = await self.collection.update_one(
            {"_id": ObjectId(photo_id)},
            {"$set": {"isDeleted": True}}
        )
        return result.modified_count > 0