"""Golden Repo Guardrails & Project Command Center Hygiene Scorer.

Drop into `app/core/guardrails.py` across your Python/FastAPI projects.
Provides:
1. Fail-fast startup environment & SQLite WAL validation.
2. Online SQLite WAL-safe backup (`sqlite3.Connection.backup`) with `PRAGMA quick_check`,
   SHA-256 deduplication, and 1-hour hot-reload cooldown.
3. Structured JSONL error ring-buffer (`logs/errors.jsonl`) with correlation IDs.
4. Outbound HTTP/API circuit breaker & exponential backoff decorator
   (`timeout=15.0`, `max_retries=3`).
5. Local FastAPI rate-limit guard against runaway frontend loops.
6. Stack-aware 100-point Enterprise Hygiene Scorer for Project Command Center.
"""

from __future__ import annotations

from collections import deque
from collections.abc import Callable
from datetime import datetime, timezone
import functools
import hashlib
import json
import logging
import os
from pathlib import Path
import re
import sqlite3
import time
import traceback
from typing import Any, TypeVar
import uuid

F = TypeVar("F", bound=Callable[..., Any])

# ---------------------------------------------------------------------------
# 1. Structured JSONL Error Ring-Buffer & Logger
# ---------------------------------------------------------------------------


class JsonlRingBufferHandler(logging.Handler):
    """Writes ERROR/CRITICAL logs to a capped JSONL file for dashboard & AI inspection."""

    def __init__(self, log_path: Path, max_records: int = 50) -> None:
        super().__init__(level=logging.ERROR)
        self.log_path = log_path
        self.max_records = max_records
        self.log_path.parent.mkdir(parents=True, exist_ok=True)

    def emit(self, record: logging.LogRecord) -> None:
        try:
            existing: deque[str] = deque(maxlen=self.max_records)
            if self.log_path.exists():
                with self.log_path.open("r", encoding="utf-8") as fh:
                    for line in fh:
                        if line.strip():
                            existing.append(line.strip())

            payload = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "level": record.levelname,
                "correlation_id": getattr(record, "correlation_id", str(uuid.uuid4())[:8]),
                "module": f"{record.module}:{record.lineno}",
                "message": record.getMessage(),
                "traceback": (
                    "".join(traceback.format_exception(*record.exc_info))
                    if record.exc_info
                    else None
                ),
            }
            existing.append(json.dumps(payload, ensure_ascii=False))
            with self.log_path.open("w", encoding="utf-8") as fh:
                fh.write("\n".join(existing) + "\n")
        except Exception:  # noqa: BLE001
            self.handleError(record)


def configure_structured_logging(
    app_name: str = "app",
    error_log_path: str | Path = "logs/errors.jsonl",
) -> logging.Logger:
    """Configures console logging plus the capped JSONL error ring-buffer."""
    logger = logging.getLogger(app_name)
    if logger.handlers:
        return logger

    logger.setLevel(logging.INFO)
    console = logging.StreamHandler()
    console.setFormatter(
        logging.Formatter("%(asctime)s | %(levelname)-7s | %(name)s:%(lineno)d | %(message)s")
    )
    logger.addHandler(console)
    logger.addHandler(JsonlRingBufferHandler(Path(error_log_path)))
    return logger


# ---------------------------------------------------------------------------
# 2. WAL-Safe Online SQLite Snapshot Utility
# ---------------------------------------------------------------------------


def _sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()


def init_wal_sqlite(db_path: str | Path) -> sqlite3.Connection:
    """Opens a SQLite connection with WAL mode, foreign keys, and busy timeout enabled."""
    path = Path(db_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path), timeout=5.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    conn.execute("PRAGMA busy_timeout=5000;")
    return conn


def safe_sqlite_backup(
    db_path: str | Path,
    backup_dir: str | Path = "backups",
    max_backups: int = 7,
    min_interval_seconds: int = 3600,
) -> Path | None:
    """Creates a transactional WAL-safe backup using `sqlite3.Connection.backup()`.

    Skips backup if:
    - The source database does not exist or is 0 bytes.
    - A backup was already created within `min_interval_seconds` (prevents hot-reload thrashing).
    - `PRAGMA quick_check` fails on the source DB.
    - The database SHA-256 matches the latest existing backup.
    """
    src_path = Path(db_path)
    if not src_path.exists() or src_path.stat().st_size == 0:
        return None

    bdir = Path(backup_dir)
    bdir.mkdir(parents=True, exist_ok=True)
    existing_backups = sorted(bdir.glob(f"{src_path.stem}_*.db"))

    now = time.time()
    if existing_backups:
        latest = existing_backups[-1]
        if (now - latest.stat().st_mtime) < min_interval_seconds:
            return None

    # Verify source DB integrity before snapshotting
    with sqlite3.connect(str(src_path)) as src_conn:
        check = src_conn.execute("PRAGMA quick_check;").fetchone()
        if not check or check[0] != "ok":
            raise RuntimeError(f"SQLite integrity check failed on {src_path}: {check}")

        stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        temp_dst = bdir / f".tmp_{src_path.stem}_{stamp}.db"
        final_dst = bdir / f"{src_path.stem}_{stamp}.db"

        with sqlite3.connect(str(temp_dst)) as dst_conn:
            src_conn.backup(dst_conn)

    # Deduplicate if content is byte-identical to the most recent snapshot
    if existing_backups and _sha256_file(temp_dst) == _sha256_file(existing_backups[-1]):
        temp_dst.unlink(missing_ok=True)
        return None

    temp_dst.replace(final_dst)

    # Rotate older backups beyond max_backups
    all_backups = sorted(bdir.glob(f"{src_path.stem}_*.db"))
    for old_backup in all_backups[:-max_backups]:
        old_backup.unlink(missing_ok=True)

    return final_dst


# ---------------------------------------------------------------------------
# 3. Fail-Fast Startup Self-Check
# ---------------------------------------------------------------------------


def run_startup_self_check(
    required_env_keys: list[str],
    db_path: str | Path = "projects.db",
    backup_dir: str | Path = "backups",
) -> dict[str, Any]:
    """Validates required environment keys, initializes WAL SQLite, and runs a safe backup."""
    missing_keys = [key for key in required_env_keys if not os.getenv(key, "").strip()]
    if missing_keys:
        raise RuntimeError(
            "Fail-Fast Startup Check Failed: Missing required environment variables: "
            f"{missing_keys}. Check your .env file against .env.example."
        )

    backup_created = safe_sqlite_backup(db_path=db_path, backup_dir=backup_dir)
    conn = init_wal_sqlite(db_path)
    journal_mode = conn.execute("PRAGMA journal_mode;").fetchone()[0]
    conn.close()

    return {
        "status": "ok",
        "db_path": str(db_path),
        "journal_mode": journal_mode,
        "backup_created": str(backup_created) if backup_created else None,
    }


# ---------------------------------------------------------------------------
# 4. Outbound Circuit Breaker & Sliding-Window Rate Limiter
# ---------------------------------------------------------------------------


class SlidingWindowRateLimiter:
    """Enforces per-window call ceilings (e.g., Free Tier RPM / local route protection)."""

    def __init__(self, max_calls: int, window_seconds: float) -> None:
        self.max_calls = max_calls
        self.window_seconds = window_seconds
        self.timestamps: deque[float] = deque()

    def allow_request(self) -> tuple[bool, float]:
        """Returns (allowed, retry_after_seconds)."""
        now = time.monotonic()
        while self.timestamps and (now - self.timestamps[0]) >= self.window_seconds:
            self.timestamps.popleft()

        if len(self.timestamps) >= self.max_calls:
            retry_after = max(0.1, self.window_seconds - (now - self.timestamps[0]))
            return False, round(retry_after, 2)

        self.timestamps.append(now)
        return True, 0.0


def with_circuit_breaker(
    max_retries: int = 3,
    base_delay_seconds: float = 1.0,
    logger: logging.Logger | None = None,
) -> Callable[[F], F]:
    """Decorator enforcing bounded retries with exponential backoff and zero silent swallowing."""

    def decorator(func: F) -> F:
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            last_exc: Exception | None = None
            for attempt in range(1, max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except Exception as exc:
                    last_exc = exc
                    if attempt == max_retries:
                        if logger:
                            logger.error(
                                "Circuit breaker tripped in %s after %d attempts: %s",
                                func.__name__,
                                max_retries,
                                exc,
                                exc_info=True,
                            )
                        raise
                    delay = base_delay_seconds * (2 ** (attempt - 1))
                    if logger:
                        logger.warning(
                            "Transient failure in %s (attempt %d/%d): %s. Retrying in %.1fs",
                            func.__name__,
                            attempt,
                            max_retries,
                            exc,
                            delay,
                        )
                    time.sleep(delay)
            raise RuntimeError(f"Unreachable circuit breaker state: {last_exc}")

        return wrapper  # type: ignore[return-value]

    return decorator


# ---------------------------------------------------------------------------
# 5. Pre-Flight Secret Scrubber (Protects Free Tier Gemini Calls)
# ---------------------------------------------------------------------------

SECRET_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("GOOGLE_API_KEY", re.compile(r"AIza[0-9A-Za-z\-_]{35}")),
    ("GITHUB_PAT", re.compile(r"(?:ghp|gho|ghu|ghs|ghr|github_pat)_[0-9A-Za-z_]{30,255}")),
    ("OPENAI_OR_ANTHROPIC_KEY", re.compile(r"sk-(?:proj-|ant-)?[0-9A-Za-z\-_]{20,}")),
    ("BEARER_TOKEN", re.compile(r"(?i)bearer\s+[0-9A-Za-z\-_\.~+/]+=*")),
]


def scrub_secrets_and_truncate(text: str, max_chars: int = 10000) -> str:
    """Redacts API keys/tokens and applies an head+tail character cap (8k head + 2k tail)."""
    sanitized = text
    for label, pattern in SECRET_PATTERNS:
        sanitized = pattern.sub(f"[REDACTED_{label}]", sanitized)

    if len(sanitized) <= max_chars:
        return sanitized

    head_chars = int(max_chars * 0.8)
    tail_chars = max_chars - head_chars
    omitted = len(sanitized) - max_chars
    return (
        f"{sanitized[:head_chars]}\n\n"
        f"... [TRUNCATED {omitted} CHARACTERS FOR FREE-TIER TOKEN BUDGET] ...\n\n"
        f"{sanitized[-tail_chars:]}"
    )


# ---------------------------------------------------------------------------
# 6. Project Command Center: Stack-Aware 100-Point Hygiene & API Scorer
# ---------------------------------------------------------------------------


def detect_api_and_provider_linkages(file_contents: dict[str, str]) -> dict[str, Any]:
    """Deterministically detects AI providers, SDK currency, and external API hooks."""
    combined = "\n".join(file_contents.values())
    providers: list[str] = []
    warnings: list[str] = []

    if (
        "google-genai" in combined
        or "from google import genai" in combined
        or "GEMINI_API_KEY" in combined
    ):
        providers.append("Google AI Studio (Gemini)")
    if "google.generativeai" in combined or "google-generativeai" in combined:
        providers.append("Google AI Studio (Legacy SDK)")
        warnings.append("Uses deprecated `google-generativeai` SDK; migrate to `google-genai`.")
    if "google-cloud-aiplatform" in combined or "vertexai" in combined:
        providers.append("Google Vertex AI (Paid/Enterprise)")
    if "OPENAI_API_KEY" in combined or "from openai import" in combined or '"openai"' in combined:
        providers.append("OpenAI API (Paid Per-Token)")
    if "ANTHROPIC_API_KEY" in combined or "anthropic" in combined:
        providers.append("Anthropic Claude API (Paid Per-Token)")

    return {
        "ai_providers": providers or ["None (Deterministic / Local)"],
        "has_active_ai_linkage": bool(providers),
        "sdk_warnings": warnings,
    }


def calculate_hygiene_score(
    tracked_files: list[str],
    file_contents: dict[str, str],
    audit_doc_updated_recently: bool = True,
) -> dict[str, Any]:
    """Evaluates a repository on the 100-point Stack-Aware Enterprise Hygiene Rubric.

    Args:
        tracked_files: Relative file paths in git tree (e.g., ["README.md", ".gitignore"]).
        file_contents: Mapping of lowercase filename to text content for harvested files.
        audit_doc_updated_recently: True if audit doc was updated in last 14 active days.
    """
    lower_files = {f.lower(): f for f in tracked_files}
    lower_contents = {k.lower(): v for k, v in file_contents.items()}

    # Detect stack archetype
    is_hardware = any(f.endswith((".ino", "platformio.ini")) for f in lower_files)
    is_static_web = (
        "index.html" in lower_files
        and "pyproject.toml" not in lower_files
        and "requirements.txt" not in lower_files
        and "package.json" not in lower_files
    )

    breakdown: dict[str, int] = {}
    missing_items: list[str] = []

    # 1. Secret Safety (25 pts)
    gitignore_text = lower_contents.get(".gitignore", "")
    env_tracked = ".env" in lower_files or any(f.endswith("/.env") for f in lower_files)
    gitignore_blocks_secrets = ".env" in gitignore_text and (
        "*.db" in gitignore_text or ".db" in gitignore_text or is_static_web
    )
    has_env_example = ".env.example" in lower_files or is_static_web or is_hardware

    if not env_tracked and gitignore_blocks_secrets and has_env_example:
        breakdown["secret_safety"] = 25
    elif not env_tracked and gitignore_blocks_secrets:
        breakdown["secret_safety"] = 15
        missing_items.append("Add `.env.example` template documenting required environment keys")
    else:
        breakdown["secret_safety"] = 0
        if env_tracked:
            missing_items.append(
                "CRITICAL: `.env` file is tracked in git tree; remove and rotate keys"
            )
        if not gitignore_blocks_secrets:
            missing_items.append("Update `.gitignore` to exclude `.env` and `*.db` files")

    # 2. Agent Constitution (20 pts)
    constitution_text = lower_contents.get("agents.md") or lower_contents.get("claude.md") or ""
    if len(constitution_text.strip()) >= 200:
        breakdown["agent_constitution"] = 20
    elif constitution_text.strip():
        breakdown["agent_constitution"] = 10
        missing_items.append(
            "Expand `AGENTS.md` / `CLAUDE.md` (>200 bytes) with stack & test gates"
        )
    else:
        breakdown["agent_constitution"] = 0
        missing_items.append("Add root `AGENTS.md` (or `CLAUDE.md`) constitution file")

    # 3. Automated Gates & Lockfile (20 pts)
    has_ci_or_precommit = ".pre-commit-config.yaml" in lower_files or any(
        f.startswith(".github/workflows/") and f.endswith((".yml", ".yaml")) for f in lower_files
    )
    has_lockfile = (
        any(
            lock in lower_files
            for lock in (
                "uv.lock",
                "poetry.lock",
                "package-lock.json",
                "pnpm-lock.yaml",
                "requirements.txt",
                "platformio.ini",
            )
        )
        or is_static_web
    )
    if has_ci_or_precommit and has_lockfile:
        breakdown["gates_and_lockfile"] = 20
    elif has_ci_or_precommit or has_lockfile:
        breakdown["gates_and_lockfile"] = 10
        if not has_ci_or_precommit:
            missing_items.append("Add `.pre-commit-config.yaml` or `.github/workflows/ci.yml`")
        if not has_lockfile:
            missing_items.append("Commit dependency lockfile (`uv.lock` or `package-lock.json`)")
    else:
        breakdown["gates_and_lockfile"] = 0
        missing_items.append("Add CI/pre-commit config and dependency lockfile")

    # 4. Verification Harness (20 pts)
    has_tests = any(
        "smoke_test.py" in f
        or f.startswith("tests/")
        or f.endswith(("_test.py", ".test.ts", ".spec.ts"))
        for f in lower_files
    )
    if has_tests:
        breakdown["verification_harness"] = 20
    else:
        breakdown["verification_harness"] = 0
        missing_items.append("Add `scripts/smoke_test.py` or `tests/` verification suite")

    # 5. Documentation & Audit Currency (15 pts)
    has_audit_docs = any(
        doc in lower_files
        for doc in ("decisions.md", "project_overview.md", "readme.md", "plan.md")
    )
    if has_audit_docs and audit_doc_updated_recently:
        breakdown["audit_currency"] = 15
    elif has_audit_docs:
        breakdown["audit_currency"] = 8
        missing_items.append(
            "Update `DECISIONS.md` or `PROJECT_OVERVIEW.md` to reflect latest commits"
        )
    else:
        breakdown["audit_currency"] = 0
        missing_items.append("Add `DECISIONS.md` or `README.md` architectural overview")

    total_score = sum(breakdown.values())
    return {
        "total_score": total_score,
        "grade": "A"
        if total_score >= 85
        else "B"
        if total_score >= 70
        else "C"
        if total_score >= 50
        else "D",
        "breakdown": breakdown,
        "missing_guardrails": missing_items,
        "api_telemetry": detect_api_and_provider_linkages(lower_contents),
    }
