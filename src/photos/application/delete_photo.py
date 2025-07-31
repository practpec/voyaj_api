from src.photos.infrastructure.persistence.mongo_photo_repository import MongoPhotoRepository
from src.trips.infrastructure.persistence.mongo_trip_repository import MongoTripRepository
from src.shared.infrastructure.services.file_storage_service import FileStorageService

class DeletePhoto:
    def __init__(self):
        self.photo_repository = MongoPhotoRepository()
        self.trip_repository = MongoTripRepository()
        self.file_storage_service = FileStorageService()

    async def execute(self, photo_id: str, user_id: str) -> bool:
        photo = await self.photo_repository.find_by_id(photo_id)
        if not photo:
            raise ValueError("Photo not found")

        trip = await self.trip_repository.find_by_id(photo.trip_id)
        if not trip:
            raise ValueError("Trip not found")

        user_role = None
        for member in trip.members:
            if member.user_id == user_id:
                user_role = member.role
                break

        if user_role not in ["owner", "editor"] and photo.user_id != user_id:
            raise ValueError("User not authorized to delete this photo")

        if photo.file_url and "cloudinary" in photo.file_url:
            await self.file_storage_service.delete_trip_photo(
                trip_id=photo.trip_id,
                photo_id=photo_id
            )

        await self.photo_repository.delete(photo_id)

        return True