from src.photos.domain.photo import Photo
from src.photos.infrastructure.persistence.mongo_photo_repository import MongoPhotoRepository
from src.trips.infrastructure.persistence.mongo_trip_repository import MongoTripRepository

class GetPhotoDetails:
    def __init__(self):
        self.photo_repository = MongoPhotoRepository()
        self.trip_repository = MongoTripRepository()

    async def execute(self, photo_id: str, user_id: str) -> Photo:
        photo = await self.photo_repository.find_by_id(photo_id)
        if not photo:
            raise ValueError("Photo not found")

        trip = await self.trip_repository.find_by_id(photo.trip_id)
        if not trip:
            raise ValueError("Trip not found")

        is_member = any(
            member.user_id == user_id
            for member in trip.members
        )
        if not is_member and not trip.is_public:
            raise ValueError("User not authorized to view this photo")

        return photo