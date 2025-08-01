from src.auth.domain.user import User
from src.auth.infrastructure.persistence.mongo_user_repository import MongoUserRepository
from src.shared.infrastructure.security.hashing import hash_password
from src.subscriptions.application.subscription_service import SubscriptionService

class RegisterUser:
    def __init__(self):
        self.user_repository = MongoUserRepository()
        self.subscription_service = SubscriptionService()

    async def execute(self, email: str, password: str, name: str) -> User:
        existing_user = await self.user_repository.find_by_email(email)
        if existing_user:
            raise ValueError("Email already registered")

        hashed_password = hash_password(password)
        
        user = User(
            email=email,
            password=hashed_password,
            name=name
        )
        
        created_user = await self.user_repository.create(user)
        await self.subscription_service.create_free_subscription(created_user.id)
        
        return created_user