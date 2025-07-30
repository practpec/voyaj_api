from typing import Dict, List, Any
from src.journal_entries.domain.journal_entry import JournalEntry, Recommendation
from src.journal_entries.infrastructure.persistence.mongo_journal_entry_repository import MongoJournalEntryRepository
from src.trips.infrastructure.persistence.mongo_trip_repository import MongoTripRepository

class CreateJournalEntry:
    def __init__(self):
        self.journal_repository = MongoJournalEntryRepository()
        self.trip_repository = MongoTripRepository()

    async def execute(
        self,
        trip_id: str,
        day_id: str,
        user_id: str,
        content: str,
        emotions: Dict[str, Any] = None,
        recommendations: List[Dict[str, str]] = None
    ) -> JournalEntry:
        trip = await self.trip_repository.find_by_id(trip_id)
        if not trip:
            raise ValueError("Trip not found")

        is_member = any(
            member.user_id == user_id
            for member in trip.members
        )
        if not is_member:
            raise ValueError("User is not a trip member")

        day_exists = any(day.id == day_id for day in trip.days)
        if not day_exists:
            raise ValueError("Day not found in trip")

        recommendations_objects = []
        if recommendations:
            recommendations_objects = [
                Recommendation(note=rec["note"], type=rec["type"])
                for rec in recommendations
            ]

        entry = JournalEntry(
            trip_id=trip_id,
            day_id=day_id,
            user_id=user_id,
            content=content,
            emotions=emotions or {},
            recommendations=recommendations_objects
        )

        return await self.journal_repository.create(entry)