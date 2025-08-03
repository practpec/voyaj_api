from typing import List
from src.photos.domain.photo import Photo
from src.photos.infrastructure.persistence.mongo_photo_repository import MongoPhotoRepository
from src.trips.infrastructure.persistence.mongo_trip_repository import MongoTripRepository

class ListTripPhotos:
    def __init__(self):
        self.photo_repository = MongoPhotoRepository()
        self.trip_repository = MongoTripRepository()

    async def execute(self, trip_id: str, user_id: str) -> List[Photo]:
        trip = await self.trip_repository.find_by_id(trip_id)
        if not trip:
            raise ValueError("Trip not found")

        is_member = any(
            member.user_id == user_id
            for member in trip.members
        )
        if not is_member and not trip.is_public:
            raise ValueError("User not authorized to view trip photos")

        photos = await self.photo_repository.find_by_trip_id(trip_id)
        
        # Filtrar fotos sin file_url válido para debugging
        valid_photos = []
        for photo in photos:
            if photo.file_url and photo.file_url.strip():
                valid_photos.append(photo)
            else:
                # Log para debugging
                print(f"[DEBUG] Photo {photo.id} has empty file_url, skipping")
        
        return valid_photos