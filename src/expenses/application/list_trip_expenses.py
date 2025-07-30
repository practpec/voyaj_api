from typing import List
from src.expenses.domain.expense import Expense
from src.expenses.infrastructure.persistence.mongo_expense_repository import MongoExpenseRepository
from src.trips.infrastructure.persistence.mongo_trip_repository import MongoTripRepository

class ListTripExpenses:
    def __init__(self):
        self.expense_repository = MongoExpenseRepository()
        self.trip_repository = MongoTripRepository()

    async def execute(self, trip_id: str, user_id: str) -> List[Expense]:
        trip = await self.trip_repository.find_by_id(trip_id)
        if not trip:
            raise ValueError("Trip not found")

        is_member = any(
            member.user_id == user_id
            for member in trip.members
        )
        if not is_member:
            raise ValueError("User is not a trip member")

        return await self.expense_repository.find_by_trip_id(trip_id)