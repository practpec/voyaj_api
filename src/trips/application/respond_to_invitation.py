from bson import ObjectId
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
            # Usar directamente la colección para insertar con ObjectId correcto
            result = await self.trip_repository.collection.update_one(
                {"_id": ObjectId(trip_id)},
                {"$push": {"members": {
                    "userId": ObjectId(user_id),
                    "role": "viewer",
                    "private_notes": None
                }}}
            )
            return result.modified_count > 0
        elif not accept and is_member:
            # Remover miembro usando ObjectId
            result = await self.trip_repository.collection.update_one(
                {"_id": ObjectId(trip_id)},
                {"$pull": {"members": {"userId": ObjectId(user_id)}}}
            )
            return result.modified_count > 0
        
        return True