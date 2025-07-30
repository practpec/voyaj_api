from datetime import date
from decimal import Decimal
from typing import List, Dict
from src.expenses.domain.expense import Expense, Split
from src.expenses.infrastructure.persistence.mongo_expense_repository import MongoExpenseRepository
from src.trips.infrastructure.persistence.mongo_trip_repository import MongoTripRepository

class RegisterExpense:
    def __init__(self):
        self.expense_repository = MongoExpenseRepository()
        self.trip_repository = MongoTripRepository()

    async def execute(
        self,
        trip_id: str,
        user_id: str,
        amount: Decimal,
        description: str,
        expense_date: date,
        currency: str = "USD",
        category: str = None,
        activity_id: str = None,
        splits: List[Dict[str, any]] = None
    ) -> Expense:
        trip = await self.trip_repository.find_by_id(trip_id)
        if not trip:
            raise ValueError("Trip not found")

        is_member = any(
            member.user_id == user_id
            for member in trip.members
        )
        if not is_member:
            raise ValueError("User is not a trip member")

        splits_objects = []
        if splits:
            total_split = sum(Decimal(str(split["amount"])) for split in splits)
            if total_split != amount:
                raise ValueError("Split amounts must equal total expense")
            
            splits_objects = [
                Split(user_id=split["user_id"], amount=Decimal(str(split["amount"])))
                for split in splits
            ]

        expense = Expense(
            trip_id=trip_id,
            user_id=user_id,
            activity_id=activity_id,
            amount=amount,
            currency=currency,
            category=category,
            description=description,
            date=expense_date,
            splits=splits_objects
        )

        return await self.expense_repository.create(expense)