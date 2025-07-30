from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from src.photos.infrastructure.http.photos_schemas import UploadPhotoRequest, PhotoResponse
from src.photos.application.upload_photo_metadata import UploadPhotoMetadata
from src.photos.application.list_trip_photos import ListTripPhotos
from src.shared.infrastructure.security.authentication import get_current_user_id

router = APIRouter(prefix="/trips/{trip_id}/photos", tags=["photos"])

@router.post("/", response_model=PhotoResponse)
async def upload_photo(trip_id: str, request: UploadPhotoRequest, user_id: str = Depends(get_current_user_id)):
    try:
        upload_photo_uc = UploadPhotoMetadata()
        photo = await upload_photo_uc.execute(
            trip_id=trip_id,
            user_id=user_id,
            file_url=request.file_url,
            taken_at=request.taken_at,
            location=request.location,
            associated_day_id=request.associated_day_id,
            associated_journal_entry_id=request.associated_journal_entry_id
        )
        return PhotoResponse(**photo.dict())
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/", response_model=List[PhotoResponse])
async def list_trip_photos(trip_id: str, user_id: str = Depends(get_current_user_id)):
    try:
        list_photos = ListTripPhotos()
        photos = await list_photos.execute(trip_id, user_id)
        return [PhotoResponse(**photo.dict()) for photo in photos]
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))