from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from src.trips.infrastructure.http.trips_schemas import CreateTripRequest, TripResponse, InviteMemberRequest, RespondInvitationRequest
from src.trips.application.create_trip import CreateTrip
from src.trips.application.list_user_trips import ListUserTrips
from src.trips.application.invite_member import InviteMember
from src.trips.application.respond_to_invitation import RespondToInvitation
from src.shared.infrastructure.security.authentication import get_current_user_id

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