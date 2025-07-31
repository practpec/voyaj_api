from fastapi import APIRouter, HTTPException, Query, status, Depends
from typing import List
from src.journal_entries.infrastructure.http.journal_entries_schemas import CreateJournalEntryRequest, UpdateJournalEntryRequest, JournalEntryResponse
from src.journal_entries.application.create_journal_entry import CreateJournalEntry
from src.journal_entries.application.list_trip_journal_entries import ListTripJournalEntries
from src.journal_entries.application.get_journal_entry import GetJournalEntry
from src.journal_entries.application.update_journal_entry import UpdateJournalEntry
from src.journal_entries.application.search_entries import SearchEntries
from src.shared.infrastructure.security.authentication import get_current_user_id

router = APIRouter(prefix="/trips/{trip_id}/journal-entries", tags=["journal-entries"])

@router.post("/", response_model=JournalEntryResponse)
async def create_journal_entry(trip_id: str, request: CreateJournalEntryRequest, user_id: str = Depends(get_current_user_id)):
    try:
        create_entry_uc = CreateJournalEntry()
        recommendations_data = None
        if request.recommendations:
            recommendations_data = [{"note": rec.note, "type": rec.type} for rec in request.recommendations]
        
        entry = await create_entry_uc.execute(
            trip_id=trip_id,
            day_id=request.day_id,
            user_id=user_id,
            content=request.content,
            emotions=request.emotions,
            recommendations=recommendations_data
        )
        return JournalEntryResponse(**entry.dict())
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/", response_model=List[JournalEntryResponse])
async def list_trip_journal_entries(trip_id: str, user_id: str = Depends(get_current_user_id)):
    try:
        list_entries = ListTripJournalEntries()
        entries = await list_entries.execute(trip_id, user_id)
        return [JournalEntryResponse(**entry.dict()) for entry in entries]
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/{entry_id}", response_model=JournalEntryResponse)
async def get_journal_entry(trip_id: str, entry_id: str, user_id: str = Depends(get_current_user_id)):
    try:
        get_entry_uc = GetJournalEntry()
        entry = await get_entry_uc.execute(entry_id, user_id)
        return JournalEntryResponse(**entry.dict())
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.put("/{entry_id}", response_model=JournalEntryResponse)
async def update_journal_entry(trip_id: str, entry_id: str, request: UpdateJournalEntryRequest, user_id: str = Depends(get_current_user_id)):
    try:
        update_entry_uc = UpdateJournalEntry()
        recommendations_data = None
        if request.recommendations:
            recommendations_data = [{"note": rec.note, "type": rec.type} for rec in request.recommendations]
        
        entry = await update_entry_uc.execute(
            entry_id=entry_id,
            user_id=user_id,
            content=request.content,
            emotions=request.emotions,
            recommendations=recommendations_data
        )
        return JournalEntryResponse(**entry.dict())
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    

@router.get("/search", response_model=List[JournalEntryResponse])
async def search_journal_entries(
    trip_id: str,
    q: str = Query(..., min_length=2),
    user_id: str = Depends(get_current_user_id)
):
    try:
        search_uc = SearchEntries()
        entries = await search_uc.execute(trip_id, user_id, q)
        return [JournalEntryResponse(**entry.dict()) for entry in entries]
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

