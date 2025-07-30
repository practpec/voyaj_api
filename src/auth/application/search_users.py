from typing import List
from src.auth.domain.user import User
from src.auth.infrastructure.persistence.mongo_user_repository import MongoUserRepository

class SearchUsers:
    def __init__(self):
        self.user_repository = MongoUserRepository()

    async def execute(self, query: str, current_user_id: str) -> List[User]:
        if not query or len(query) < 2:
            raise ValueError("Query must be at least 2 characters")

        users = await self.user_repository.search_by_email_pattern(query)
        
        return [user for user in users if user.id != current_user_id]