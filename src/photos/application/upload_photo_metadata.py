from datetime import datetime
from src.photos.domain.photo import Photo
from src.photos.infrastructure.persistence.mongo_photo_repository import MongoPhotoRepository
from src.trips.infrastructure.persistence.mongo_trip_repository import MongoTripRepository

class UploadPhotoMetadata:
    def __init__(self):
        self.photo_repository = MongoPhotoRepository()
        self.trip_repository = MongoTripRepository()

    async def execute(
        self,
        trip_id: str,
        user_id: str,
        file_url: str,
        taken_at: datetime = None,
        location: str = None,
        associated_day_id: str = None,
        associated_journal_entry_id: str = None
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
            file_url=file_url,
            taken_at=taken_at or datetime.utcnow(),
            location=location,
            associated_day_id=associated_day_id,
            associated_journal_entry_id=associated_journal_entry_id
        )

        return await self.photo_repository.create(photo)