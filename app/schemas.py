"""Pydantic V2 Boundary Contracts & Data Transfer Schemas."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, Field


class StartupStatus(BaseModel):
    """Result of fail-fast startup self-check."""

    status: str = Field(description="Operational status of the self check")
    db_path: str = Field(description="Resolved SQLite database path")
    journal_mode: str = Field(description="SQLite journal mode (must be WAL)")
    backup_created: str | None = Field(
        default=None,
        description="Path to created backup snapshot if taken",
    )


class HealthCheckResponse(BaseModel):
    """Contract for application health and runtime verification."""

    status: str = Field(default="ok", description="Overall service status")
    app_name: str = Field(description="Application identifier")
    environment: str = Field(description="Runtime environment (development, staging, prod)")
    journal_mode: str = Field(description="Active SQLite journal mode")
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="UTC timestamp of the health check evaluation",
    )
    startup_check: StartupStatus | None = Field(
        default=None,
        description="Startup self-check results",
    )
    details: dict[str, Any] = Field(
        default_factory=dict,
        description="Extensible metadata and diagnostic metrics",
    )
