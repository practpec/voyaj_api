from src.auth.domain.user import User
from src.auth.infrastructure.persistence.mongo_user_repository import MongoUserRepository
from src.shared.infrastructure.security.hashing import hash_password

class RegisterUser:
    def __init__(self):
        self.user_repository = MongoUserRepository()

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
        
        return await self.user_repository.create(user)