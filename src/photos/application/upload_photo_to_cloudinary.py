from datetime import datetime
from typing import Optional
from src.photos.domain.photo import Photo
from src.photos.infrastructure.persistence.mongo_photo_repository import MongoPhotoRepository
from src.trips.infrastructure.persistence.mongo_trip_repository import MongoTripRepository
from src.shared.infrastructure.services.file_storage_service import FileStorageService

class UploadPhotoToCloudinary:
    def __init__(self):
        self.photo_repository = MongoPhotoRepository()
        self.trip_repository = MongoTripRepository()
        self.file_storage_service = FileStorageService()

    async def execute(
        self,
        trip_id: str,
        user_id: str,
        file_bytes: bytes,
        filename: str,
        taken_at: Optional[datetime] = None,
        location: Optional[str] = None,
        associated_day_id: Optional[str] = None,
        associated_journal_entry_id: Optional[str] = None
    ) -> Photo:
        trip = await self.trip_repository.find_by_id(trip_id)
        if not trip:
            raise ValueError("Trip not found")

        is_member = any(
            member.user_id == user_id
            for member in trip.members
        )
        if not is_member:
            raise ValueError("User is not a trip member")

        photo = Photo(
            trip_id=trip_id,
            user_id=user_id,
            file_url="",
            taken_at=taken_at or datetime.utcnow(),
            location=location,
            associated_day_id=associated_day_id,
            associated_journal_entry_id=associated_journal_entry_id
        )

        created_photo = await self.photo_repository.create(photo)
        photo_id = created_photo.id

        try:
            cloudinary_url = await self.file_storage_service.upload_trip_photo(
                file_bytes=file_bytes,
                trip_id=trip_id,
                photo_id=photo_id
            )

            if not cloudinary_url:
                await self.photo_repository.delete(photo_id)
                raise ValueError("Failed to upload photo to Cloudinary")

            # CORRECCIÓN: Usar camelCase para MongoDB
            await self.photo_repository.update(photo_id, {"fileUrl": cloudinary_url})
            created_photo.file_url = cloudinary_url

            return created_photo

        except Exception as e:
            await self.photo_repository.delete(photo_id)
            raise ValueError(f"Failed to process photo upload: {str(e)}")