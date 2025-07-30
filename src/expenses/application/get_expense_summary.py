from typing import Dict, Any, List
from decimal import Decimal
from datetime import date, datetime
from src.expenses.infrastructure.persistence.mongo_expense_repository import MongoExpenseRepository
from src.trips.infrastructure.persistence.mongo_trip_repository import MongoTripRepository

class GetExpenseSummary:
    def __init__(self):
        self.expense_repository = MongoExpenseRepository()
        self.trip_repository = MongoTripRepository()

    async def execute(
        self, 
        trip_id: str, 
        user_id: str,
        start_date: date = None,
        end_date: date = None,
        category: str = None
    ) -> Dict[str, Any]:
        trip = await self.trip_repository.find_by_id(trip_id)
        if not trip:
            raise ValueError("Trip not found")

        is_member = any(
            member.user_id == user_id
            for member in trip.members
        )
        if not is_member:
            raise ValueError("User not authorized to view expense summary")

        expenses = await self.expense_repository.find_by_trip_id(trip_id)

        filtered_expenses = expenses
        if start_date:
            filtered_expenses = [e for e in filtered_expenses if e.date >= start_date]
        if end_date:
            filtered_expenses = [e for e in filtered_expenses if e.date <= end_date]
        if category:
            filtered_expenses = [e for e in filtered_expenses if e.category == category]

        total_amount = sum(expense.amount for expense in filtered_expenses)
        
        by_category = {}
        by_user = {}
        by_date = {}
        by_currency = {}

        for expense in filtered_expenses:
            cat = expense.category or "Uncategorized"
            if cat not in by_category:
                by_category[cat] = {"count": 0, "total": Decimal(0)}
            by_category[cat]["count"] += 1
            by_category[cat]["total"] += expense.amount

            if expense.user_id not in by_user:
                by_user[expense.user_id] = {"count": 0, "total": Decimal(0)}
            by_user[expense.user_id]["count"] += 1
            by_user[expense.user_id]["total"] += expense.amount

            date_key = expense.date.strftime("%Y-%m-%d")
            if date_key not in by_date:
                by_date[date_key] = {"count": 0, "total": Decimal(0)}
            by_date[date_key]["count"] += 1
            by_date[date_key]["total"] += expense.amount

            if expense.currency not in by_currency:
                by_currency[expense.currency] = {"count": 0, "total": Decimal(0)}
            by_currency[expense.currency]["count"] += 1
            by_currency[expense.currency]["total"] += expense.amount

        avg_expense = total_amount / len(filtered_expenses) if filtered_expenses else Decimal(0)

        return {
            "summary": {
                "total_expenses": float(total_amount),
                "expense_count": len(filtered_expenses),
                "average_expense": float(avg_expense),
                "date_range": {
                    "start": start_date.isoformat() if start_date else None,
                    "end": end_date.isoformat() if end_date else None
                }
            },
            "by_category": {
                k: {"count": v["count"], "total": float(v["total"])}
                for k, v in by_category.items()
            },
            "by_user": {
                k: {"count": v["count"], "total": float(v["total"])}
                for k, v in by_user.items()
            },
            "by_date": {
                k: {"count": v["count"], "total": float(v["total"])}
                for k, v in by_date.items()
            },
            "by_currency": {
                k: {"count": v["count"], "total": float(v["total"])}
                for k, v in by_currency.items()
            }
        }