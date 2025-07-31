from typing import Optional, List, Dict, Any
from bson import ObjectId
from datetime import datetime
from src.shared.infrastructure.database.mongo_client import get_database
from src.auth.domain.user import User

class MongoUserRepository:
    def __init__(self):
        self.db = get_database()
        self.collection = self.db.users

    def _convert_doc_to_user(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        """Convert MongoDB document to User-compatible dict"""
        converted = {
            "id": str(doc["_id"]),
            "email": doc.get("email", ""),
            "password": doc.get("password", ""),
            "name": doc.get("name", ""),
            "profile_photo_url": doc.get("profilePhotoUrl"),
            "last_login_at": doc.get("lastLoginAt"),
            "email_verified": doc.get("emailVerified", False),
            "verification_token": doc.get("verification_token"),
            "verification_expires": doc.get("verification_expires"),
            "reset_token": doc.get("reset_token"),
            "reset_expires": doc.get("reset_expires"),
            "is_deleted": doc.get("isDeleted", False),
            "created_at": doc.get("createdAt", datetime.utcnow())
        }
        
        # Convert friends array
        friends_converted = []
        for friend in doc.get("friends", []):
            friend_data = {
                "user_id": str(friend.get("userId", "")),
                "friendship_date": friend.get("friendshipDate", datetime.utcnow())
            }
            friends_converted.append(friend_data)
        converted["friends"] = friends_converted
        
        return converted

    async def create(self, user: User) -> User:
        user_dict = user.dict(exclude={"id"})
        
        # Convert friends to MongoDB format
        if "friends" in user_dict:
            friends_mongo = []
            for friend in user_dict["friends"]:
                friend_mongo = {
                    "userId": ObjectId(friend["user_id"]),
                    "friendshipDate": friend["friendship_date"]
                }
                friends_mongo.append(friend_mongo)
            user_dict["friends"] = friends_mongo
        
        # Convert field names to MongoDB format
        if "profile_photo_url" in user_dict:
            user_dict["profilePhotoUrl"] = user_dict["profile_photo_url"]
            del user_dict["profile_photo_url"]
        if "last_login_at" in user_dict:
            user_dict["lastLoginAt"] = user_dict["last_login_at"]
            del user_dict["last_login_at"]
        if "email_verified" in user_dict:
            user_dict["emailVerified"] = user_dict["email_verified"]
            del user_dict["email_verified"]
        if "is_deleted" in user_dict:
            user_dict["isDeleted"] = user_dict["is_deleted"]
            del user_dict["is_deleted"]
        if "created_at" in user_dict:
            user_dict["createdAt"] = user_dict["created_at"]
            del user_dict["created_at"]
        
        result = await self.collection.insert_one(user_dict)
        user.id = str(result.inserted_id)
        return user

    async def find_by_id(self, user_id: str) -> Optional[User]:
        doc: Optional[Dict[str, Any]] = await self.collection.find_one({"_id": ObjectId(user_id), "isDeleted": {"$ne": True}})
        if doc:
            converted = self._convert_doc_to_user(doc)
            return User(**converted)
        return None

    async def find_by_email(self, email: str) -> Optional[User]:
        doc: Optional[Dict[str, Any]] = await self.collection.find_one({"email": email, "isDeleted": {"$ne": True}})
        if doc:
            converted = self._convert_doc_to_user(doc)
            return User(**converted)
        return None

    async def update(self, user_id: str, update_data: dict) -> bool:
        # Convert field names to MongoDB format if needed
        mongo_update_data = {}
        for key, value in update_data.items():
            if key == "profile_photo_url":
                mongo_update_data["profilePhotoUrl"] = value
            elif key == "last_login_at":
                mongo_update_data["lastLoginAt"] = value
            elif key == "email_verified":
                mongo_update_data["emailVerified"] = value
            elif key == "is_deleted":
                mongo_update_data["isDeleted"] = value
            else:
                mongo_update_data[key] = value
        
        result = await self.collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": mongo_update_data}
        )
        return result.modified_count > 0

    async def add_friend(self, user_id: str, friend_data: dict) -> bool:
        # Convert friend data to MongoDB format
        friend_mongo = {
            "userId": ObjectId(friend_data["userId"]),
            "friendshipDate": friend_data["friendshipDate"]
        }
        
        result = await self.collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$push": {"friends": friend_mongo}}
        )
        return result.modified_count > 0

    async def remove_friend(self, user_id: str, friend_id: str) -> bool:
        # Try both ObjectId and string formats since data might be inconsistent
        result = await self.collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$pull": {"friends": {"$or": [
                {"userId": ObjectId(friend_id)},
                {"userId": friend_id}
            ]}}}
        )
        
        # If the $or approach doesn't work, try individual queries
        if result.modified_count == 0:
            result = await self.collection.update_one(
                {"_id": ObjectId(user_id)},
                {"$pull": {"friends": {"userId": friend_id}}}
            )
        
        return result.modified_count > 0

    async def search_by_email_pattern(self, pattern: str) -> List[User]:
        cursor = self.collection.find({
            "email": {"$regex": pattern, "$options": "i"},
            "isDeleted": {"$ne": True}
        }).limit(10)
        
        users = []
        async for doc in cursor:
            converted = self._convert_doc_to_user(doc)
            users.append(User(**converted))
        return users