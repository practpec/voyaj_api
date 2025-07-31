import cloudinary
import cloudinary.uploader
import cloudinary.api
from datetime import datetime
from typing import Optional
from src.shared.config import settings

class FileStorageService:
    def __init__(self):
        cloudinary.config(
            cloud_name=settings.cloudinary_cloud_name,
            api_key=settings.cloudinary_api_key,
            api_secret=settings.cloudinary_api_secret
        )

    async def upload_image(
        self, 
        file_bytes: bytes, 
        folder: str, 
        public_id: Optional[str] = None
    ) -> Optional[str]:
        try:
            upload_options = {
                "folder": folder,
                "resource_type": "image",
                "format": "jpg",
                "quality": "auto:good",
                "fetch_format": "auto"
            }
            
            if public_id:
                upload_options["public_id"] = public_id
                upload_options["overwrite"] = True

            result = cloudinary.uploader.upload(file_bytes, **upload_options)
            return result.get("secure_url")

        except Exception as e:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{timestamp}] [FILE_STORAGE] [ERROR] Failed to upload image: {str(e)}")
            return None

    async def delete_image(self, public_id: str) -> bool:
        try:
            result = cloudinary.uploader.destroy(public_id)
            return result.get("result") == "ok"

        except Exception as e:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{timestamp}] [FILE_STORAGE] [ERROR] Failed to delete image {public_id}: {str(e)}")
            return False

    async def upload_trip_photo(
        self, 
        file_bytes: bytes, 
        trip_id: str, 
        photo_id: str
    ) -> Optional[str]:
        folder = f"voyaj/trips/{trip_id}"
        public_id = f"{trip_id}_{photo_id}"
        return await self.upload_image(file_bytes, folder, public_id)

    async def delete_trip_photo(self, trip_id: str, photo_id: str) -> bool:
        public_id = f"voyaj/trips/{trip_id}/{trip_id}_{photo_id}"
        return await self.delete_image(public_id)
    
    async def upload_profile_photo(self, file_bytes: bytes, user_id: str) -> Optional[str]:
        folder = "voyaj/profiles"
        public_id = f"profile_{user_id}"
        return await self.upload_image(file_bytes, folder, public_id)

    async def delete_profile_photo(self, user_id: str) -> bool:
        public_id = f"voyaj/profiles/profile_{user_id}"
        return await self.delete_image(public_id)

    def get_optimized_url(self, public_id: str, width: int = 800, quality: str = "auto") -> str:
        try:
            url, _ = cloudinary.utils.cloudinary_url(
                public_id,
                width=width,
                quality=quality,
                fetch_format="auto",
                secure=True
            )
            return url
        except Exception:
            return ""