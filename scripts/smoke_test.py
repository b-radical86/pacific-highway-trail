"""Golden Path In-Process Smoke Test (`scripts/smoke_test.py`).

Runs in <2 seconds against an isolated temporary SQLite database without binding
to a live network port (so it never collides with an active server).

Usage:
    python3 scripts/smoke_test.py
"""

from __future__ import annotations

import os
from pathlib import Path
import sys
import tempfile

# Transparently delegate to local .venv if executed under an unprovisioned interpreter
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
VENV_PYTHON = PROJECT_ROOT / ".venv" / "bin" / "python3"
if VENV_PYTHON.exists() and sys.executable != str(VENV_PYTHON.resolve()):
    try:
        import fastapi  # noqa: F401
    except ImportError:
        os.execv(str(VENV_PYTHON), [str(VENV_PYTHON), *sys.argv])

# Support importing project modules
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from starlette.testclient import TestClient  # noqa: E402

from app.core.config import get_settings  # noqa: E402
from app.core.guardrails import (  # noqa: E402
    SlidingWindowRateLimiter,
    calculate_hygiene_score,
    configure_structured_logging,
    init_wal_sqlite,
    safe_sqlite_backup,
    scrub_secrets_and_truncate,
    with_circuit_breaker,
)
from app.main import app  # noqa: E402


def run_golden_path_smoke_test() -> None:
    """Executes verification of storage, backups, scrubber, circuit breaker, and health check."""
    with tempfile.TemporaryDirectory(prefix="smoke_test_") as tmp_dir:
        tmp_path = Path(tmp_dir)
        db_file = tmp_path / "test_projects.db"
        backup_dir = tmp_path / "backups"
        error_log = tmp_path / "logs" / "errors.jsonl"

        logger = configure_structured_logging("smoke_test", error_log_path=error_log)

        # 1. Verify SQLite WAL initialization & schema round-trip
        conn = init_wal_sqlite(db_file)
        journal_mode = conn.execute("PRAGMA journal_mode;").fetchone()[0]
        assert journal_mode.lower() == "wal", f"Expected WAL mode, got {journal_mode}"

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS repositories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name_with_owner TEXT UNIQUE NOT NULL,
                synced_stage TEXT NOT NULL,
                override_stage TEXT,
                ai_enabled INTEGER NOT NULL DEFAULT 1,
                hygiene_score INTEGER NOT NULL DEFAULT 0
            );
            """
        )
        conn.execute(
            "INSERT INTO repositories (name_with_owner, synced_stage, hygiene_score) "
            "VALUES (?, ?, ?);",
            ("user/project-command-center", "MVP In Progress", 95),
        )
        conn.commit()
        conn.close()

        # 2. Verify WAL-safe online backup & SHA-256 deduplication
        first_backup = safe_sqlite_backup(
            db_file,
            backup_dir=backup_dir,
            min_interval_seconds=0,
        )
        assert first_backup is not None and first_backup.exists(), (
            "First WAL backup was not created"
        )

        duplicate_backup = safe_sqlite_backup(
            db_file,
            backup_dir=backup_dir,
            min_interval_seconds=0,
        )
        assert duplicate_backup is None, "Identical DB should be skipped by SHA-256 deduplication"

        # 3. Verify pre-flight secret scrubbing
        raw_markdown = (
            "Sample config with leaked key AIzaSyD1234567890abcdefghijklmnopqrstuvwx "
            "and token ghp_1234567890abcdefghijklmnopqrstuvwxyzABCD"
        )
        scrubbed = scrub_secrets_and_truncate(raw_markdown, max_chars=500)
        assert "AIzaSyD" not in scrubbed and "[REDACTED_GOOGLE_API_KEY]" in scrubbed
        assert "ghp_12345" not in scrubbed and "[REDACTED_GITHUB_PAT]" in scrubbed

        # 4. Verify sliding-window rate limiter & circuit breaker
        limiter = SlidingWindowRateLimiter(max_calls=2, window_seconds=10.0)
        assert limiter.allow_request()[0] is True
        assert limiter.allow_request()[0] is True
        allowed_third, retry_after = limiter.allow_request()
        assert allowed_third is False and retry_after > 0

        attempts = 0

        @with_circuit_breaker(max_retries=3, base_delay_seconds=0.01, logger=logger)
        def flaky_operation() -> str:
            nonlocal attempts
            attempts += 1
            if attempts < 2:
                raise ConnectionError("Simulated transient 503 error")
            return "recovered"

        assert flaky_operation() == "recovered" and attempts == 2

        # 5. Verify 100-point Stack-Aware Hygiene & API Linkage Scorer
        sample_tree = [
            ".gitignore",
            ".env.example",
            "AGENTS.md",
            ".pre-commit-config.yaml",
            "uv.lock",
            "scripts/smoke_test.py",
            "DECISIONS.md",
        ]
        sample_contents = {
            ".gitignore": ".env\n*.db\n__pycache__/\n",
            ".env.example": "GITHUB_TOKEN=\nGEMINI_API_KEY=\n",
            "agents.md": "x" * 260 + "\nfrom google import genai\n",
            "decisions.md": "# Architecture Decisions\n",
        }
        hygiene = calculate_hygiene_score(
            sample_tree,
            sample_contents,
            audit_doc_updated_recently=True,
        )
        assert hygiene["total_score"] == 100, f"Expected 100 score, got {hygiene}"
        assert "Google AI Studio (Gemini)" in hygiene["api_telemetry"]["ai_providers"]

        # 6. Verify in-process FastAPI lifecycle & health check endpoint
        settings = get_settings()
        settings.db_path = tmp_path / "test_app_health.db"
        settings.backup_dir = tmp_path / "test_app_backups"
        settings.error_log_path = tmp_path / "logs" / "test_app_errors.jsonl"

        with TestClient(app) as client:
            resp = client.get("/health")
            assert resp.status_code == 200, f"Health check failed: {resp.text}"
            data = resp.json()
            assert data["status"] == "ok"
            assert data["app_name"] == "pacific-highway-trail"
            assert data["journal_mode"].lower() == "wal"
            assert data["startup_check"] is not None
            assert data["startup_check"]["journal_mode"].lower() == "wal"

            # Check /api/health alias
            alias_resp = client.get("/api/health")
            assert alias_resp.status_code == 200
            assert alias_resp.json()["status"] == "ok"

    print("SMOKE TEST PASSED: WAL SQLite, Backup, Scrubber, Circuit Breaker, & Health API OK.")


if __name__ == "__main__":
    run_golden_path_smoke_test()
