"""Main FastAPI application entrypoint with guardrail lifecycle integration."""

from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
import sqlite3
from typing import Annotated, Any
import uuid

from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import get_settings
from app.core.guardrails import (
    configure_structured_logging,
    init_wal_sqlite,
    run_startup_self_check,
)
from app.db import (
    get_db,
    get_leaderboard_entries,
    get_memorial_entries,
    init_db,
    insert_leaderboard_entry,
)
from app.schemas import (
    HealthCheckResponse,
    LeaderboardEntry,
    LeaderboardResponse,
    LeaderboardSubmissionRequest,
    StartupStatus,
)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Wires structured logging, startup self-check, and WAL SQLite into lifecycle."""
    logger = configure_structured_logging(
        app_name=settings.app_name,
        error_log_path=settings.error_log_path,
    )
    logger.info("Initializing %s in %s environment...", settings.app_name, settings.environment)

    # 1. Run fail-fast startup self-check
    raw_check = run_startup_self_check(
        required_env_keys=settings.required_env_keys,
        db_path=settings.db_path,
        backup_dir=settings.backup_dir,
    )
    startup_status = StartupStatus(
        status=raw_check["status"],
        db_path=str(raw_check["db_path"]),
        journal_mode=str(raw_check["journal_mode"]),
        backup_created=raw_check.get("backup_created"),
    )

    # 2. Initialize WAL SQLite schema and verify PRAGMAs
    init_db(settings.db_path)
    conn = init_wal_sqlite(settings.db_path)
    try:
        journal_mode = conn.execute("PRAGMA journal_mode;").fetchone()[0]
    finally:
        conn.close()

    app.state.logger = logger
    app.state.startup_status = startup_status
    app.state.journal_mode = journal_mode

    logger.info("Startup complete. SQLite journal_mode=%s", journal_mode)
    yield
    logger.info("Shutting down %s...", settings.app_name)


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    lifespan=lifespan,
)

static_dir = Path(__file__).resolve().parent / "static"
if static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Logs unhandled errors to structured JSONL ring buffer instead of swallowing."""
    correlation_id = str(uuid.uuid4())[:8]
    logger = getattr(app.state, "logger", None)
    if logger:
        logger.error(
            "Unhandled server error on %s %s: %s",
            request.method,
            request.url.path,
            str(exc),
            exc_info=exc,
            extra={"correlation_id": correlation_id},
        )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "correlation_id": correlation_id},
    )


@app.get("/health", response_model=HealthCheckResponse, tags=["Health"])
@app.get("/api/health", response_model=HealthCheckResponse, tags=["Health"])
async def health_check() -> HealthCheckResponse:
    """Returns application health, SQLite WAL mode, and startup verification state."""
    startup = getattr(app.state, "startup_status", None)
    active_mode = getattr(app.state, "journal_mode", "unknown")

    return HealthCheckResponse(
        status="ok",
        app_name=settings.app_name,
        environment=settings.environment,
        journal_mode=active_mode,
        timestamp=datetime.now(timezone.utc),
        startup_check=startup,
        details={
            "db_path": str(settings.db_path),
            "error_log_path": str(settings.error_log_path),
        },
    )


def validate_run_kinematics(sub: LeaderboardSubmissionRequest) -> None:
    """Enforces server-side simulation sanity and anti-tampering bounds."""
    if sub.cartridge_id == "oregon_1848":
        max_trail_distance = 2500.0
        max_speed_per_turn = 60.0  # Max daily kinematics <= 60 miles/turn
        min_win_distance = 1950.0  # Willamette Valley threshold
        min_win_turns = 15
    elif sub.cartridge_id == "pacific_2026":
        max_trail_distance = 1200.0
        max_speed_per_turn = 250.0  # Max freeway speed per step <= 250 km/turn
        min_win_distance = 900.0  # Brisbane threshold
        min_win_turns = 4
    else:
        raise HTTPException(status_code=400, detail="Unsupported cartridge identifier")

    if sub.distance > max_trail_distance:
        raise HTTPException(
            status_code=400,
            detail=f"Distance {sub.distance} exceeds max trail limit of {max_trail_distance}",
        )

    avg_speed = sub.distance / max(sub.turns, 1)
    if avg_speed > max_speed_per_turn:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Average speed {avg_speed:.1f}/turn violates kinematic ceiling "
                f"({max_speed_per_turn})"
            ),
        )

    if sub.status == "WON":
        if sub.distance < min_win_distance:
            raise HTTPException(
                status_code=400,
                detail=f"Won run requires distance >= {min_win_distance}, got {sub.distance}",
            )
        if sub.turns < min_win_turns:
            raise HTTPException(
                status_code=400,
                detail=f"Won run requires at least {min_win_turns} turns, got {sub.turns}",
            )

    if sub.score > 35000:
        raise HTTPException(
            status_code=400,
            detail=f"Score {sub.score} exceeds maximum possible simulation score",
        )


@app.post("/api/leaderboard", tags=["Leaderboard"])
async def submit_leaderboard(
    submission: LeaderboardSubmissionRequest,
    conn: Annotated[sqlite3.Connection, Depends(get_db)],
) -> dict[str, Any]:
    """Validates run kinematics and records final score and memorial into SQLite."""
    validate_run_kinematics(submission)
    recorded_at = datetime.now(timezone.utc).isoformat()
    row_id = insert_leaderboard_entry(
        conn=conn,
        cartridge_id=submission.cartridge_id,
        player_name=submission.player_name,
        score=submission.score,
        turns=submission.turns,
        distance=submission.distance,
        status=submission.status,
        recorded_at=recorded_at,
        epitaph=submission.epitaph,
    )
    return {
        "status": "recorded",
        "id": row_id,
        "score": submission.score,
        "recorded_at": recorded_at,
    }


@app.get("/api/leaderboard", response_model=LeaderboardResponse, tags=["Leaderboard"])
async def get_leaderboard(
    cartridge_id: Annotated[
        str,
        Query(pattern=r"^(oregon_1848|pacific_2026)$"),
    ] = "oregon_1848",
    limit: Annotated[int, Query(ge=1, le=50)] = 10,
    conn: Annotated[sqlite3.Connection, Depends(get_db)] = None,  # type: ignore[assignment]
) -> LeaderboardResponse:
    """Returns top scores and historical roadside memorials for the cartridge."""
    high_scores_raw = get_leaderboard_entries(conn=conn, cartridge_id=cartridge_id, limit=limit)
    memorials_raw = get_memorial_entries(conn=conn, cartridge_id=cartridge_id, limit=20)

    return LeaderboardResponse(
        cartridge_id=cartridge_id,
        high_scores=[LeaderboardEntry(**entry) for entry in high_scores_raw],
        memorials=[LeaderboardEntry(**entry) for entry in memorials_raw],
    )


@app.get("/", include_in_schema=False)
async def serve_index() -> FileResponse:
    """Serves the single-page application static entrypoint."""
    index_file = static_dir / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return FileResponse(Path(__file__).resolve().parent / "static" / "index.html")
