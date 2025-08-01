from src.auth.domain.user import User
from src.auth.infrastructure.persistence.mongo_user_repository import MongoUserRepository
from src.shared.infrastructure.security.hashing import hash_password
from src.subscriptions.application.create_subscription import CreateSubscription
from src.subscriptions.domain.subscription_plan import SubscriptionPlan

class RegisterUser:
    def __init__(self):
        self.user_repository = MongoUserRepository()
        self.create_subscription = CreateSubscription()

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
        
        await self.create_subscription.execute(
            user_id=created_user.id,
            plan_type=SubscriptionPlan.EXPLORADOR
        )
        
        return created_user