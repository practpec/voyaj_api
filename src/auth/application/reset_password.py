from datetime import datetime
from src.auth.infrastructure.persistence.mongo_user_repository import MongoUserRepository
from src.shared.infrastructure.security.hashing import hash_password

class ResetPassword:
    def __init__(self):
        self.user_repository = MongoUserRepository()

    async def execute(self, email: str, token: str, new_password: str) -> bool:
        user = await self.user_repository.find_by_email(email)
        if not user:
            raise ValueError("User not found")

        if not user.reset_token:
            raise ValueError("No reset token found")

        if user.reset_token != token:
            raise ValueError("Invalid reset token")

        if user.reset_expires and user.reset_expires < datetime.utcnow():
            raise ValueError("Reset token expired")

        hashed_password = hash_password(new_password)

        update_data = {
            "password": hashed_password,
            "reset_token": None,
            "reset_expires": None
        }
        await self.user_repository.update(user.id, update_data)

        return True