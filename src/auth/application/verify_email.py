from datetime import datetime
from src.auth.infrastructure.persistence.mongo_user_repository import MongoUserRepository

class VerifyEmail:
    def __init__(self):
        self.user_repository = MongoUserRepository()

    async def execute(self, email: str, token: str) -> bool:
        user = await self.user_repository.find_by_email(email)
        if not user:
            raise ValueError("User not found")

        if user.email_verified:
            raise ValueError("Email already verified")

        if not user.verification_token:
            raise ValueError("No verification token found")

        if user.verification_token != token:
            raise ValueError("Invalid verification token")

        if user.verification_expires and user.verification_expires < datetime.utcnow():
            raise ValueError("Verification token expired")

        update_data = {
            "email_verified": True,
            "verification_token": None,
            "verification_expires": None
        }
        await self.user_repository.update(user.id, update_data)

        return True