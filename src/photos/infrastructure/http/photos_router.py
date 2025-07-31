from fastapi import APIRouter, HTTPException, status, Depends, File, UploadFile, Form
from typing import Dict, List, Optional
from datetime import datetime
from src.photos.infrastructure.http.photos_schemas import UploadPhotoRequest, PhotoResponse
from src.photos.application.upload_photo_metadata import UploadPhotoMetadata
from src.photos.application.upload_photo_to_cloudinary import UploadPhotoToCloudinary
from src.photos.application.list_photos_by_day import ListPhotosByDay
from src.photos.application.list_trip_photos import ListTripPhotos
from src.photos.application.get_photo_details import GetPhotoDetails
from src.photos.application.delete_photo import DeletePhoto
from src.shared.infrastructure.security.authentication import get_current_user_id

router = APIRouter(prefix="/trips/{trip_id}/photos", tags=["photos"])

@router.post("/", response_model=PhotoResponse)
async def upload_photo_metadata(trip_id: str, request: UploadPhotoRequest, user_id: str = Depends(get_current_user_id)):
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

@router.post("/upload", response_model=PhotoResponse)
async def upload_photo_file(
    trip_id: str,
    file: UploadFile = File(...),
    location: Optional[str] = Form(None),
    associated_day_id: Optional[str] = Form(None),
    associated_journal_entry_id: Optional[str] = Form(None),
    user_id: str = Depends(get_current_user_id)
):
    try:
        if not file.content_type or not file.content_type.startswith('image/'):
            raise ValueError("File must be an image")
        
        file_bytes = await file.read()
        if len(file_bytes) > 10 * 1024 * 1024:
            raise ValueError("File size must be less than 10MB")
        
        upload_photo_uc = UploadPhotoToCloudinary()
        photo = await upload_photo_uc.execute(
            trip_id=trip_id,
            user_id=user_id,
            file_bytes=file_bytes,
            filename=file.filename or "photo.jpg",
            location=location,
            associated_day_id=associated_day_id,
            associated_journal_entry_id=associated_journal_entry_id
        )
        return PhotoResponse(**photo.dict())
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/by-day")
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

@router.get("/", response_model=List[PhotoResponse])
async def list_trip_photos(trip_id: str, user_id: str = Depends(get_current_user_id)):
    try:
        list_photos = ListTripPhotos()
        photos = await list_photos.execute(trip_id, user_id)
        return [PhotoResponse(**photo.dict()) for photo in photos]
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/{photo_id}", response_model=PhotoResponse)
async def get_photo_details(trip_id: str, photo_id: str, user_id: str = Depends(get_current_user_id)):
    try:
        get_photo_uc = GetPhotoDetails()
        photo = await get_photo_uc.execute(photo_id, user_id)
        return PhotoResponse(**photo.dict())
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.delete("/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_photo(trip_id: str, photo_id: str, user_id: str = Depends(get_current_user_id)):
    try:
        delete_photo_uc = DeletePhoto()
        await delete_photo_uc.execute(photo_id, user_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))