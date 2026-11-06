# Architecture Decisions Log

Date: 2026-11-06
Decision: Initialize core FastAPI application skeleton, SQLite WAL layer (`app/db.py`), boundary schemas (`app/schemas.py`), and wire `app/core/guardrails.py` startup self-check, logging, and WAL verification into application lifespan.
Rationale: Enforces fail-fast startup hygiene, transaction safety, and structured diagnostics per AGENTS.md engineering contract before building functional features.

Date: 2026-11-06
Decision: Pivot UI architecture to Desktop-First Package specification (16:9/16:10 aspect shell, keyboard hotkeys, crisp virtual canvas scaling, and W3C pointer abstraction).
Rationale: User requirement to target desktop package initially with future mobile deploy readiness without rewriting core input or rendering.

Date: 2026-11-06
Decision: Implement Phase 1 deterministic simulation engine (`prng.js`, `trail_engine.js`) with two-phase step preparation (`prepareStep`), waypoint clamping, dynamic hazard entropy, and Node ESM smoke test runner.
Rationale: Decouples headless simulation logic from presentation layer and eliminates duplicate Python math ports by testing production ES modules directly via Node in `scripts/smoke_test.py`.

Date: 2026-11-06
Decision: Implement Phase 2 cartridge registries (`oregon_1848.js`, `pacific_2026.js`) and role-aware declarative event DSL (`event_manager.js`).
Rationale: Enables completely declarative hazard/opportunity execution across both cartridges with role/named target resolution and state-dependent weighting without bespoke JavaScript.

Date: 2026-11-06
Decision: Implement Phase 3 procedural 2D vector canvas pipeline (`canvas_engine.js`, `renderers_1848.js`, `renderers_2026.js`) with DPR scaling, cached sky gradients, phased travel animation hooks, and coordinate normalization.
Rationale: Guarantees 60 FPS zero-allocation vector rendering across both cartridges, accurate letterbox pointer mapping, and complete decoupling from Alpine DOM reactivity.

Date: 2026-11-06
Decision: Implement Phase 4 interactive obstacle crossings (`river_scene.js`) and 30-second pointer-normalized target mini-games (`hunt_scene.js`).
Rationale: Delivers cartridge-adaptive river/gridlock obstacle physics, The Dalles canyon rapids steering, and touch/pointer-safe hunting/rest-stop defence with authentic carry caps.

Date: 2026-11-06
Decision: Implement Phase 5 desktop command UI (`app/static/index.html`), phased travel animation sequencer (`app.js`), and procedural Web Audio synthesizer (`audio_synth.js`).
Rationale: Integrates Alpine.js reactive presentation with headless simulation state, provides keyboard hotkey loop ([Space], [R], [P], [1-4]), and unlocks zero-dependency procedural audio.

Date: 2026-11-06
Decision: Implement Phase 6 SQLite leaderboard/memorial persistence (`POST`/`GET /api/leaderboard`), client storage manager (`storage.js`), server-side kinematic bounds validation, and turn-boundary auto-save.
Rationale: Persists high scores and player roadside tombstones across game runs with anti-tampering velocity/score ceilings and offline queuing without external dependencies.

Date: 2026-11-06
Decision: Implement standalone desktop launcher (`launch.command`), clean shutdown endpoint (`POST /api/shutdown`), and UI exit confirmation modal with auto-save.
Rationale: Allows one-click desktop launching without terminal interaction and guarantees graceful uvicorn/SQLite WAL termination on application exit.

Date: 2026-11-06
Decision: Vendor Alpine.js ESM build (`/static/vendor/alpine.esm.js`) and initialize via explicit `Alpine.data()` and `Alpine.start()` within the module bundle.
Rationale: Resolves browser evaluation race condition where deferred CDN script initialized `x-data` before ES module evaluation, restoring instant reactive data binding and offline reliability.

Date: 2026-11-06
Decision: Overhaul Rest-Stop Defence / Hunting mini-game (`hunt_scene.js`) with real-time pointer tracking, animated crosshair reticle, dynamic lock-on state, and rich procedural vector artwork.
Rationale: Resolves stationary crosshair reticle, replaces basic solid rectangles with high-detail coastal rest stop scenery (picnic table, wheelie bin, surf waves), animated flapping birds, and particle bursts.

Date: 2026-11-06
Decision: Implement difficulty selection (`screen: 'SETUP'`), pre-departure outfitter store (`screen: 'OUTFITTER'`), and anti-exploit survival mechanics (`executeRest` starvation attrition, diminishing returns, and pace wear).
Rationale: Resolves trivial game completion by forcing upfront archetype/budget selection, eliminating infinite free healing when food is depleted, and enforcing realistic pace/starvation attrition.

Date: 2026-11-06
Decision: Harden keyboard routing (`handleSetupKeys`/`handleOutfitterKeys`/`handleTrailKeys`), patch commercial lodging loophole, add zero-food departure and starvation rest confirmation modals, and isolate outfitter cart across cartridge switches.
Rationale: Resolves expert panel vulnerabilities (keyboard bleed during setup, free luxury lodging when bankrupt, accidental instant party wipes on zero rations, and cross-cartridge cart contamination).
