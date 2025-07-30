from typing import List
from src.journal_entries.domain.journal_entry import JournalEntry
from src.journal_entries.infrastructure.persistence.mongo_journal_entry_repository import MongoJournalEntryRepository
from src.trips.infrastructure.persistence.mongo_trip_repository import MongoTripRepository

class ListTripJournalEntries:
    def __init__(self):
        self.journal_repository = MongoJournalEntryRepository()
        self.trip_repository = MongoTripRepository()

    async def execute(self, trip_id: str, user_id: str) -> List[JournalEntry]:
        trip = await self.trip_repository.find_by_id(trip_id)
        if not trip:
            raise ValueError("Trip not found")

        is_member = any(
            member.user_id == user_id
            for member in trip.members
        )
        if not is_member:
            raise ValueError("User is not a trip member")

        return await self.journal_repository.find_by_trip_id(trip_id)