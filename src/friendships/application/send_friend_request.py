from src.friendships.domain.friendship_invitation import FriendshipInvitation
from src.friendships.infrastructure.persistence.mongo_friendship_repository import MongoFriendshipRepository
from src.auth.infrastructure.persistence.mongo_user_repository import MongoUserRepository

class SendFriendRequest:
    def __init__(self):
        self.friendship_repository = MongoFriendshipRepository()
        self.user_repository = MongoUserRepository()

    async def execute(
        self,
        sender_id: str,
        recipient_id: str,
        message: str = None
    ) -> FriendshipInvitation:
        if sender_id == recipient_id:
            raise ValueError("Cannot send friend request to yourself")

        recipient = await self.user_repository.find_by_id(recipient_id)
        if not recipient:
            raise ValueError("Recipient user not found")

        existing_invitation = await self.friendship_repository.find_existing_invitation(
            sender_id, recipient_id
        )
        if existing_invitation:
            if existing_invitation.status == "pending":
                raise ValueError("Friend request already pending")
            elif existing_invitation.status == "accepted":
                raise ValueError("Users are already friends")

        invitation = FriendshipInvitation(
            sender_id=sender_id,
            recipient_id=recipient_id,
            message=message
        )

        return await self.friendship_repository.create(invitation)