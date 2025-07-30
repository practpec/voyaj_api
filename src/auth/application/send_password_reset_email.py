from src.auth.infrastructure.persistence.mongo_user_repository import MongoUserRepository
from src.shared.infrastructure.services.email_service import EmailService

class SendPasswordResetEmail:
    def __init__(self):
        self.user_repository = MongoUserRepository()
        self.email_service = EmailService()

    async def execute(self, email: str) -> bool:
        user = await self.user_repository.find_by_email(email)
        if not user:
            raise ValueError("User not found")

        token, expires_at = self.email_service.generate_reset_token()

        update_data = {
            "reset_token": token,
            "reset_expires": expires_at
        }
        await self.user_repository.update(user.id, update_data)

        email_sent = await self.email_service.send_password_reset_email(
            to_email=user.email,
            user_name=user.name,
            token=token
        )

        if not email_sent:
            raise ValueError("Failed to send password reset email")

        return True