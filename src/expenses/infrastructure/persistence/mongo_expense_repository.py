from typing import Optional, List, Dict, Any
from bson import ObjectId
from datetime import datetime
from src.shared.infrastructure.database.mongo_client import get_database
from src.expenses.domain.expense import Expense

class MongoExpenseRepository:
    def __init__(self):
        self.db = get_database()
        self.collection = self.db.expenses

    def _convert_doc_to_expense(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        """Convert MongoDB document to Expense-compatible dict"""
        converted = {
            "id": str(doc["_id"]),
            "trip_id": str(doc.get("tripId", "")),
            "user_id": str(doc.get("userId", "")),
            "activity_id": str(doc.get("activityId")) if doc.get("activityId") else None,
            "amount": doc.get("amount", 0),
            "currency": doc.get("currency", "USD"),
            "category": doc.get("category"),
            "description": doc.get("description", ""),
            "date": doc.get("date").date() if doc.get("date") else None,
            "is_deleted": doc.get("isDeleted", False)
        }
        
        splits_converted = []
        for split in doc.get("splits", []):
            split_data = {
                "user_id": str(split.get("userId", "")),
                "amount": split.get("amount", 0)
            }
            splits_converted.append(split_data)
        converted["splits"] = splits_converted
        
        return converted

    async def create(self, expense: Expense) -> Expense:
        expense_dict = expense.dict(exclude={"id"})
        expense_dict["tripId"] = ObjectId(expense.trip_id)
        expense_dict["userId"] = ObjectId(expense.user_id)
        expense_dict["activityId"] = ObjectId(expense.activity_id) if expense.activity_id else None
        expense_dict["amount"] = float(expense.amount)
        expense_dict["date"] = datetime.combine(expense.date, datetime.min.time())
        
        for split in expense_dict["splits"]:
            split["userId"] = ObjectId(split["user_id"])
            split["amount"] = float(split["amount"])
            del split["user_id"]
        
        if "trip_id" in expense_dict:
            del expense_dict["trip_id"]
        if "user_id" in expense_dict:
            del expense_dict["user_id"]
        if "activity_id" in expense_dict:
            del expense_dict["activity_id"]
        
        result = await self.collection.insert_one(expense_dict)
        expense.id = str(result.inserted_id)
        return expense

    async def find_by_id(self, expense_id: str) -> Optional[Expense]:
        doc: Optional[Dict[str, Any]] = await self.collection.find_one({"_id": ObjectId(expense_id), "isDeleted": {"$ne": True}})
        if doc:
            converted = self._convert_doc_to_expense(doc)
            return Expense(**converted)
        return None

    async def find_by_trip_id(self, trip_id: str) -> List[Expense]:
        cursor = self.collection.find({
            "tripId": ObjectId(trip_id),
            "isDeleted": {"$ne": True}
        }).sort("date", -1)
        
        expenses = []
        async for doc in cursor:
            converted = self._convert_doc_to_expense(doc)
            expenses.append(Expense(**converted))
        return expenses

    async def find_by_user_id(self, user_id: str) -> List[Expense]:
        cursor = self.collection.find({
            "userId": ObjectId(user_id),
            "isDeleted": {"$ne": True}
        }).sort("date", -1)
        
        expenses = []
        async for doc in cursor:
            converted = self._convert_doc_to_expense(doc)
            expenses.append(Expense(**converted))
        return expenses

    async def update(self, expense_id: str, update_data: dict) -> bool:
        result = await self.collection.update_one(
            {"_id": ObjectId(expense_id)},
            {"$set": update_data}
        )
        return result.modified_count > 0

    async def delete(self, expense_id: str) -> bool:
        result = await self.collection.update_one(
            {"_id": ObjectId(expense_id)},
            {"$set": {"isDeleted": True}}
        )
        return result.modified_count > 0