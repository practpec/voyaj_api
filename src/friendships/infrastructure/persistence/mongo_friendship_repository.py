from typing import Optional, List
from bson import ObjectId
from datetime import datetime
from src.shared.infrastructure.database.mongo_client import get_database
from src.friendships.domain.friendship_invitation import FriendshipInvitation

class MongoFriendshipRepository:
    def __init__(self):
        self.db = get_database()
        self.collection = self.db.friendshipInvitations

    async def create(self, invitation: FriendshipInvitation) -> FriendshipInvitation:
        invitation_dict = invitation.dict(exclude={"id"})
        invitation_dict["senderId"] = ObjectId(invitation.sender_id)
        invitation_dict["recipientId"] = ObjectId(invitation.recipient_id)
        invitation_dict["sentAt"] = invitation.sent_at
        invitation_dict["respondedAt"] = invitation.responded_at
        
        if "sender_id" in invitation_dict:
            del invitation_dict["sender_id"]
        if "recipient_id" in invitation_dict:
            del invitation_dict["recipient_id"]
        if "sent_at" in invitation_dict:
            del invitation_dict["sent_at"]
        if "responded_at" in invitation_dict:
            del invitation_dict["responded_at"]
        
        result = await self.collection.insert_one(invitation_dict)
        invitation.id = str(result.inserted_id)
        return invitation

    async def find_by_id(self, invitation_id: str) -> Optional[FriendshipInvitation]:
        doc = await self.collection.find_one({"_id": ObjectId(invitation_id)})
        if doc:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
            return FriendshipInvitation(**doc)
        return None

    async def find_existing_invitation(self, sender_id: str, recipient_id: str) -> Optional[FriendshipInvitation]:
        doc = await self.collection.find_one({
            "$or": [
                {"senderId": ObjectId(sender_id), "recipientId": ObjectId(recipient_id)},
                {"senderId": ObjectId(recipient_id), "recipientId": ObjectId(sender_id)}
            ],
            "status": {"$in": ["pending", "accepted"]}
        })
        if doc:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
            return FriendshipInvitation(**doc)
        return None

    async def find_received_invitations(self, user_id: str) -> List[FriendshipInvitation]:
        cursor = self.collection.find({
            "recipientId": ObjectId(user_id),
            "status": "pending"
        }).sort("sentAt", -1)
        
        invitations = []
        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
            invitations.append(FriendshipInvitation(**doc))
        return invitations

    async def find_sent_invitations(self, user_id: str) -> List[FriendshipInvitation]:
        cursor = self.collection.find({
            "senderId": ObjectId(user_id),
            "status": "pending"
        }).sort("sentAt", -1)
        
        invitations = []
        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
            invitations.append(FriendshipInvitation(**doc))
        return invitations

    async def update_status(self, invitation_id: str, status: str) -> bool:
        result = await self.collection.update_one(
            {"_id": ObjectId(invitation_id)},
            {"$set": {"status": status, "respondedAt": datetime.utcnow()}}
        )
        return result.modified_count > 0