from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import StreamingResponse
from typing import Any, Dict, List
from src.trips.infrastructure.http.trips_schemas import (
    CreateTripRequest, UpdateTripRequest, TripResponse, InviteMemberRequest, 
    RespondInvitationRequest, CreateActivityRequest, UpdateActivityRequest
)
from src.trips.application.create_trip import CreateTrip
from src.trips.application.get_trip_analytics import GetTripAnalytics
from src.trips.application.list_user_trips import ListUserTrips
from src.trips.application.get_trip_details import GetTripDetails
from src.trips.application.update_trip import UpdateTrip
from src.trips.application.delete_trip import DeleteTrip
from src.trips.application.invite_member import InviteMember
from src.trips.application.export_trip_data import ExportTripData
from src.trips.application.respond_to_invitation import RespondToInvitation
from src.trips.application.manage_trip_activities import ManageTripActivities
from src.shared.infrastructure.security.authentication import get_current_user_id
import io

router = APIRouter(prefix="/trips", tags=["trips"])

@router.post("/", response_model=TripResponse)
async def create_trip(request: CreateTripRequest, user_id: str = Depends(get_current_user_id)):
    try:
        create_trip_uc = CreateTrip()
        trip = await create_trip_uc.execute(
            title=request.title,
            start_date=request.start_date,
            end_date=request.end_date,
            created_by=user_id,
            base_currency=request.base_currency,
            estimated_total_budget=request.estimated_total_budget,
            is_public=request.is_public
        )
        return TripResponse(**trip.dict())
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/", response_model=List[TripResponse])
async def list_user_trips(user_id: str = Depends(get_current_user_id)):
    list_trips = ListUserTrips()
    trips = await list_trips.execute(user_id)
    return [TripResponse(**trip.dict()) for trip in trips]

@router.get("/{trip_id}", response_model=TripResponse)
async def get_trip_details(trip_id: str, user_id: str = Depends(get_current_user_id)):
    try:
        get_trip_uc = GetTripDetails()
        trip = await get_trip_uc.execute(trip_id, user_id)
        return TripResponse(**trip.dict())
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.put("/{trip_id}", response_model=TripResponse)
async def update_trip(trip_id: str, request: UpdateTripRequest, user_id: str = Depends(get_current_user_id)):
    try:
        update_trip_uc = UpdateTrip()
        trip = await update_trip_uc.execute(
            trip_id=trip_id,
            user_id=user_id,
            title=request.title,
            start_date=request.start_date,
            end_date=request.end_date,
            base_currency=request.base_currency,
            estimated_total_budget=request.estimated_total_budget,
            is_public=request.is_public,
            cover_image_url=request.cover_image_url
        )
        return TripResponse(**trip.dict())
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.delete("/{trip_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_trip(trip_id: str, user_id: str = Depends(get_current_user_id)):
    try:
        delete_trip_uc = DeleteTrip()
        await delete_trip_uc.execute(trip_id, user_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/{trip_id}/invite", status_code=status.HTTP_200_OK)
async def invite_member(trip_id: str, request: InviteMemberRequest, user_id: str = Depends(get_current_user_id)):
    try:
        invite_member_uc = InviteMember()
        await invite_member_uc.execute(
            trip_id=trip_id,
            invited_user_id=request.invited_user_id,
            inviter_user_id=user_id,
            role=request.role
        )
        return {"message": "Member invited successfully"}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/{trip_id}/respond-invitation", status_code=status.HTTP_200_OK)
async def respond_to_invitation(trip_id: str, request: RespondInvitationRequest, user_id: str = Depends(get_current_user_id)):
    try:
        respond_uc = RespondToInvitation()
        await respond_uc.execute(
            trip_id=trip_id,
            user_id=user_id,
            accept=request.accept
        )
        return {"message": "Invitation response processed"}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/{trip_id}/days/{day_id}/activities", status_code=status.HTTP_201_CREATED)
async def create_activity(trip_id: str, day_id: str, request: CreateActivityRequest, user_id: str = Depends(get_current_user_id)):
    try:
        manage_activities = ManageTripActivities()
        await manage_activities.create_activity(
            trip_id=trip_id,
            day_id=day_id,
            user_id=user_id,
            title=request.title,
            description=request.description,
            location=request.location,
            start_time=request.start_time,
            end_time=request.end_time,
            estimated_cost=request.estimated_cost,
            order=request.order
        )
        return {"message": "Activity created successfully"}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.put("/{trip_id}/days/{day_id}/activities/{activity_id}", status_code=status.HTTP_200_OK)
async def update_activity(trip_id: str, day_id: str, activity_id: str, request: UpdateActivityRequest, user_id: str = Depends(get_current_user_id)):
    try:
        manage_activities = ManageTripActivities()
        await manage_activities.update_activity(
            trip_id=trip_id,
            day_id=day_id,
            activity_id=activity_id,
            user_id=user_id,
            title=request.title,
            description=request.description,
            location=request.location,
            start_time=request.start_time,
            end_time=request.end_time,
            estimated_cost=request.estimated_cost,
            order=request.order
        )
        return {"message": "Activity updated successfully"}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.delete("/{trip_id}/days/{day_id}/activities/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_activity(trip_id: str, day_id: str, activity_id: str, user_id: str = Depends(get_current_user_id)):
    try:
        manage_activities = ManageTripActivities()
        await manage_activities.delete_activity(trip_id, day_id, activity_id, user_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    
@router.get("/trips/{trip_id}/analytics")
async def get_trip_analytics(trip_id: str, user_id: str = Depends(get_current_user_id)) -> Dict[str, Any]:
    try:
        analytics_uc = GetTripAnalytics()
        return await analytics_uc.execute(trip_id, user_id)
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