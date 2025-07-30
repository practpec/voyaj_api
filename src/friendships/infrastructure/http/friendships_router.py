from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from src.friendships.infrastructure.http.friendships_schemas import SendFriendRequestRequest, RespondFriendRequestRequest, FriendshipInvitationResponse
from src.friendships.application.send_friend_request import SendFriendRequest
from src.friendships.application.respond_to_friend_request import RespondToFriendRequest
from src.shared.infrastructure.security.authentication import get_current_user_id

router = APIRouter(prefix="/friendships", tags=["friendships"])

@router.post("/requests", response_model=FriendshipInvitationResponse)
async def send_friend_request(request: SendFriendRequestRequest, user_id: str = Depends(get_current_user_id)):
    try:
        send_request_uc = SendFriendRequest()
        invitation = await send_request_uc.execute(
            sender_id=user_id,
            recipient_id=request.recipient_id,
            message=request.message
        )
        return FriendshipInvitationResponse(**invitation.dict())
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/requests/{invitation_id}/respond", status_code=status.HTTP_200_OK)
async def respond_to_friend_request(invitation_id: str, request: RespondFriendRequestRequest, user_id: str = Depends(get_current_user_id)):
    try:
        respond_uc = RespondToFriendRequest()
        await respond_uc.execute(
            invitation_id=invitation_id,
            user_id=user_id,
            accept=request.accept
        )
        return {"message": "Friend request response processed"}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))