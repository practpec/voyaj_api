from datetime import date
from decimal import Decimal
from typing import Optional
from src.trips.domain.trip import Trip
from src.trips.infrastructure.persistence.mongo_trip_repository import MongoTripRepository

class UpdateTrip:
    def __init__(self):
        self.trip_repository = MongoTripRepository()

    async def execute(
        self,
        trip_id: str,
        user_id: str,
        title: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        base_currency: Optional[str] = None,
        estimated_total_budget: Optional[Decimal] = None,
        is_public: Optional[bool] = None,
        cover_image_url: Optional[str] = None
    ) -> Trip:
        trip = await self.trip_repository.find_by_id(trip_id)
        if not trip:
            raise ValueError("Trip not found")

        user_role = None
        for member in trip.members:
            if member.user_id == user_id:
                user_role = member.role
                break

        if user_role not in ["owner", "editor"]:
            raise ValueError("User not authorized to update this trip")

        update_data = {}
        if title is not None:
            update_data["title"] = title
        if start_date is not None:
            update_data["startDate"] = start_date
        if end_date is not None:
            update_data["endDate"] = end_date
        if base_currency is not None:
            update_data["baseCurrency"] = base_currency
        if estimated_total_budget is not None:
            update_data["estimatedTotalBudget"] = float(estimated_total_budget)
        if is_public is not None:
            update_data["isPublic"] = is_public
        if cover_image_url is not None:
            update_data["coverImageUrl"] = cover_image_url

        if update_data:
            await self.trip_repository.update(trip_id, update_data)

        return await self.trip_repository.find_by_id(trip_id)