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
import {
  LANDMARK_CARDS,
  getLandmarkCardDataUri
} from './app/static/js/cartridges/landmark_cards.js';

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

// Phase 2 Schema Check: Every waypoint must have >= 2 talkPool dialogues
for (const cart of [OREGON_1848_CARTRIDGE, PACIFIC_2026_CARTRIDGE]) {
  for (const wp of cart.waypoints) {
    if (!Array.isArray(wp.talkPool) || wp.talkPool.length < 2) {
      throw new Error(`Waypoint ${wp.id} in ${cart.id} is missing valid talkPool`);
    }
    for (const entry of wp.talkPool) {
      if (!entry.speaker || !entry.quote || entry.quote.length < 5) {
        throw new Error(`Invalid talkPool quote at ${wp.id} in ${cart.id}`);
      }
    }
    if (wp.isBranchPoint) {
      if (!Array.isArray(wp.branches) || wp.branches.length < 2) {
        throw new Error(`Branch point ${wp.id} missing branches in ${cart.id}`);
      }
    }
  }
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
const gradStops = [];
const mockCtx = {
  setTransform: () => {},
  createLinearGradient: () => ({
    addColorStop: (offset, color) => { gradStops.push({ offset, color }); }
  }),
  createRadialGradient: () => ({
    addColorStop: (offset, color) => { ops.push('radialStop:' + offset); }
  }),
  createPattern: () => 'mockPattern',
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
  ellipse: () => { ops.push('ellipse'); },
  roundRect: () => {},
  fill: () => {},
  stroke: () => {},
  fillText: (t) => { ops.push('text:' + t); },
  save: () => {},
  restore: () => {},
  translate: () => {},
  rotate: () => { ops.push('rotate'); },
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
  pace: 'grueling',
  vfxFlags: { vfxStinkLines: true, vfxSongLoop: true },
  memorials: [{ name: 'Gary', distance: 5, epitaph: 'Stuck in Kempsey' }]
});
// Verify 4-stop volumetric sky gradients (0.0, 0.6, 0.85, 1.0) & 72 weather particles
if (!gradStops.some(s => s.offset === 0.6) || !gradStops.some(s => s.offset === 0.85)) {
  throw new Error('Expected 4-stop volumetric sky gradients with 0.6 and 0.85 stops');
}
if (ce._particles.length < 60 || ce._particles.length > 80) {
  throw new Error('Expected 60-80 weather particles, got ' + ce._particles.length);
}
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
if (!ops.includes('ellipse') || !ops.includes('rotate')) {
  throw new Error('Expected ground contact shadow ellipse and rotating wheel dust puffs');
}
ce.cartridgeId = 'oregon_1848';
ce.timeOfDay = 0.92; // Night composite lighting ('multiply' + 'screen' headlight beam)
ce.weather = 'SNOW';
ce.renderFrame();
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

// Keyboard aiming & firing assertions
pacificHunt.handleKeyDown('ArrowRight');
if (!pacificHunt.keyState.right) throw new Error('Key down state failed');
pacificHunt.update(0.1);
if (pacificHunt.crosshairX <= 320) throw new Error('Keyboard crosshair movement failed');
pacificHunt.handleKeyUp('ArrowRight');
if (pacificHunt.keyState.right) throw new Error('Key up state failed');
const keyHit = pacificHunt.handleKeyDown(' ');
if (typeof keyHit !== 'object') throw new Error('Keyboard fire return mismatch');

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

// Rest with food consumes rations and heals party (diminishing return on rest #2: 60% of 10 = 6)
restEngine.supplies.food = 10;
const healResult = restEngine.executeRest(false);
if (!healResult.success || !healResult.healed || healResult.hpGain !== 6) {
  throw new Error('Rest with food failed to heal: ' + JSON.stringify(healResult));
}
if (restEngine.supplies.food >= 10) throw new Error('Food was not consumed during rest');
if (restEngine.party[0].health !== 71) {
  throw new Error('HP gain mismatch: ' + restEngine.party[0].health);
}

// Test C: Commercial rest with insufficient cash falls back to rough camping
const bankruptEngine = new CoreTrailEngine({
  cartridgeId: 'pacific_2026',
  supplies: { food: 10, ammo: 0, partA: 0, partB: 0, partC: 0 },
  cashCents: 500, // < 2500 cents
  party: [{ name: 'Brad', role: 'primary', health: 50, morale: 50 }]
});
const brokeRest = bankruptEngine.executeRest(true);
if (!brokeRest.success || brokeRest.commercialPaid !== false || brokeRest.hpGain !== 10) {
  throw new Error('Bankrupt rest failed to downgrade: ' + JSON.stringify(brokeRest));
}
if (bankruptEngine.cashCents !== 500) {
  throw new Error('Bankrupt rest deducted cash unfairly: ' + bankruptEngine.cashCents);
}

// Commercial rest with sufficient cash gets luxury healing (+16 HP, +20 Morale)
const solventEngine = new CoreTrailEngine({
  cartridgeId: 'pacific_2026',
  supplies: { food: 10, ammo: 0, partA: 0, partB: 0, partC: 0 },
  cashCents: 5000,
  party: [{ name: 'Brad', role: 'primary', health: 50, morale: 50 }]
});
const luxuryRest = solventEngine.executeRest(true);
if (!luxuryRest.success || luxuryRest.commercialPaid !== true || luxuryRest.hpGain !== 16) {
  throw new Error('Solvent commercial rest failed: ' + JSON.stringify(luxuryRest));
}
if (solventEngine.cashCents !== 2500) {
  throw new Error('Solvent commercial fee not deducted: ' + solventEngine.cashCents);
}

// 11. CoreTrailEngine: buySupplies outfitter store checkout & traction propulsion
const shopEngine = new CoreTrailEngine({
  cartridgeId: 'pacific_2026',
  cashCents: 10000,
  supplies: { food: 0, ammo: 0, partA: 0, partB: 0, partC: 0 }
});
const testCatalog = [
  { id: 'food', label: 'Snacks', unitCostCents: 1500, bundleSize: 5 },
  { id: 'ammo', label: 'Coins', unitCostCents: 1000, bundleSize: 10 },
  { id: 'traction', label: 'Tyres', unitCostCents: 2000, bundleSize: 20 }
];
const buyFail = shopEngine.buySupplies({ food: 10 }, testCatalog);
if (buyFail.success !== false || buyFail.reason !== 'INSUFFICIENT_FUNDS') {
  throw new Error('buySupplies should fail on insufficient funds');
}
const buyOk = shopEngine.buySupplies({ food: 2, ammo: 1, traction: 2 }, testCatalog);
if (!buyOk.success || buyOk.spentCents !== 8000 || shopEngine.cashCents !== 2000) {
  throw new Error('buySupplies checkout deduction failed: ' + JSON.stringify(buyOk));
}
if (shopEngine.supplies.food !== 10 || shopEngine.supplies.ammo !== 10) {
  throw new Error('Inventory bundles mismatch: ' + JSON.stringify(shopEngine.supplies));
}
if (shopEngine.traction !== 100) {
  // Started at 100 default, +40 clamped to 100
  throw new Error('Traction cap mismatch: ' + shopEngine.traction);
}

// Outfitter catalogs must include traction (oxen / roadworthiness)
if (
  OREGON_1848_CARTRIDGE.outfitter[0].id !== 'traction' ||
  PACIFIC_2026_CARTRIDGE.outfitter[0].id !== 'traction'
) {
  throw new Error('Outfitter catalogs must have traction as first item');
}

// 12. Deliverable 1: Mid-Trail General Stores & Price Gouging
const midStoreEngine = new CoreTrailEngine({
  cartridgeId: 'oregon_1848',
  totalDistance: 2000,
  cashCents: 5000,
  outfitter: OREGON_1848_CARTRIDGE.outfitter,
  waypoints: OREGON_1848_CARTRIDGE.waypoints,
  supplies: { food: 10, ammo: 0, partA: 0, partB: 0, partC: 0 }
});
const catAtStart = midStoreEngine.getMidTrailStoreCatalog();
const startFoodPrice = catAtStart.find(i => i.id === 'food').unitCostCents;
midStoreEngine.distance = 1288; // Fort Hall
const catAtFortHall = midStoreEngine.getMidTrailStoreCatalog();
const fortHallFoodPrice = catAtFortHall.find(i => i.id === 'food').unitCostCents;
if (fortHallFoodPrice <= startFoodPrice) {
  throw new Error('Expected inflated store price at Fort Hall: ' + fortHallFoodPrice);
}
const buyMidOk = midStoreEngine.buyMidTrailItem('food', 2);
if (!buyMidOk.success || midStoreEngine.supplies.food !== 30) {
  throw new Error('buyMidTrailItem failed: ' + JSON.stringify(buyMidOk));
}
if (midStoreEngine.cashCents !== 5000 - (2 * fortHallFoodPrice)) {
  throw new Error('buyMidTrailItem cash deduction mismatch');
}
// Force soldOut on partA and verify rejection
catAtFortHall.find(i => i.id === 'partA').soldOut = true;
const buySoldOut = midStoreEngine.buyMidTrailItem('partA', 1);
if (buySoldOut.success !== false || buySoldOut.reason !== 'SOLD_OUT') {
  throw new Error('Expected SOLD_OUT failure, got: ' + JSON.stringify(buySoldOut));
}
const buyTooExpensive = midStoreEngine.buyMidTrailItem('food', 500);
if (buyTooExpensive.success !== false || buyTooExpensive.reason !== 'INSUFFICIENT_FUNDS') {
  throw new Error('Expected INSUFFICIENT_FUNDS failure');
}

// 13. Deliverable 2: On-Demand Barter & Desperation Multiplier
const barterEngine = new CoreTrailEngine({
  cartridgeId: 'oregon_1848',
  prngSeed: 99999,
  cashCents: 4200,
  barterConfig: OREGON_1848_CARTRIDGE.barterConfig,
  party: [{ name: 'Ezekiel', role: 'primary', health: 100, morale: 100, statusEffects: [] }],
  supplies: { food: 30, ammo: 40, partA: 0, partB: 2, partC: 2 }
});
// Seek partA (which player has 0 of -> triggers 1.75x desperation multiplier)
let tradeRes = null;
for (let i = 0; i < 10; i++) {
  const attempt = barterEngine.initiateTradeAttempt('partA');
  if (attempt.foundTrader) {
    tradeRes = attempt;
    break;
  }
}
if (!tradeRes || !tradeRes.offer || tradeRes.offer.desperate !== true) {
  throw new Error('Expected desperate trader offer for partA: ' + JSON.stringify(tradeRes));
}
if (tradeRes.offer.mDesp !== 1.75) {
  throw new Error('Expected mDesp=1.75, got: ' + tradeRes.offer.mDesp);
}
if (barterEngine.turn <= 1 || barterEngine.supplies.food >= 30) {
  throw new Error('Trade attempt must advance turn and consume rations');
}
// Top up demanded slot to ensure affordability and accept deal
const dSlot = tradeRes.offer.demandSlotKey;
if (dSlot === 'traction') {
  barterEngine.traction = 100;
} else {
  barterEngine.supplies[dSlot] = 100;
}
const acceptRes = barterEngine.acceptTradeOffer(tradeRes.offer);
if (!acceptRes.success || barterEngine.supplies.partA !== 1) {
  throw new Error('acceptTradeOffer failed to grant partA: ' + JSON.stringify(acceptRes));
}
if (barterEngine.cashCents !== 4200) {
  throw new Error('Barter must never modify cashCents, got: ' + barterEngine.cashCents);
}

// 14. Deliverable 3: Goods-for-Passage Bottleneck Guides
const snakeWp = OREGON_1848_CARTRIDGE.waypoints.find(w => w.id === 'wp_snake');
if (!snakeWp || !snakeWp.obstacle || !snakeWp.obstacle.guideCost) {
  throw new Error('Missing guideCost on Snake River waypoint');
}
barterEngine.activeObstacle = JSON.parse(JSON.stringify(snakeWp.obstacle));
barterEngine.supplies.partA = 0;
const guideFail = barterEngine.resolveObstacle('guide');
if (guideFail.success !== false || guideFail.error !== 'INSUFFICIENT_SUPPLIES') {
  throw new Error('Expected INSUFFICIENT_SUPPLIES for guide: ' + JSON.stringify(guideFail));
}
barterEngine.supplies.partA = 1;
const guideOk = barterEngine.resolveObstacle('guide');
if (guideOk.pSuccess !== 0.96 || barterEngine.supplies.partA !== 0) {
  throw new Error('Guide resolution failed to deduct partA: ' + JSON.stringify(guideOk));
}
if (barterEngine.cashCents !== 4200) {
  throw new Error('Guide barter must not deduct cashCents');
}

// 14b. Authentic 1985 Blind Barter, River Width/Depth Decay & Branching Forks
const blindEngine = new CoreTrailEngine({
  cartridgeId: 'pacific_2026',
  prngSeed: 7777,
  party: [{ name: 'Brad', role: 'primary', health: 100, morale: 100 }],
  supplies: { food: 50, ammo: 20, partA: 0, partB: 1, partC: 1 }
});
const blindRes = blindEngine.attemptBlindTrade();
if (typeof blindRes.foundTrader !== 'boolean') {
  throw new Error('attemptBlindTrade returned invalid structure');
}
if (blindEngine.turn !== 2 || blindEngine.supplies.food >= 50) {
  throw new Error('attemptBlindTrade must consume rations and increment turn');
}

// River Width / Depth Decay on 'delay'
const riverEngine = new CoreTrailEngine({
  cartridgeId: 'oregon_1848',
  prngSeed: 42,
  party: [{ name: 'Dave', role: 'primary', health: 100, morale: 100 }],
  supplies: { food: 40, ammo: 10, partA: 1, partB: 1, partC: 1 }
});
riverEngine.activeObstacle = {
  type: 'river',
  phi: 0.70,
  psi: 0.50,
  width: 400,
  depth: 7.0,
  costCents: 500,
  ferryWaitDays: 2
};
// 3-Case Parameterized Test for Crossing Mechanics per AGENTS.md Rule 6
// Case 1 (Failure Reproduction): 'delay' must NEVER cross the river
const startPhi = riverEngine.activeObstacle.phi;
const startWidth = riverEngine.activeObstacle.width;
const delayRes = riverEngine.resolveObstacle('delay');
const delayOk =
  delayRes.success &&
  delayRes.crossed === false &&
  riverEngine.activeObstacle !== null &&
  delayRes.newPhi < startPhi &&
  delayRes.newWidth < startWidth &&
  riverEngine.turn === 2 &&
  riverEngine.supplies.food === 37;
if (!delayOk) {
  throw new Error('Case 1 Failed: delay must not cross river: ' + JSON.stringify(delayRes));
}

// Case 2 (Adjacent Boundary): 'delay' during RAIN/STORM must swell river depth
riverEngine.activeObstacle.weather = 'RAIN';
const rainStartPhi = riverEngine.activeObstacle.phi;
const rainDelayRes = riverEngine.resolveObstacle('delay');
const rainDelayOk =
  rainDelayRes.success &&
  rainDelayRes.crossed === false &&
  riverEngine.activeObstacle !== null &&
  rainDelayRes.newPhi > rainStartPhi &&
  rainDelayRes.message.includes('swelled');
if (!rainDelayOk) {
  throw new Error('Case 2 Failed: rain delay: ' + JSON.stringify(rainDelayRes));
}

// Case 3 (Valid Crossing): 'pay' ferry burns queue wait days & CLEARS activeObstacle
const initialTurn = riverEngine.turn;
const payFerryRes = riverEngine.resolveObstacle('pay');
const expectedWaitTurn = initialTurn + 2;
const ferryPayOk =
  payFerryRes.success &&
  payFerryRes.crossed === true &&
  riverEngine.activeObstacle === null &&
  payFerryRes.ferryWaitDays === 2 &&
  riverEngine.turn === expectedWaitTurn;
if (!ferryPayOk) {
  throw new Error('Case 3 Failed: Ferry pay must cross river: ' + JSON.stringify(payFerryRes));
}

// Branching Forks
riverEngine.waypoints = [
  {
    id: 'wp_fork',
    name: 'South Pass Fork',
    distance: 100,
    branches: [
      { id: 'sublette', label: 'Sublette Cutoff', distanceDelta: -50, hazardMult: 1.5 },
      { id: 'bridger', label: 'Fort Bridger Detour', distanceDelta: 65, hazardMult: 0.85 }
    ]
  }
];
riverEngine.distance = 100;
const branchRes = riverEngine.selectBranch('sublette');
const branchOk =
  branchRes.success && branchRes.newHazardMultiplier === 1.5 && riverEngine.totalDistance === 1950;
if (!branchOk) {
  throw new Error('selectBranch failed: ' + JSON.stringify(branchRes));
}

// 15. HuntScene: Difficulty scaling, Biomes, and Barren spots
const easyHunt = new HuntScene({
  cartridgeId: 'oregon_1848',
  ammo: 20,
  difficultyMultiplier: 1.0,
  distance: 200,
  totalDistance: 2000
});
if (easyHunt.biome !== 'PLAINS' || easyHunt.maxTimer !== 28.0) {
  throw new Error('Easy hunt configuration mismatch: ' + JSON.stringify(easyHunt));
}
const hardHunt = new HuntScene({
  cartridgeId: 'oregon_1848',
  ammo: 20,
  difficultyMultiplier: 3.0,
  distance: 1000,
  totalDistance: 2000
});
if (hardHunt.biome !== 'WOODS' || hardHunt.maxTimer !== 16.0) {
  throw new Error('Hard hunt woods configuration mismatch: ' + JSON.stringify(hardHunt));
}
if (hardHunt.speedFactor !== 1.45 || hardHunt.maxTargetDensity > 2) {
  throw new Error('Hard hunt target pacing not properly capped: ' + hardHunt.speedFactor);
}

// 16. Landmark Cards Registry Verification
const requiredLandmarks = ['wp_coffs', 'wp_chimney', 'wp_ballina'];
for (const lmKey of requiredLandmarks) {
  const uri = getLandmarkCardDataUri(lmKey);
  if (!uri || !uri.startsWith('data:image/png;base64,') || uri.length < 1000) {
    throw new Error('Missing or invalid landmark card Data URI for ' + lmKey);
  }
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
