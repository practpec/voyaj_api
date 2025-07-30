from src.trips.infrastructure.persistence.mongo_trip_repository import MongoTripRepository

class RespondToInvitation:
    def __init__(self):
        self.trip_repository = MongoTripRepository()

    async def execute(
        self,
        trip_id: str,
        user_id: str,
        accept: bool
    ) -> bool:
        trip = await self.trip_repository.find_by_id(trip_id)
        if not trip:
            raise ValueError("Trip not found")

        is_member = any(
            member.user_id == user_id
            for member in trip.members
        )

        if accept and not is_member:
            member_data = {
                "userId": user_id,
                "role": "viewer"
            }
            return await self.trip_repository.add_member(trip_id, member_data)
        elif not accept and is_member:
            return await self.trip_repository.remove_member(trip_id, user_id)
        
        return True