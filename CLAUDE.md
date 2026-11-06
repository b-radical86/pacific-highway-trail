# AGENTS.md — Golden Repo AI Engineering Constitution

> **Mirror Note**: Symlink or copy this file to `CLAUDE.md` (`ln -s AGENTS.md CLAUDE.md`) so Google Antigravity, Claude Code, and Cursor enforce the exact same contract.

## 1. Core Architecture & Locked Tech Stack
- **Backend**: Python 3.11+, `FastAPI`, `Pydantic` v2 (`pydantic-settings`), `httpx`, SQLite in `WAL` mode (`PRAGMA journal_mode=WAL;`).
- **AI SDK**: Use ONLY the official `google-genai` SDK (`from google import genai`).
- **Frontend**: Single-process static delivery (`FastAPI StaticFiles` + Tailwind CSS + Alpine.js) unless explicitly specified otherwise.
- **Package Management**: Use `uv` (`uv.lock`) or `pip` with pinned `requirements.txt`.

## 2. Strictly Forbidden AI Anti-Patterns (Zero Tolerance)
1. **NO Silent Exception Swallowing**: Never write bare `except:`, `except Exception: pass`, or return empty/mock fallback data inside an `except` block to hide a failure. Log the full traceback to `logs/errors.jsonl` and raise an explicit error or `HTTPException`.
2. **NO Legacy Gemini SDKs**: Never import `google.generativeai` or call `genai.configure()`. Always instantiate `client = genai.Client(api_key=...)` from `google-genai`.
3. **NO Raw File-Copy SQLite Backups**: Never copy `.db` files with `cp` or `shutil.copy` while `WAL` mode is active. Always use `guardrails.safe_sqlite_backup()` (`sqlite3.Connection.backup`).
4. **NO Hardcoded Secrets or Unbounded Network Calls**: Never hardcode API keys (`AIza...`, `ghp_...`, `sk-...`) even for "quick tests". Every outbound HTTP/LLM request must specify an explicit `timeout` (<= 15.0s) and `max_retries` (<= 3).
5. **NO Unscoped Multi-Feature Refactors**: Modify at most 2–3 files per task. Do not refactor unrelated modules or rename database columns without an explicit migration step.

## 3. Mandatory Workflow & Atomic Commit Protocol
1. **Before Writing Code**: Read `DECISIONS.md` (or `PROJECT_OVERVIEW.md`) and verify the existing schema in `app/db.py` / `app/schemas.py`.
2. **Boundary Contracts First**: Define or update `Pydantic` input/output schemas before implementing route handlers or LLM prompts.
3. **Pre-Completion Verification Gate (MANDATORY)**: Before reporting any task as complete, you MUST run and pass both commands:
   ```bash
   python3 scripts/smoke_test.py
   ruff check . --select E,F,B,BLE001,S110,B904
   ```
4. **Audit Trail Update**: When changing architecture, schemas, or external API integrations, append a 3-line entry (`Date | Decision | Rationale`) to `DECISIONS.md`.
5. **Atomic Commit**: Commit immediately once the smoke test and linter pass (`git add -A && git commit -m "feat/fix: concise summary"`). Never pass `--no-verify`.
