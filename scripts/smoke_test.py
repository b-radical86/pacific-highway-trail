"""Golden Path In-Process Smoke Test (`scripts/smoke_test.py`).

Runs in <2 seconds against an isolated temporary SQLite database without binding
to a live network port (so it never collides with an active server).

Usage:
    python3 scripts/smoke_test.py
"""

from __future__ import annotations

import os
from pathlib import Path
import subprocess
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


def verify_node_esm_engine(project_root: Path) -> None:
    """Invokes Node directly to run ESM assertions against production JS engine files."""
    node_test_script = """
import { PRNG } from './app/static/js/engine/prng.js';
import { CoreTrailEngine } from './app/static/js/engine/trail_engine.js';
import { EventManager } from './app/static/js/engine/event_manager.js';
import { OREGON_1848_CARTRIDGE } from './app/static/js/cartridges/oregon_1848.js';
import { PACIFIC_2026_CARTRIDGE } from './app/static/js/cartridges/pacific_2026.js';
import { CanvasEngine } from './app/static/js/canvas/canvas_engine.js';
import { RiverScene } from './app/static/js/scenes/river_scene.js';
import { HuntScene } from './app/static/js/scenes/hunt_scene.js';

// 1. PRNG determinism & state restore
const prng1 = new PRNG(12345);
const valA = prng1.next();
const state = prng1.getState();
const valB = prng1.next();

const prng2 = new PRNG(999);
prng2.setState(state);
const valC = prng2.next();
if (valB !== valC) throw new Error('PRNG state restore mismatch');

// 2. Kinematic & Waypoint Clamping
const engine = new CoreTrailEngine({
  cartridgeId: 'pacific_2026',
  dBase: 50,
  waypoints: [
    {
      id: 'wp_bridge',
      name: 'Bridge',
      distance: 30,
      obstacle: { phi: 0.4, psi: 0.5, costCents: 450 }
    }
  ],
  party: [
    { name: 'Brad', role: 'primary', health: 100, morale: 100 },
    { name: 'Tegan', role: 'primary', health: 100, morale: 100 }
  ]
});

const prep1 = engine.prepareStep();
if (prep1.targetDistance !== 30 || prep1.interruptType !== 'WAYPOINT') {
  throw new Error('Waypoint clamping failed: ' + JSON.stringify(prep1));
}
engine.commitStep(prep1);
if (engine.distance !== 30 || !engine.resolvedWaypoints.has('wp_bridge')) {
  throw new Error('Step commit failed');
}

// 3. Obstacle Resolution
if (!engine.activeObstacle) throw new Error('Active obstacle missing');
const payOutcome = engine.resolveObstacle('pay');
if (!payOutcome.success || payOutcome.costCents !== 675) {
  throw new Error('Obstacle pay resolution failed: ' + JSON.stringify(payOutcome));
}

// 4. Scoring bounds & 0 vitality edge cases
const emptyEngine = new CoreTrailEngine({
  cartridgeId: 'pacific_2026',
  party: [
    { name: 'Brad', role: 'primary', health: 0, morale: 0 }
  ]
});
const hazard = emptyEngine.evaluateHazardRoll();
if (isNaN(hazard.p) || hazard.p > 0.45) {
  throw new Error('Hazard roll NaN or exceed cap: ' + hazard.p);
}
const score = engine.calculateScore();
if (typeof score !== 'number' || score <= 0) {
  throw new Error('Score calculation failed: ' + score);
}

// 5. Cartridge Registries & Declarative Event DSL
if (OREGON_1848_CARTRIDGE.events.length !== 10) {
  throw new Error('1848 events mismatch: ' + OREGON_1848_CARTRIDGE.events.length);
}
if (PACIFIC_2026_CARTRIDGE.events.length !== 10) {
  throw new Error('2026 events mismatch: ' + PACIFIC_2026_CARTRIDGE.events.length);
}

const eventEngine = new CoreTrailEngine({
  cartridgeId: PACIFIC_2026_CARTRIDGE.id,
  party: PACIFIC_2026_CARTRIDGE.defaultParty,
  supplies: { food: 20, ammo: 10, partA: 1, partB: 1, partC: 1 },
  cashCents: 50000
});
const eventMgr = new EventManager(PACIFIC_2026_CARTRIDGE.events, prng1);

const adults = eventMgr.resolveTargets('role:adult', eventEngine);
if (adults.length !== 2) throw new Error('Expected 2 adults, got ' + adults.length);

const arthur = eventMgr.resolveTargets('member:Arthur', eventEngine);
if (arthur.length !== 1 || arthur[0].name !== 'Arthur (2)') {
  throw new Error('Arthur lookup failed');
}

const codeBrown = PACIFIC_2026_CARTRIDGE.events.find(e => e.id === 'EV_CODE_BROWN');
const receipt = eventMgr.executeChoice(eventEngine, codeBrown, codeBrown.choices[0]);
if (!receipt.success || eventEngine.supplies.partA !== 0 || arthur[0].status !== 'Clean') {
  throw new Error('Choice execution failed: ' + JSON.stringify(receipt));
}

// 6. CanvasEngine & Procedural Vector Renderers
const ops = [];
const mockCtx = {
  setTransform: () => {},
  createLinearGradient: () => ({ addColorStop: () => {} }),
  clearRect: () => {},
  fillRect: () => { ops.push('fillRect'); },
  strokeRect: () => {},
  beginPath: () => {},
  closePath: () => {},
  moveTo: () => {},
  lineTo: () => {},
  quadraticCurveTo: () => {},
  bezierCurveTo: () => { ops.push('bezier'); },
  arc: () => {},
  ellipse: () => {},
  roundRect: () => {},
  fill: () => {},
  stroke: () => {},
  fillText: (t) => { ops.push('text:' + t); },
  save: () => {},
  restore: () => {},
  translate: () => {},
  rotate: () => {},
  scale: () => {},
};
const mockCanvas = {
  width: 800,
  height: 400,
  getContext: () => mockCtx,
  getBoundingClientRect: () => ({ left: 100, top: 50, width: 1600, height: 800 }),
};
const ce = new CanvasEngine(mockCanvas, {
  cartridgeId: 'pacific_2026',
  vfxFlags: { vfxStinkLines: true, vfxSongLoop: true },
  memorials: [{ name: 'Gary', distance: 5, epitaph: 'Stuck in Kempsey' }]
});
if (ce.step(30.0) !== 0.05) throw new Error('dt clamp failed');
const pt = ce.toVirtualCoords(900, 450);
if (Math.abs(pt.x - 400) > 0.01 || Math.abs(pt.y - 200) > 0.01 || !pt.inBounds) {
  throw new Error('Coord normalization failed: ' + JSON.stringify(pt));
}
let tweenDone = false;
ce.startPhasedTravel('MIDDAY', 100, () => { tweenDone = true; });
ce.step(0.05);
ce.step(0.05);
if (!tweenDone || Math.abs(ce.timeOfDay - 0.48) > 0.01) {
  throw new Error('Phased travel MIDDAY interrupt failed');
}
ce.renderFrame();
if (!ops.includes('bezier')) throw new Error('Expected bezier stink lines in 2026 render');
ce.cartridgeId = 'oregon_1848';
ce.weather = 'RAIN';
ce.renderFrame();

// 7. RiverScene & Columbia Rafting mini-game
const river = new RiverScene({
  cartridgeId: 'oregon_1848',
  obstacle: { phi: 0.4, psi: 0.5, costCents: 500, label: 'Kansas River' }
});
river.startCrossingAnimation(true, 'Passed');
for (let i = 0; i < 30; i++) river.update(0.1);
if (river.state !== 'RESOLVED') throw new Error('River did not resolve');

const raft = new RiverScene({ cartridgeId: 'oregon_1848', isRaftingMiniGame: true });
raft.handlePointerDown(250, 200);
if (raft.raftX !== 250) throw new Error('Raft steer failed');
for (let i = 0; i < 160; i++) raft.update(0.1);
if (raft.raftTimer !== 0 || raft.state !== 'RESOLVED') throw new Error('Rafting did not end');

// 8. HuntScene pointer targets & carry cap
let huntResult = null;
const hunt = new HuntScene({
  cartridgeId: 'oregon_1848',
  ammo: 5,
  onComplete: (res) => { huntResult = res; }
});
hunt.entities.push({
  type: 'BISON', x: 400, y: 200, vx: 10, r: 28, yieldFood: 200, color: '#000'
});
hunt.handlePointerMove(402, 201);
if (hunt.crosshairX !== 402 || hunt.crosshairY !== 201) {
  throw new Error('Crosshair tracking failed');
}
const hitReceipt = hunt.handlePointerDown(402, 201);
if (!hitReceipt.hit || hunt.foodHarvested !== 200) throw new Error('Hunt hit failed');
while (hunt.ammo > 0) hunt.handlePointerDown(10, 10);
if (!huntResult || huntResult.foodYield !== 100) {
  throw new Error('Carry cap failed to limit food to 100');
}

// 2026 Rest-Stop Defence scene & render verification
const pacificHunt = new HuntScene({ cartridgeId: 'pacific_2026', ammo: 10 });
pacificHunt.handlePointerMove(320, 210);
pacificHunt.update(0.05);
pacificHunt.render(mockCtx, 800, 400);

// 9. StorageManager serialization & offline fallback
import { StorageManager } from './app/static/js/engine/storage.js';
const mockStore = {};
globalThis.localStorage = {
  getItem: (k) => mockStore[k] || null,
  setItem: (k, v) => { mockStore[k] = String(v); },
  removeItem: (k) => { delete mockStore[k]; }
};
const saved = StorageManager.saveGame({ cartridgeId: 'pacific_2026', distance: 150 });
if (!saved) throw new Error('Save game failed');
const loaded = StorageManager.loadGame();
if (!loaded || loaded.distance !== 150) throw new Error('Load game failed');
StorageManager.clearSave();
if (StorageManager.loadGame() !== null) throw new Error('Clear save failed');

// 10. CoreTrailEngine: executeRest & anti-exploit starvation mechanics
const restEngine = new CoreTrailEngine({
  cartridgeId: 'pacific_2026',
  supplies: { food: 0, ammo: 5, partA: 0, partB: 0, partC: 0 },
  cashCents: 5000,
  party: [{ name: 'Brad', role: 'primary', health: 80, morale: 80 }]
});
const starveResult = restEngine.executeRest(false);
if (starveResult.success !== false || starveResult.reason !== 'STARVATION') {
  throw new Error('Expected STARVATION rest failure, got: ' + JSON.stringify(starveResult));
}
const member = restEngine.party[0];
if (member.health !== 65 || member.morale !== 60 || member.status !== 'Starving') {
  throw new Error('Starvation health/morale/status penalty not applied correctly');
}

// Rest with food consumes rations and heals party (diminishing return on rest #2: 60% of 14 = 8)
restEngine.supplies.food = 10;
const healResult = restEngine.executeRest(false);
if (!healResult.success || !healResult.healed || healResult.hpGain !== 8) {
  throw new Error('Rest with food failed to heal: ' + JSON.stringify(healResult));
}
if (restEngine.supplies.food >= 10) throw new Error('Food was not consumed during rest');
if (restEngine.party[0].health !== 73) {
  throw new Error('HP gain mismatch: ' + restEngine.party[0].health);
}

// 11. CoreTrailEngine: buySupplies outfitter store checkout
const shopEngine = new CoreTrailEngine({
  cartridgeId: 'pacific_2026',
  cashCents: 10000,
  supplies: { food: 0, ammo: 0, partA: 0, partB: 0, partC: 0 }
});
const testCatalog = [
  { id: 'food', label: 'Snacks', unitCostCents: 1500, bundleSize: 5 },
  { id: 'ammo', label: 'Coins', unitCostCents: 1000, bundleSize: 10 }
];
const buyFail = shopEngine.buySupplies({ food: 10 }, testCatalog);
if (buyFail.success !== false || buyFail.reason !== 'INSUFFICIENT_FUNDS') {
  throw new Error('buySupplies should fail on insufficient funds');
}
const buyOk = shopEngine.buySupplies({ food: 2, ammo: 1 }, testCatalog);
if (!buyOk.success || buyOk.spentCents !== 4000 || shopEngine.cashCents !== 6000) {
  throw new Error('buySupplies checkout deduction failed: ' + JSON.stringify(buyOk));
}
if (shopEngine.supplies.food !== 10 || shopEngine.supplies.ammo !== 10) {
  throw new Error('Inventory bundles mismatch: ' + JSON.stringify(shopEngine.supplies));
}

console.log('NODE_ESM_ASSERTIONS_PASSED');
"""
    result = subprocess.run(
        ["node", "--input-type=module", "-e", node_test_script],
        cwd=str(project_root),
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(
            f"Node ESM engine verification failed (exit {result.returncode}):\n"
            f"STDOUT:\n{result.stdout}\nSTDERR:\n{result.stderr}"
        )
    assert "NODE_ESM_ASSERTIONS_PASSED" in result.stdout, "Missing success sentinel from Node test"


def run_golden_path_smoke_test() -> None:
    """Executes end-to-end storage, backups, scrubber, circuit breaker, API, and ESM tests."""
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

            # 7. Verify SQLite Leaderboard & Roadside Memorial API
            sub_1848 = {
                "cartridge_id": "oregon_1848",
                "player_name": "Pioneer Pete",
                "score": 8500,
                "turns": 45,
                "distance": 2000.0,
                "status": "WON",
                "epitaph": "Made it to Oregon!",
            }
            r1 = client.post("/api/leaderboard", json=sub_1848)
            assert r1.status_code == 200, f"Submit 1848 failed: {r1.text}"
            assert r1.json()["status"] == "recorded"
            assert r1.json()["id"] > 0

            sub_2026 = {
                "cartridge_id": "pacific_2026",
                "player_name": "Brad & Tegan",
                "score": 12400,
                "turns": 8,
                "distance": 920.0,
                "status": "WON",
                "epitaph": "Surviving the M1",
            }
            r2 = client.post("/api/leaderboard", json=sub_2026)
            assert r2.status_code == 200, f"Submit 2026 failed: {r2.text}"

            sub_died = {
                "cartridge_id": "oregon_1848",
                "player_name": "Gary",
                "score": 1200,
                "turns": 12,
                "distance": 450.0,
                "status": "DIED",
                "epitaph": "Here lies Gary. Died of dysentery.",
            }
            r3 = client.post("/api/leaderboard", json=sub_died)
            assert r3.status_code == 200, f"Submit died record failed: {r3.text}"

            # Verify Anti-Tampering & Kinematic Bounds
            tamper_speed = {
                "cartridge_id": "oregon_1848",
                "player_name": "Speed Cheater",
                "score": 15000,
                "turns": 1,
                "distance": 1000.0,
                "status": "DIED",
            }
            r_speed = client.post("/api/leaderboard", json=tamper_speed)
            assert r_speed.status_code == 400, "Should reject impossible velocity"

            tamper_win = {
                "cartridge_id": "oregon_1848",
                "player_name": "Short Cheater",
                "score": 9000,
                "turns": 30,
                "distance": 200.0,
                "status": "WON",
            }
            r_win = client.post("/api/leaderboard", json=tamper_win)
            assert r_win.status_code == 400, "Should reject win without reaching destination"

            tamper_score = {
                "cartridge_id": "pacific_2026",
                "player_name": "Score Cheater",
                "score": 99999,
                "turns": 10,
                "distance": 920.0,
                "status": "WON",
            }
            r_score = client.post("/api/leaderboard", json=tamper_score)
            assert r_score.status_code in (400, 422), "Should reject out-of-bound score"

            # Verify GET /api/leaderboard and Cartridge Isolation
            lb_1848 = client.get("/api/leaderboard?cartridge_id=oregon_1848").json()
            assert lb_1848["cartridge_id"] == "oregon_1848"
            assert len(lb_1848["high_scores"]) >= 2
            assert lb_1848["high_scores"][0]["player_name"] == "Pioneer Pete"
            assert lb_1848["high_scores"][0]["score"] == 8500
            assert any(
                m["player_name"] == "Gary" and m["distance"] == 450.0 for m in lb_1848["memorials"]
            ), "Gary's tombstone should be in memorials"

            lb_2026 = client.get("/api/leaderboard?cartridge_id=pacific_2026").json()
            assert lb_2026["cartridge_id"] == "pacific_2026"
            assert len(lb_2026["high_scores"]) >= 1
            assert lb_2026["high_scores"][0]["player_name"] == "Brad & Tegan"
            assert not any(h["player_name"] == "Pioneer Pete" for h in lb_2026["high_scores"])

            # 8. Verify clean server shutdown endpoint
            app.state.testing = True
            shutdown_resp = client.post("/api/shutdown")
            assert shutdown_resp.status_code == 200
            assert shutdown_resp.json()["status"] == "shutting_down"

    # 9. Cross-Language Node ESM Verification
    verify_node_esm_engine(PROJECT_ROOT)

    print(
        "SMOKE TEST PASSED: WAL SQLite, Backup, Scrubber, Circuit Breaker, Health API, "
        "& Node ESM Engine OK."
    )


if __name__ == "__main__":
    run_golden_path_smoke_test()
