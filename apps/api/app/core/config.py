from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    APP_NAME: str = "StockPilot AI"
    APP_ENV: str = "development"
    DEBUG: bool = True
    
    # Server & API
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    API_V1_STR: str = "/api/v1"
    FRONTEND_ORIGIN: str = "http://localhost:3000"
    
    # Database (Supabase PostgreSQL / local SQLite fallback)
    DATABASE_URL: str = "sqlite+aiosqlite:///./stockpilot.db"
    DATABASE_SYNC_URL: str = "sqlite:///./stockpilot.db"
    
    # Security / JWT
    JWT_SECRET_KEY: str = "dev-stockpilot-super-secret-key-change-in-production-min-32-chars"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Market Data
    MARKET_DATA_PROVIDER: str = "nse_yahoo_fallback"
    MARKET_DATA_API_KEY: Optional[str] = None
    
    # ML Model
    MODEL_ARTIFACT_PATH: str = "ml/artifacts/stockpilot_model.joblib"
    MODEL_METADATA_PATH: str = "ml/artifacts/model_metadata.json"
    MODEL_VERSION: str = "1.0.0"
    
    # Demo Data mode (True if real feeds unavailable)
    ENABLE_DEMO_DATA_FALLBACK: bool = True
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
