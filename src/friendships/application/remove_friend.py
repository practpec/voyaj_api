from src.auth.infrastructure.persistence.mongo_user_repository import MongoUserRepository

class RemoveFriend:
    def __init__(self):
        self.user_repository = MongoUserRepository()

    async def execute(self, user_id: str, friend_id: str) -> bool:
        user = await self.user_repository.find_by_id(user_id)
        if not user:
            raise ValueError("User not found")

        friend = await self.user_repository.find_by_id(friend_id)
        if not friend:
            raise ValueError("Friend not found")

        is_friend = any(f.user_id == friend_id for f in user.friends)
        if not is_friend:
            raise ValueError("Users are not friends")

        await self.user_repository.remove_friend(user_id, friend_id)
        await self.user_repository.remove_friend(friend_id, user_id)

        return True