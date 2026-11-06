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
                    turns INTEGER NOT NULL DEFAULT 1,
                    distance REAL NOT NULL DEFAULT 0.0,
                    status TEXT NOT NULL DEFAULT 'DIED',
                    recorded_at TEXT NOT NULL,
                    epitaph TEXT
                );
                """
            )
            # Safe schema migration for pre-existing leaderboards tables
            cursor = conn.execute("PRAGMA table_info(leaderboards);")
            cols = {row[1] for row in cursor.fetchall()}
            if "turns" not in cols:
                conn.execute(
                    "ALTER TABLE leaderboards ADD COLUMN turns INTEGER NOT NULL DEFAULT 1;"
                )
            if "distance" not in cols:
                conn.execute(
                    "ALTER TABLE leaderboards ADD COLUMN distance REAL NOT NULL DEFAULT 0.0;"
                )
            if "status" not in cols:
                conn.execute(
                    "ALTER TABLE leaderboards ADD COLUMN status TEXT NOT NULL DEFAULT 'DIED';"
                )
    finally:
        conn.close()


def insert_leaderboard_entry(
    conn: sqlite3.Connection,
    cartridge_id: str,
    player_name: str,
    score: int,
    turns: int,
    distance: float,
    status: str,
    recorded_at: str,
    epitaph: str | None = None,
) -> int:
    """Inserts a verified run outcome into SQLite and returns the row id."""
    with conn:
        cursor = conn.execute(
            """
            INSERT INTO leaderboards (
                cartridge_id, player_name, score, turns, distance, status, recorded_at, epitaph
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
            """,
            (cartridge_id, player_name, score, turns, distance, status, recorded_at, epitaph),
        )
        return int(cursor.lastrowid)


def get_leaderboard_entries(
    conn: sqlite3.Connection,
    cartridge_id: str,
    limit: int = 10,
) -> list[dict]:
    """Retrieves top scoring completed runs for the specified cartridge."""
    cursor = conn.execute(
        """
        SELECT id, cartridge_id, player_name, score, turns, distance, status, recorded_at, epitaph
        FROM leaderboards
        WHERE cartridge_id = ?
        ORDER BY score DESC, turns ASC, id ASC
        LIMIT ?;
        """,
        (cartridge_id, limit),
    )
    rows = cursor.fetchall()
    return [
        {
            "id": row[0],
            "cartridge_id": row[1],
            "player_name": row[2],
            "score": row[3],
            "turns": row[4],
            "distance": float(row[5]),
            "status": row[6],
            "recorded_at": row[7],
            "epitaph": row[8],
        }
        for row in rows
    ]


def get_memorial_entries(
    conn: sqlite3.Connection,
    cartridge_id: str,
    limit: int = 20,
) -> list[dict]:
    """Retrieves past roadside tombstones and markers for the specified cartridge."""
    cursor = conn.execute(
        """
        SELECT id, cartridge_id, player_name, score, turns, distance, status, recorded_at, epitaph
        FROM leaderboards
        WHERE cartridge_id = ? AND distance > 0 AND (status = 'DIED' OR epitaph IS NOT NULL)
        ORDER BY distance ASC, id DESC
        LIMIT ?;
        """,
        (cartridge_id, limit),
    )
    rows = cursor.fetchall()
    return [
        {
            "id": row[0],
            "cartridge_id": row[1],
            "player_name": row[2],
            "score": row[3],
            "turns": row[4],
            "distance": float(row[5]),
            "status": row[6],
            "recorded_at": row[7],
            "epitaph": row[8],
        }
        for row in rows
    ]


def get_db(db_path: str | Path | None = None) -> Generator[sqlite3.Connection, None, None]:
    """Dependency for acquiring a scoped WAL-configured SQLite connection."""
    resolved_path = Path(db_path) if db_path else get_settings().db_path
    conn = init_wal_sqlite(resolved_path)
    try:
        yield conn
    finally:
        conn.close()
