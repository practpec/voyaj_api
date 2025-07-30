from src.expenses.infrastructure.persistence.mongo_expense_repository import MongoExpenseRepository
from src.trips.infrastructure.persistence.mongo_trip_repository import MongoTripRepository

class DeleteExpense:
    def __init__(self):
        self.expense_repository = MongoExpenseRepository()
        self.trip_repository = MongoTripRepository()

    async def execute(self, expense_id: str, user_id: str) -> bool:
        expense = await self.expense_repository.find_by_id(expense_id)
        if not expense:
            raise ValueError("Expense not found")

        trip = await self.trip_repository.find_by_id(expense.trip_id)
        if not trip:
            raise ValueError("Trip not found")

        user_role = None
        for member in trip.members:
            if member.user_id == user_id:
                user_role = member.role
                break

        if user_role not in ["owner", "editor"] and expense.user_id != user_id:
            raise ValueError("User not authorized to delete this expense")

        return await self.expense_repository.delete(expense_id)