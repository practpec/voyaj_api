import os
from typing import Optional
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    environment: str = "development"
    port: int = 8000
    app_version: str = "1.0.0"
    
    mongodb_url: str
    mongodb_database: str
    
    jwt_secret_key: str
    jwt_refresh_secret: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_secure: Optional[str] = None
    smtp_user: Optional[str] = None
    smtp_pass: Optional[str] = None
    from_email: Optional[str] = None
    from_name: Optional[str] = None
    
    cloudinary_cloud_name: Optional[str] = None
    cloudinary_api_key: Optional[str] = None
    cloudinary_api_secret: Optional[str] = None
    
    allowed_origins: str = "http://localhost:3000"
    rate_limit_window_ms: int = 900000
    rate_limit_max_requests: int = 100
    log_level: str = "info"
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"

settings = Settings()