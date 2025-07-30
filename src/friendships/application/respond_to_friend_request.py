from datetime import datetime
from src.friendships.infrastructure.persistence.mongo_friendship_repository import MongoFriendshipRepository
from src.auth.infrastructure.persistence.mongo_user_repository import MongoUserRepository

class RespondToFriendRequest:
    def __init__(self):
        self.friendship_repository = MongoFriendshipRepository()
        self.user_repository = MongoUserRepository()

    async def execute(
        self,
        invitation_id: str,
        user_id: str,
        accept: bool
    ) -> bool:
        invitation = await self.friendship_repository.find_by_id(invitation_id)
        if not invitation:
            raise ValueError("Invitation not found")

        if invitation.recipient_id != user_id:
            raise ValueError("User not authorized to respond to this invitation")

        if invitation.status != "pending":
            raise ValueError("Invitation is no longer pending")

        status = "accepted" if accept else "rejected"
        await self.friendship_repository.update_status(invitation_id, status)

        if accept:
            friendship_date = datetime.utcnow()
            
            sender_friend_data = {
                "userId": invitation.recipient_id,
                "friendshipDate": friendship_date
            }
            recipient_friend_data = {
                "userId": invitation.sender_id,
                "friendshipDate": friendship_date
            }

            await self.user_repository.add_friend(invitation.sender_id, sender_friend_data)
            await self.user_repository.add_friend(invitation.recipient_id, recipient_friend_data)

        return True