from fastapi import APIRouter, HTTPException, status, Depends
from typing import Dict, List
from src.friendships.infrastructure.http.friendships_schemas import SendFriendRequestRequest, RespondFriendRequestRequest, FriendshipInvitationResponse
from src.friendships.application.send_friend_request import SendFriendRequest
from src.friendships.application.respond_to_friend_request import RespondToFriendRequest
from src.friendships.application.get_friendship_requests import GetFriendshipRequests
from src.friendships.application.list_friends import ListFriends
from src.friendships.application.remove_friend import RemoveFriend
from src.auth.infrastructure.http.auth_schemas import UserResponse
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

@router.get("/requests")
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

@router.get("/", response_model=List[UserResponse])
async def list_friends(user_id: str = Depends(get_current_user_id)):
    try:
        list_friends_uc = ListFriends()
        friends = await list_friends_uc.execute(user_id)
        return [UserResponse(**friend.dict()) for friend in friends]
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.delete("/{friend_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_friend(friend_id: str, user_id: str = Depends(get_current_user_id)):
    try:
        remove_friend_uc = RemoveFriend()
        await remove_friend_uc.execute(user_id, friend_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))