from typing import Dict, Any, List
from decimal import Decimal
from src.trips.infrastructure.persistence.mongo_trip_repository import MongoTripRepository
from src.expenses.infrastructure.persistence.mongo_expense_repository import MongoExpenseRepository
from src.photos.infrastructure.persistence.mongo_photo_repository import MongoPhotoRepository
from src.journal_entries.infrastructure.persistence.mongo_journal_entry_repository import MongoJournalEntryRepository

class GetTripAnalytics:
    def __init__(self):
        self.trip_repository = MongoTripRepository()
        self.expense_repository = MongoExpenseRepository()
        self.photo_repository = MongoPhotoRepository()
        self.journal_repository = MongoJournalEntryRepository()

    async def execute(self, trip_id: str, user_id: str) -> Dict[str, Any]:
        trip = await self.trip_repository.find_by_id(trip_id)
        if not trip:
            raise ValueError("Trip not found")

        is_member = any(
            member.user_id == user_id
            for member in trip.members
        )
        if not is_member:
            raise ValueError("User not authorized to view trip analytics")

        expenses = await self.expense_repository.find_by_trip_id(trip_id)
        photos = await self.photo_repository.find_by_trip_id(trip_id)
        journal_entries = await self.journal_repository.find_by_trip_id(trip_id)

        total_expenses = sum(expense.amount for expense in expenses)
        
        expenses_by_category = {}
        expenses_by_user = {}
        
        for expense in expenses:
            category = expense.category or "Uncategorized"
            if category not in expenses_by_category:
                expenses_by_category[category] = Decimal(0)
            expenses_by_category[category] += expense.amount

            if expense.user_id not in expenses_by_user:
                expenses_by_user[expense.user_id] = Decimal(0)
            expenses_by_user[expense.user_id] += expense.amount

        days_with_activities = len([day for day in trip.days if day.activities])
        total_activities = sum(len(day.activities) for day in trip.days)

        return {
            "trip_summary": {
                "total_days": len(trip.days),
                "days_with_activities": days_with_activities,
                "total_activities": total_activities,
                "total_members": len(trip.members)
            },
            "expense_summary": {
                "total_expenses": float(total_expenses),
                "total_expense_records": len(expenses),
                "expenses_by_category": {k: float(v) for k, v in expenses_by_category.items()},
                "expenses_by_user": {k: float(v) for k, v in expenses_by_user.items()},
                "budget_vs_actual": {
                    "estimated_budget": float(trip.estimated_total_budget) if trip.estimated_total_budget else 0,
                    "actual_expenses": float(total_expenses),
                    "variance": float((trip.estimated_total_budget or Decimal(0)) - total_expenses)
                }
            },
            "content_summary": {
                "total_photos": len(photos),
                "total_journal_entries": len(journal_entries)
            }
        }