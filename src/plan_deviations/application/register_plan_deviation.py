from src.plan_deviations.domain.plan_deviation import PlanDeviation
from src.plan_deviations.infrastructure.persistence.mongo_plan_deviation_repository import MongoPlanDeviationRepository
from src.trips.infrastructure.persistence.mongo_trip_repository import MongoTripRepository

class RegisterPlanDeviation:
    def __init__(self):
        self.deviation_repository = MongoPlanDeviationRepository()
        self.trip_repository = MongoTripRepository()

    async def execute(
        self,
        trip_id: str,
        metric: str,
        planned_value: str,
        actual_value: str,
        day_id: str = None,
        activity_id: str = None,
        notes: str = None
    ) -> PlanDeviation:
        trip = await self.trip_repository.find_by_id(trip_id)
        if not trip:
            raise ValueError("Trip not found")

        if day_id:
            day_exists = any(day.id == day_id for day in trip.days)
            if not day_exists:
                raise ValueError("Day not found in trip")

        deviation = PlanDeviation(
            trip_id=trip_id,
            day_id=day_id,
            activity_id=activity_id,
            metric=metric,
            planned_value=planned_value,
            actual_value=actual_value,
            notes=notes
        )

        return await self.deviation_repository.create(deviation)