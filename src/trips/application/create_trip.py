from datetime import date, timedelta
from decimal import Decimal
from src.trips.domain.trip import Trip, Member, Day
from src.trips.infrastructure.persistence.mongo_trip_repository import MongoTripRepository

class CreateTrip:
    def __init__(self):
        self.trip_repository = MongoTripRepository()

    async def execute(
        self,
        title: str,
        start_date: date,
        end_date: date,
        created_by: str,
        base_currency: str = "USD",
        estimated_total_budget: Decimal = None,
        is_public: bool = False
    ) -> Trip:
        if start_date >= end_date:
            raise ValueError("Start date must be before end date")

        owner_member = Member(
            user_id=created_by,
            role="owner"
        )

        days = []
        current_date = start_date
        while current_date <= end_date:
            day = Day(date=current_date)
            days.append(day)
            current_date += timedelta(days=1)

        trip = Trip(
            title=title,
            start_date=start_date,
            end_date=end_date,
            created_by=created_by,
            base_currency=base_currency,
            estimated_total_budget=estimated_total_budget,
            is_public=is_public,
            members=[owner_member],
            days=days
        )

        return await self.trip_repository.create(trip)