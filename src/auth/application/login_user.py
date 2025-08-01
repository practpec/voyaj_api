from datetime import datetime
from src.auth.infrastructure.persistence.mongo_user_repository import MongoUserRepository
from src.shared.infrastructure.security.hashing import verify_password
from src.shared.infrastructure.security.authentication import create_access_token, create_refresh_token

class LoginUser:
    def __init__(self):
        self.user_repository = MongoUserRepository()

    async def execute(self, email: str, password: str) -> dict:
        user = await self.user_repository.find_by_email(email)
        if not user or not verify_password(password, user.password):
            raise ValueError("Invalid credentials")

        await self.user_repository.update(user.id, {"lastLoginAt": datetime.utcnow()})

        token_data = {"sub": user.id, "email": user.email}
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "profile_photo_url": user.profile_photo_url,
                "email_verified": user.email_verified
            },
            
        }