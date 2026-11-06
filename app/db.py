"""Database Access Layer & SQLite WAL Session Management."""

from __future__ import annotations

from collections.abc import Generator
from pathlib import Path
import sqlite3

from app.core.config import get_settings
from app.core.guardrails import init_wal_sqlite


def init_db(db_path: str | Path | None = None) -> None:
    """Initializes the SQLite schema in WAL mode with baseline tables."""
    resolved_path = Path(db_path) if db_path else get_settings().db_path
    conn = init_wal_sqlite(resolved_path)
    try:
        with conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS system_metadata (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS runs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    cartridge_id TEXT NOT NULL,
                    player_name TEXT NOT NULL,
                    final_score INTEGER NOT NULL DEFAULT 0,
                    completed INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL
                );
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS leaderboards (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    cartridge_id TEXT NOT NULL,
                    player_name TEXT NOT NULL,
                    score INTEGER NOT NULL,
                    recorded_at TEXT NOT NULL,
                    epitaph TEXT
                );
                """
            )
    finally:
        conn.close()


def get_db(db_path: str | Path | None = None) -> Generator[sqlite3.Connection, None, None]:
    """Dependency for acquiring a scoped WAL-configured SQLite connection."""
    resolved_path = Path(db_path) if db_path else get_settings().db_path
    conn = init_wal_sqlite(resolved_path)
    try:
        yield conn
    finally:
        conn.close()
