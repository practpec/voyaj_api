from datetime import date
from decimal import Decimal
from typing import Optional, List, Dict
from src.expenses.domain.expense import Expense, Split
from src.expenses.infrastructure.persistence.mongo_expense_repository import MongoExpenseRepository
from src.trips.infrastructure.persistence.mongo_trip_repository import MongoTripRepository

class UpdateExpense:
    def __init__(self):
        self.expense_repository = MongoExpenseRepository()
        self.trip_repository = MongoTripRepository()

    async def execute(
        self,
        expense_id: str,
        user_id: str,
        amount: Optional[Decimal] = None,
        description: Optional[str] = None,
        expense_date: Optional[date] = None,
        currency: Optional[str] = None,
        category: Optional[str] = None,
        activity_id: Optional[str] = None,
        splits: Optional[List[Dict[str, any]]] = None
    ) -> Expense:
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
            raise ValueError("User not authorized to update this expense")

        update_data = {}
        if amount is not None:
            update_data["amount"] = float(amount)
        if description is not None:
            update_data["description"] = description
        if expense_date is not None:
            from datetime import datetime
            update_data["date"] = datetime.combine(expense_date, datetime.min.time())
        if currency is not None:
            update_data["currency"] = currency
        if category is not None:
            update_data["category"] = category
        if activity_id is not None:
            from bson import ObjectId
            update_data["activityId"] = ObjectId(activity_id) if activity_id else None

        if splits is not None:
            if amount is None:
                amount = expense.amount
            
            total_split = sum(Decimal(str(split["amount"])) for split in splits)
            if total_split != amount:
                raise ValueError("Split amounts must equal total expense")
            
            splits_data = []
            for split in splits:
                from bson import ObjectId
                splits_data.append({
                    "userId": ObjectId(split["user_id"]),
                    "amount": float(Decimal(str(split["amount"])))
                })
            update_data["splits"] = splits_data

        if update_data:
            await self.expense_repository.update(expense_id, update_data)

        return await self.expense_repository.find_by_id(expense_id)