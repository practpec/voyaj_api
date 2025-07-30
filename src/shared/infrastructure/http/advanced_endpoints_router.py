from fastapi import APIRouter, HTTPException, status, Depends, Query, Response
from fastapi.responses import StreamingResponse
from typing import List, Dict, Any, Optional
from datetime import date
import io
from src.trips.application.get_trip_analytics import GetTripAnalytics
from src.expenses.application.get_expense_summary import GetExpenseSummary
from src.photos.application.list_photos_by_day import ListPhotosByDay
from src.journal_entries.application.search_entries import SearchEntries
from src.friendships.application.get_friendship_requests import GetFriendshipRequests
from src.shared.application.export_trip_data import ExportTripData
from src.photos.infrastructure.http.photos_schemas import PhotoResponse
from src.journal_entries.infrastructure.http.journal_entries_schemas import JournalEntryResponse
from src.friendships.infrastructure.http.friendships_schemas import FriendshipInvitationResponse
from src.shared.infrastructure.security.authentication import get_current_user_id

router = APIRouter(tags=["advanced"])

@router.get("/trips/{trip_id}/analytics")
async def get_trip_analytics(trip_id: str, user_id: str = Depends(get_current_user_id)) -> Dict[str, Any]:
    try:
        analytics_uc = GetTripAnalytics()
        return await analytics_uc.execute(trip_id, user_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/trips/{trip_id}/expenses/summary")
async def get_expense_summary(
    trip_id: str,
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    category: Optional[str] = Query(None),
    user_id: str = Depends(get_current_user_id)
) -> Dict[str, Any]:
    try:
        summary_uc = GetExpenseSummary()
        return await summary_uc.execute(trip_id, user_id, start_date, end_date, category)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/trips/{trip_id}/photos/by-day")
async def list_photos_by_day(trip_id: str, user_id: str = Depends(get_current_user_id)) -> Dict[str, List[PhotoResponse]]:
    try:
        photos_by_day_uc = ListPhotosByDay()
        photos_by_day = await photos_by_day_uc.execute(trip_id, user_id)
        
        result = {}
        for day_key, photos in photos_by_day.items():
            result[day_key] = [PhotoResponse(**photo.dict()) for photo in photos]
        
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/trips/{trip_id}/journal-entries/search", response_model=List[JournalEntryResponse])
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

@router.get("/friendships/requests")
async def get_friendship_requests(user_id: str = Depends(get_current_user_id)) -> Dict[str, List[FriendshipInvitationResponse]]:
    try:
        requests_uc = GetFriendshipRequests()
        requests = await requests_uc.execute(user_id)
        
        return {
            "received": [FriendshipInvitationResponse(**inv.dict()) for inv in requests["received"]],
            "sent": [FriendshipInvitationResponse(**inv.dict()) for inv in requests["sent"]]
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/trips/{trip_id}/export")
async def export_trip_data(trip_id: str, user_id: str = Depends(get_current_user_id)):
    try:
        export_uc = ExportTripData()
        pdf_data = await export_uc.execute(trip_id, user_id)
        
        return StreamingResponse(
            io.BytesIO(pdf_data),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=trip_{trip_id}_export.pdf"}
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))