from src.trips.infrastructure.persistence.mongo_trip_repository import MongoTripRepository

class DeleteTrip:
    def __init__(self):
        self.trip_repository = MongoTripRepository()

    async def execute(self, trip_id: str, user_id: str) -> bool:
        trip = await self.trip_repository.find_by_id(trip_id)
        if not trip:
            raise ValueError("Trip not found")

        is_owner = any(
            member.user_id == user_id and member.role == "owner"
            for member in trip.members
        )
        if not is_owner:
            raise ValueError("Only trip owner can delete the trip")

        return await self.trip_repository.delete(trip_id)