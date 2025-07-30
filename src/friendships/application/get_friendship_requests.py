from typing import List, Dict
from src.friendships.domain.friendship_invitation import FriendshipInvitation
from src.friendships.infrastructure.persistence.mongo_friendship_repository import MongoFriendshipRepository

class GetFriendshipRequests:
    def __init__(self):
        self.friendship_repository = MongoFriendshipRepository()

    async def execute(self, user_id: str) -> Dict[str, List[FriendshipInvitation]]:
        received_invitations = await self.friendship_repository.find_received_invitations(user_id)
        sent_invitations = await self.friendship_repository.find_sent_invitations(user_id)
        
        return {
            "received": received_invitations,
            "sent": sent_invitations
        }