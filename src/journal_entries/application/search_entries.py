from typing import List
from src.journal_entries.domain.journal_entry import JournalEntry
from src.journal_entries.infrastructure.persistence.mongo_journal_entry_repository import MongoJournalEntryRepository
from src.trips.infrastructure.persistence.mongo_trip_repository import MongoTripRepository

class SearchEntries:
    def __init__(self):
        self.journal_repository = MongoJournalEntryRepository()
        self.trip_repository = MongoTripRepository()

    async def execute(self, trip_id: str, user_id: str, query: str) -> List[JournalEntry]:
        if not query or len(query) < 2:
            raise ValueError("Search query must be at least 2 characters")

        trip = await self.trip_repository.find_by_id(trip_id)
        if not trip:
            raise ValueError("Trip not found")

        is_member = any(
            member.user_id == user_id
            for member in trip.members
        )
        if not is_member:
            raise ValueError("User not authorized to search journal entries")

        all_entries = await self.journal_repository.find_by_trip_id(trip_id)
        
        query_lower = query.lower()
        matching_entries = []
        
        for entry in all_entries:
            content_matches = query_lower in entry.content.lower()
            
            recommendation_matches = any(
                query_lower in rec.note.lower() 
                for rec in entry.recommendations
            )
            
            if content_matches or recommendation_matches:
                matching_entries.append(entry)
        
        return matching_entries