from typing import Dict, List
from src.photos.domain.photo import Photo
from src.photos.infrastructure.persistence.mongo_photo_repository import MongoPhotoRepository
from src.trips.infrastructure.persistence.mongo_trip_repository import MongoTripRepository

class ListPhotosByDay:
    def __init__(self):
        self.photo_repository = MongoPhotoRepository()
        self.trip_repository = MongoTripRepository()

    async def execute(self, trip_id: str, user_id: str) -> Dict[str, List[Photo]]:
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
        
        photos_by_day = {}
        
        for day in trip.days:
            day_date = day.date.strftime("%Y-%m-%d")
            photos_by_day[day_date] = []

        unassigned_photos = []
        
        for photo in photos:
            if photo.associated_day_id:
                day_found = False
                for day in trip.days:
                    if day.id == photo.associated_day_id:
                        day_date = day.date.strftime("%Y-%m-%d")
                        photos_by_day[day_date].append(photo)
                        day_found = True
                        break
                if not day_found:
                    unassigned_photos.append(photo)
            else:
                unassigned_photos.append(photo)
        
        if unassigned_photos:
            photos_by_day["unassigned"] = unassigned_photos

        return photos_by_day