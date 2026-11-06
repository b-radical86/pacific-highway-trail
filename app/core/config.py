"""Application Configuration & Environment Settings."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application runtime settings loaded from environment or .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "pacific-highway-trail"
    environment: str = "development"
    db_path: Path = Path("trail.db")
    backup_dir: Path = Path("backups")
    error_log_path: Path = Path("logs/errors.jsonl")
    gemini_api_key: str = ""
    required_env_keys: list[str] = []


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Returns cached application settings instance."""
    return Settings()
