from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # MinIO Configuration
    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_secure: bool = False
    
    # API Configuration
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    secret_key: str = "your-secret-key-change-in-production"
    
    # Database
    database_url: str = "sqlite+aiosqlite:///./data/roarins3.db"
    
    # Logging
    log_retention_days: int = 90
    
    class Config:
        env_file = ".env"
        env_prefix = "ROARINS3_"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
