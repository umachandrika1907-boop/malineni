from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    # Application
    app_name: str = "EduSuccess AI"
    app_version: str = "1.0.0"
    debug: bool = True

    # Server
    host: str = "0.0.0.0"
    port: int = 8000

    # Security
    secret_key: str = "change-this-to-a-long-random-secret-key-at-least-32-chars"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440
    refresh_token_expire_days: int = 7

    # Database
    database_url: str = "sqlite:///./edusuccess.db"

    # CORS
    frontend_url: str = "http://localhost:5173"

    # Upload
    max_upload_size_mb: int = 5

    # Optional AI
    gemini_api_key: Optional[str] = None

    # Initial Admin Bootstrap (Optional via environment variables)
    initial_admin_email: Optional[str] = None
    initial_admin_password: Optional[str] = None

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
