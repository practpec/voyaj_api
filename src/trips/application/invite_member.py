from src.trips.infrastructure.persistence.mongo_trip_repository import MongoTripRepository
from src.auth.infrastructure.persistence.mongo_user_repository import MongoUserRepository

class InviteMember:
    def __init__(self):
        self.trip_repository = MongoTripRepository()
        self.user_repository = MongoUserRepository()

    async def execute(
        self,
        trip_id: str,
        invited_user_id: str,
        inviter_user_id: str,
        role: str = "viewer"
    ) -> bool:
        trip = await self.trip_repository.find_by_id(trip_id)
        if not trip:
            raise ValueError("Trip not found")

        inviter_is_owner = any(
            member.user_id == inviter_user_id and member.role == "owner"
            for member in trip.members
        )
        if not inviter_is_owner:
            raise ValueError("Only trip owner can invite members")

        invited_user = await self.user_repository.find_by_id(invited_user_id)
        if not invited_user:
            raise ValueError("User not found")

        already_member = any(
            member.user_id == invited_user_id
            for member in trip.members
        )
        if already_member:
            raise ValueError("User is already a member")

        member_data = {
            "userId": invited_user_id,
            "role": role
        }

        return await self.trip_repository.add_member(trip_id, member_data)