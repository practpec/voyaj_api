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
            "file_url": doc.get("fileUrl", ""),  # Mapeo correcto: fileUrl -> file_url
            "taken_at": doc.get("takenAt"),
            "location": doc.get("location"),
            "associated_day_id": str(doc.get("associatedDayId")) if doc.get("associatedDayId") else None,
            "associated_journal_entry_id": str(doc.get("associatedJournalEntryId")) if doc.get("associatedJournalEntryId") else None,
            "is_deleted": doc.get("isDeleted", False)
        }
        return converted

    def _map_update_fields(self, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """Map snake_case fields to camelCase for MongoDB"""
        field_mapping = {
            "file_url": "fileUrl",
            "trip_id": "tripId",
            "user_id": "userId",
            "taken_at": "takenAt",
            "associated_day_id": "associatedDayId",
            "associated_journal_entry_id": "associatedJournalEntryId",
            "is_deleted": "isDeleted"
        }
        
        mapped_data = {}
        for key, value in update_data.items():
            mapped_key = field_mapping.get(key, key)
            
            # Convertir ObjectIds si es necesario
            if key in ["trip_id", "user_id", "associated_day_id", "associated_journal_entry_id"] and value:
                if isinstance(value, str) and len(value) == 24:  # ObjectId string
                    mapped_data[mapped_key] = ObjectId(value)
                else:
                    mapped_data[mapped_key] = value
            else:
                mapped_data[mapped_key] = value
                
        return mapped_data

    async def create(self, photo: Photo) -> Photo:
        photo_dict = photo.dict(exclude={"id"})
        photo_dict["tripId"] = ObjectId(photo.trip_id)
        photo_dict["userId"] = ObjectId(photo.user_id)
        photo_dict["associatedDayId"] = ObjectId(photo.associated_day_id) if photo.associated_day_id else None
        photo_dict["associatedJournalEntryId"] = ObjectId(photo.associated_journal_entry_id) if photo.associated_journal_entry_id else None
        photo_dict["fileUrl"] = photo.file_url
        photo_dict["takenAt"] = photo.taken_at
        
        # Limpiar campos duplicados
        fields_to_remove = ["file_url", "trip_id", "user_id", "associated_day_id", "associated_journal_entry_id", "taken_at"]
        for field in fields_to_remove:
            photo_dict.pop(field, None)
        
        result = await self.collection.insert_one(photo_dict)
        photo.id = str(result.inserted_id)
        return photo

    async def find_by_id(self, photo_id: str) -> Optional[Photo]:
        doc: Optional[Dict[str, Any]] = await self.collection.find_one({
            "_id": ObjectId(photo_id), 
            "isDeleted": {"$ne": True}
        })
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
        # Mapear campos automáticamente
        mapped_data = self._map_update_fields(update_data)
        
        result = await self.collection.update_one(
            {"_id": ObjectId(photo_id)},
            {"$set": mapped_data}
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