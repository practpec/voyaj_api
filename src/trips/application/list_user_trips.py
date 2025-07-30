from typing import List
from src.trips.domain.trip import Trip
from src.trips.infrastructure.persistence.mongo_trip_repository import MongoTripRepository

class ListUserTrips:
    def __init__(self):
        self.trip_repository = MongoTripRepository()

    async def execute(self, user_id: str) -> List[Trip]:
        return await self.trip_repository.find_by_user_id(user_id)