from typing import Optional, List, Dict, Any
from src.journal_entries.domain.journal_entry import JournalEntry, Recommendation
from src.journal_entries.infrastructure.persistence.mongo_journal_entry_repository import MongoJournalEntryRepository
from src.trips.infrastructure.persistence.mongo_trip_repository import MongoTripRepository

class UpdateJournalEntry:
    def __init__(self):
        self.journal_repository = MongoJournalEntryRepository()
        self.trip_repository = MongoTripRepository()

    async def execute(
        self,
        entry_id: str,
        user_id: str,
        content: Optional[str] = None,
        emotions: Optional[Dict[str, Any]] = None,
        recommendations: Optional[List[Dict[str, str]]] = None
    ) -> JournalEntry:
        entry = await self.journal_repository.find_by_id(entry_id)
        if not entry:
            raise ValueError("Journal entry not found")

        trip = await self.trip_repository.find_by_id(entry.trip_id)
        if not trip:
            raise ValueError("Trip not found")

        if entry.user_id != user_id:
            raise ValueError("User not authorized to update this journal entry")

        update_data = {}
        if content is not None:
            update_data["content"] = content
        if emotions is not None:
            update_data["emotions"] = emotions
        if recommendations is not None:
            recommendations_data = [
                {"note": rec["note"], "type": rec["type"]}
                for rec in recommendations
            ]
            update_data["recommendations"] = recommendations_data

        if update_data:
            await self.journal_repository.update(entry_id, update_data)

        return await self.journal_repository.find_by_id(entry_id)