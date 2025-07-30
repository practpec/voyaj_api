from typing import Optional, List
from bson import ObjectId
from src.shared.infrastructure.database.mongo_client import get_database
from src.auth.domain.user import User

class MongoUserRepository:
    def __init__(self):
        self.db = get_database()
        self.collection = self.db.users

    async def create(self, user: User) -> User:
        user_dict = user.dict(exclude={"id"})
        result = await self.collection.insert_one(user_dict)
        user.id = str(result.inserted_id)
        return user

    async def find_by_id(self, user_id: str) -> Optional[User]:
        doc = await self.collection.find_one({"_id": ObjectId(user_id), "isDeleted": {"$ne": True}})
        if doc:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
            return User(**doc)
        return None

    async def find_by_email(self, email: str) -> Optional[User]:
        doc = await self.collection.find_one({"email": email, "isDeleted": {"$ne": True}})
        if doc:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
            return User(**doc)
        return None

    async def update(self, user_id: str, update_data: dict) -> bool:
        result = await self.collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_data}
        )
        return result.modified_count > 0

    async def add_friend(self, user_id: str, friend_data: dict) -> bool:
        result = await self.collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$push": {"friends": friend_data}}
        )
        return result.modified_count > 0

    async def remove_friend(self, user_id: str, friend_id: str) -> bool:
        result = await self.collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$pull": {"friends": {"userId": ObjectId(friend_id)}}}
        )
        return result.modified_count > 0

    async def search_by_email_pattern(self, pattern: str) -> List[User]:
        cursor = self.collection.find({
            "email": {"$regex": pattern, "$options": "i"},
            "isDeleted": {"$ne": True}
        }).limit(10)
        
        users = []
        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
            users.append(User(**doc))
        return users