from src.photos.infrastructure.persistence.mongo_photo_repository import MongoPhotoRepository
from src.trips.infrastructure.persistence.mongo_trip_repository import MongoTripRepository

class DeletePhoto:
    def __init__(self):
        self.photo_repository = MongoPhotoRepository()
        self.trip_repository = MongoTripRepository()

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

        return await self.photo_repository.delete(photo_id)