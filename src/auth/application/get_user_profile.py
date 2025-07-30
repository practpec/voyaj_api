from src.auth.domain.user import User
from src.auth.infrastructure.persistence.mongo_user_repository import MongoUserRepository

class GetUserProfile:
    def __init__(self):
        self.user_repository = MongoUserRepository()

    async def execute(self, user_id: str) -> User:
        user = await self.user_repository.find_by_id(user_id)
        if not user:
            raise ValueError("User not found")
        
        return user