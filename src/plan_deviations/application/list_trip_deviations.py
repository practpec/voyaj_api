from typing import List
from src.plan_deviations.domain.plan_deviation import PlanDeviation
from src.plan_deviations.infrastructure.persistence.mongo_plan_deviation_repository import MongoPlanDeviationRepository
from src.trips.infrastructure.persistence.mongo_trip_repository import MongoTripRepository

class ListTripDeviations:
    def __init__(self):
        self.deviation_repository = MongoPlanDeviationRepository()
        self.trip_repository = MongoTripRepository()

    async def execute(self, trip_id: str) -> List[PlanDeviation]:
        trip = await self.trip_repository.find_by_id(trip_id)
        if not trip:
            raise ValueError("Trip not found")

        return await self.deviation_repository.find_by_trip_id(trip_id)