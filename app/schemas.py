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


class LeaderboardSubmissionRequest(BaseModel):
    """Contract for submitting run results to SQLite persistence."""

    cartridge_id: str = Field(
        pattern=r"^(oregon_1848|pacific_2026)$",
        description="Target cartridge identifier",
    )
    player_name: str = Field(
        min_length=1,
        max_length=50,
        description="Display name of player or party leader",
    )
    score: int = Field(ge=0, le=50000, description="Calculated final run score")
    turns: int = Field(ge=1, le=1000, description="Total turns elapsed during run")
    distance: float = Field(ge=0.0, le=3000.0, description="Distance traveled along trail")
    status: str = Field(
        pattern=r"^(WON|DIED|U_TURN)$",
        description="Final run outcome status",
    )
    epitaph: str | None = Field(
        default=None,
        max_length=140,
        description="Roadside tombstone or memorial message",
    )


class LeaderboardEntry(BaseModel):
    """Single leaderboard or memorial tombstone record."""

    id: int = Field(description="Database primary key")
    cartridge_id: str = Field(description="Cartridge identifier")
    player_name: str = Field(description="Player or party name")
    score: int = Field(description="Final score")
    turns: int = Field(description="Turns taken")
    distance: float = Field(description="Distance reached")
    status: str = Field(description="Outcome status (WON, DIED, U_TURN)")
    recorded_at: str = Field(description="ISO timestamp of completion")
    epitaph: str | None = Field(default=None, description="Memorial epitaph message")


class LeaderboardResponse(BaseModel):
    """Aggregate leaderboard and roadside memorials response."""

    cartridge_id: str = Field(description="Cartridge identifier")
    high_scores: list[LeaderboardEntry] = Field(
        default_factory=list,
        description="Top scores ordered descending",
    )
    memorials: list[LeaderboardEntry] = Field(
        default_factory=list,
        description="Past roadside memorials and tombstones",
    )
