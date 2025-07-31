from src.auth.infrastructure.persistence.mongo_user_repository import MongoUserRepository
from src.shared.infrastructure.services.file_storage_service import FileStorageService

class UploadProfilePhoto:
    def __init__(self):
        self.user_repository = MongoUserRepository()
        self.file_storage_service = FileStorageService()

    async def execute(self, user_id: str, file_bytes: bytes, filename: str) -> str:
        user = await self.user_repository.find_by_id(user_id)
        if not user:
            raise ValueError("User not found")

        if user.profile_photo_url:
            await self._delete_existing_photo(user_id, user.profile_photo_url)

        new_photo_url = await self.file_storage_service.upload_profile_photo(
            file_bytes=file_bytes,
            user_id=user_id
        )

        if not new_photo_url:
            raise ValueError("Failed to upload profile photo")

        await self.user_repository.update(user_id, {"profile_photo_url": new_photo_url})

        return new_photo_url

    async def _delete_existing_photo(self, user_id: str, photo_url: str) -> None:
        if "cloudinary" in photo_url:
            await self.file_storage_service.delete_profile_photo(user_id)