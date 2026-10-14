import os
import secrets
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "WealthCraft AI"
    API_V1_STR: str = "/api/v1"

    # Security — load from env; never use a placeholder in production
    SECRET_KEY: str = os.getenv(
        "SECRET_KEY",
        # Generate a strong random default only for local dev; production MUST set SECRET_KEY env var
        secrets.token_hex(32),
    )
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days

    # Database — default to local SQLite for development
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./stockify.db")

    # AI/ML keys
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")

    # CORS — restrict to known origins; wildcard is only acceptable locally
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://wealthcraft-ai-frontend.onrender.com",
        "https://frontend-eight-orcin-39.vercel.app",
        "https://wealthcraft.vercel.app",
    ]

    # Optional: allow extra origins via env (comma-separated)
    EXTRA_CORS_ORIGINS: str = os.getenv("EXTRA_CORS_ORIGINS", "")

    def get_cors_origins(self) -> List[str]:
        origins = list(self.BACKEND_CORS_ORIGINS)
        if self.EXTRA_CORS_ORIGINS:
            for origin in self.EXTRA_CORS_ORIGINS.split(","):
                o = origin.strip()
                if o:
                    origins.append(o)
        return origins

    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
