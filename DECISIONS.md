# Architecture Decisions Log

Date: 2026-11-06
Decision: Initialize core FastAPI application skeleton, SQLite WAL layer (`app/db.py`), boundary schemas (`app/schemas.py`), and wire `app/core/guardrails.py` startup self-check, logging, and WAL verification into application lifespan.
Rationale: Enforces fail-fast startup hygiene, transaction safety, and structured diagnostics per AGENTS.md engineering contract before building functional features.

Date: 2026-11-06
Decision: Pivot UI architecture to Desktop-First Package specification (16:9/16:10 aspect shell, keyboard hotkeys, crisp virtual canvas scaling, and W3C pointer abstraction).
Rationale: User requirement to target desktop package initially with future mobile deploy readiness without rewriting core input or rendering.
