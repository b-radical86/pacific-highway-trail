"""Main FastAPI application entrypoint with guardrail lifecycle integration."""

from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
import uuid

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import get_settings
from app.core.guardrails import (
    configure_structured_logging,
    init_wal_sqlite,
    run_startup_self_check,
)
from app.db import init_db
from app.schemas import HealthCheckResponse, StartupStatus

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


@app.get("/", include_in_schema=False)
async def serve_index() -> FileResponse:
    """Serves the single-page application static entrypoint."""
    index_file = static_dir / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return FileResponse(Path(__file__).resolve().parent / "static" / "index.html")
