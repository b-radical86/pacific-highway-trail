/**
 * Main Alpine.js Desktop Application Controller & Sequencer.
 *
 * Enforces strict 3-tier boundary:
 * 1. CoreTrailEngine: Plain non-reactive simulation state.
 * 2. CanvasEngine: Frame-rate independent 60 FPS vector renderer.
 * 3. Alpine State: Shallow immutable snapshot for reactive DOM updates.
 */

import { CoreTrailEngine } from '../engine/trail_engine.js';
import { EventManager } from '../engine/event_manager.js';
import { CanvasEngine } from '../canvas/canvas_engine.js';
import { RiverScene } from '../scenes/river_scene.js';
import { HuntScene } from '../scenes/hunt_scene.js';
import { sound } from './audio_synth.js';
import { StorageManager } from '../engine/storage.js';
import { OREGON_1848_CARTRIDGE } from '../cartridges/oregon_1848.js';
import { PACIFIC_2026_CARTRIDGE } from '../cartridges/pacific_2026.js';

export function createTrailApp() {
  return {
    // Current Mode & Active Cartridge
    screen: 'SETUP', // 'SETUP' | 'OUTFITTER' | 'GAME'
    cartridgeId: 'pacific_2026',
    cartridgeData: PACIFIC_2026_CARTRIDGE,
    selectedOccupationIdx: 0,

    // Outfitter store shopping cart state
    outfitterCart: {
      food: 6,
      ammo: 4,
      partA: 1,
      partB: 1,
      partC: 1,
    },

    // Persistence & Leaderboard State
    playerName: 'Brad & Family',
    epitaphText: '',
    leaderboard: [],

    // UI Controls & Toggles
    crtEnabled: false,
    soundMuted: false,
    isTraveling: false,
    modalType: null, // null | 'DILEMMA' | 'OBSTACLE' | 'OUTFITTER' | 'VICTORY' | 'GAMEOVER' | 'EXIT'
    warningModal: null, // null | { title, message, confirmLabel, cancelLabel, action }

    // Active Dilemma / Obstacle / Economy Data
    activeEvent: null,
    activeObstacle: null,
    miniGameActive: false,
    midTrailCatalog: [],
    activeTradeState: null,

    // Shallow Snapshot mirrored from CoreTrailEngine for Alpine DOM rendering
    ui: {
      turn: 1,
      distance: 0,
      totalDistance: 920,
      distanceUnit: 'km',
      timeUnit: 'legs',
      pace: 'Sit-on-limit (100 km/h)',
      rations: 'Filling',
      cashCents: 28550,
      traction: 100,
      dadEgo: 0,
      party: [],
      supplies: { food: 40, ammo: 20, partA: 2, partB: 1, partC: 1 },
      nextWaypointName: '',
      nextWaypointDistance: 0,
      currentWaypointName: '',
      canUseStore: false,
      currentStoreName: '',
      status: 'IN_PROGRESS',
      lastLog: '',
      fps: 60,
      timeOfDay: 0.35,
      weather: 'CLEAR',
      score: 0,
    },

    // Engine references (non-reactive)
    _engine: null,
    _eventManager: null,
    _canvasEngine: null,

    async init() {
      if (typeof window !== 'undefined') {
        window.trailApp = this;
      }
      this.soundMuted = sound.muted;
      this.initEngine(this.cartridgeId);
      this.initCanvas();
      this.syncSnapshot();
      await this.loadMemorials(this.cartridgeId);
      sound.unlock();
    },

    async loadMemorials(cartridgeId) {
      try {
        const data = await StorageManager.fetchLeaderboard(cartridgeId);
        if (data && Array.isArray(data.high_scores)) {
          this.leaderboard = data.high_scores;
        }
        if (data && Array.isArray(data.memorials) && this._canvasEngine) {
          this._canvasEngine.memorials = data.memorials.map((m) => ({
            name: m.player_name,
            distance: m.distance,
            epitaph: m.epitaph,
            status: m.status,
          }));
        }
      } catch (e) {
        console.warn('Failed to load memorials:', e);
      }
    },

    autoSave() {
      if (!this._engine || this.ui.status !== 'IN_PROGRESS') return;
      StorageManager.saveGame({
        cartridgeId: this.cartridgeId,
        distance: this._engine.distance,
        turn: this._engine.turn,
        cashCents: this._engine.cashCents,
        party: this._engine.party,
        supplies: this._engine.supplies,
        resolvedWaypoints: Array.from(this._engine.resolvedWaypoints || []),
        flags: this._eventManager?.flags || {},
      });
    },

    async submitAndRestart() {
      const finalStatus = this.ui.status === 'IN_PROGRESS' ? 'U_TURN' : this.ui.status;
      await StorageManager.submitRun({
        cartridge_id: this.cartridgeId,
        player_name:
          this.playerName || (this.cartridgeId === 'pacific_2026' ? 'Brad & Family' : 'Pioneers'),
        score: this.ui.score,
        turns: this.ui.turn,
        distance: this.ui.distance,
        status: finalStatus,
        epitaph:
          this.epitaphText ||
          (finalStatus === 'WON'
            ? 'Made it to destination!'
            : 'Ran out of steam on the road.'),
      });

      StorageManager.clearSave();
      await this.loadMemorials(this.cartridgeId);
      this.modalType = null;
      this.switchCartridge(this.cartridgeId);
    },

    initEngine(cartridgeId, occupationIdx = 0) {
      this.cartridgeId = cartridgeId;
      this.cartridgeData =
        cartridgeId === 'oregon_1848' ? OREGON_1848_CARTRIDGE : PACIFIC_2026_CARTRIDGE;
      this.selectedOccupationIdx = occupationIdx;
      const occ =
        this.cartridgeData.occupations[occupationIdx] || this.cartridgeData.occupations[0];

      this._engine = new CoreTrailEngine({
        cartridgeId,
        dBase: this.cartridgeData.dBase,
        totalDistance: this.cartridgeData.totalDistance,
        distanceUnit: this.cartridgeData.distanceUnit,
        timeUnit: this.cartridgeData.timeUnit,
        lambdaBase: this.cartridgeData.lambdaBase,
        scoreMultiplier: occ.scoreMultiplier,
        cashCents: occ.cashCents,
        perks: occ.perks,
        waypoints: this.cartridgeData.waypoints,
        outfitter: this.cartridgeData.outfitter,
        barterConfig: this.cartridgeData.barterConfig,
        party: this.cartridgeData.defaultParty,
        supplies: { food: 5, ammo: 5, partA: 0, partB: 0, partC: 0 },
        tPar: this.cartridgeData.tPar,
        kt: this.cartridgeData.kt,
      });

      this._eventManager = new EventManager(this.cartridgeData.events, this._engine.prng);
      this.syncSnapshot();
    },

    selectDifficulty(idx) {
      sound.playBeep(440, 'triangle', 0.1);
      this.selectedOccupationIdx = idx;
      this.initEngine(this.cartridgeId, idx);
      this.outfitterCart =
        this.cartridgeId === 'pacific_2026'
          ? { food: 6, ammo: 4, partA: 1, partB: 1, partC: 1 }
          : { food: 8, ammo: 5, partA: 1, partB: 1, partC: 1 };
      this.warningModal = null;
      this.screen = 'OUTFITTER';
    },

    adjustCart(itemId, delta) {
      sound.playBeep(520, 'sine', 0.05);
      const cur = this.outfitterCart[itemId] || 0;
      this.outfitterCart[itemId] = Math.max(0, cur + delta);
    },

    getCartTotalCents() {
      let total = 0;
      const catalog = this.cartridgeData.outfitter || [];
      for (const [id, qty] of Object.entries(this.outfitterCart)) {
        const item = catalog.find((i) => i.id === id);
        if (item && qty > 0) {
          total += qty * item.unitCostCents;
        }
      }
      return total;
    },

    confirmOutfitterAndDepart() {
      const total = this.getCartTotalCents();
      if (total > this.ui.cashCents) {
        sound.playStinkBuzzer();
        alert('Cart total exceeds available cash! Lower your quantities.');
        return;
      }

      // Check for zero-food departure suicide
      const catalog = this.cartridgeData.outfitter || [];
      const foodItem = catalog.find((i) => i.id === 'food');
      const foodPurchased = (this.outfitterCart.food || 0) * (foodItem?.bundleSize || 1);
      const totalFoodAfterPurchase = (this._engine.supplies.food || 0) + foodPurchased;

      if (totalFoodAfterPurchase <= 0) {
        sound.playStinkBuzzer();
        this.warningModal = {
          title: 'DEPART WITH ZERO RATIONS?',
          message:
            'You have selected NO food rations! Your party will immediately suffer severe starvation damage (-15 Health, -20 Morale) upon hitting the road. Depart anyway?',
          confirmLabel: 'Depart Anyway [Enter]',
          cancelLabel: 'Return to Store [Esc]',
          action: () => this._doDepart(),
        };
        return;
      }

      this._doDepart();
    },

    _doDepart() {
      this._engine.buySupplies(this.outfitterCart, this.cartridgeData.outfitter || []);
      sound.playFanfare();
      this.syncSnapshot();
      this.screen = 'GAME';
      this.autoSave();
    },

    initCanvas() {
      const canvas = document.getElementById('trailCanvas');
      if (!canvas) return;

      this._canvasEngine = new CanvasEngine(canvas, {
        cartridgeId: this.cartridgeId,
        vfxFlags: {
          vfxStinkLines: this._eventManager.flags.vfxStinkLines || false,
          vfxSongLoop: this._eventManager.flags.vfxSongLoop || false,
        },
      });

      this._canvasEngine.start();
    },

    syncSnapshot() {
      if (!this._engine) return;
      const nextWp = this._engine.getNextWaypoint();
      const curWp = this._engine.getCurrentWaypoint();

      this.ui.turn = this._engine.turn;
      this.ui.distance = this._engine.distance;
      this.ui.totalDistance = this._engine.totalDistance;
      this.ui.distanceUnit = this._engine.distanceUnit;
      this.ui.timeUnit = this._engine.timeUnit;
      this.ui.pace = this._engine.currentPaceKey;
      this.ui.rations = this._engine.rationTier;
      this.ui.cashCents = this._engine.cashCents;
      this.ui.traction = this._engine.traction;
      this.ui.dadEgo = this._engine.dadEgo;
      this.ui.party = JSON.parse(JSON.stringify(this._engine.party));
      this.ui.supplies = { ...this._engine.supplies };
      this.ui.nextWaypointName = nextWp ? nextWp.name : 'Destination';
      this.ui.nextWaypointDistance = nextWp ? nextWp.distance : this._engine.totalDistance;
      this.ui.currentWaypointName = curWp ? curWp.name : '';
      this.ui.canUseStore = Boolean(curWp && curWp.hasStore);
      this.ui.currentStoreName =
        curWp?.storeName ||
        (this.cartridgeId === 'pacific_2026' ? 'Highway Servo Store' : 'Fort Trading Post');
      this.ui.status = this._engine.status;
      this.ui.lastLog = this._engine.logs[this._engine.logs.length - 1] || 'Trail ahead is clear.';
      this.ui.score = this._engine.calculateScore();

      if (this._canvasEngine) {
        this.ui.fps = this._canvasEngine.fps;
        this.ui.timeOfDay = this._canvasEngine.timeOfDay;
        this.ui.weather = this._canvasEngine.weather;
        this._canvasEngine.currentDistance = this._engine.distance;
        this._canvasEngine.vfxFlags.vfxStinkLines = (this._eventManager.flags.vfxStinkLines ?? (this.cartridgeId === 'pacific_2026' && this.ui.party.some(m => m.status === 'Code Brown')));
        this._canvasEngine.vfxFlags.vfxSongLoop = (this._eventManager.flags.vfxSongLoop ?? false);
      }
    },

    switchCartridge(newId) {
      if (this.isTraveling) return;
      sound.playBeep(440, 'triangle', 0.1);
      this.selectedOccupationIdx = 0;
      this.outfitterCart = {};
      this.warningModal = null;
      this.initEngine(newId, 0);
      if (this._canvasEngine) {
        this._canvasEngine.cartridgeId = newId;
        this._canvasEngine.activeScene = null;
      }
      this.loadMemorials(newId);
      this.modalType = null;
      this.miniGameActive = false;
      this.screen = 'SETUP';
      this.syncSnapshot();
    },

    // Phased Travel Sequencer (Dawn -> Midday/Night)
    advanceTurn() {
      if (this.isTraveling || this.modalType || this.ui.status !== 'IN_PROGRESS') return;

      sound.playBeep(330, 'sawtooth', 0.14);
      this.isTraveling = true;

      // 1. Prepare step kinematics & detect potential interrupt
      const prep = this._engine.prepareStep();

      // 2. Animate sky progression on Canvas
      const targetPhase = prep.dayPhase || 'NIGHT';
      this._canvasEngine.startPhasedTravel(targetPhase, 1600, () => {
        // 3. Commit step once visual travel finishes
        this._engine.commitStep(prep);
        this.isTraveling = false;
        this.syncSnapshot();
        this.autoSave();

        // 4. Handle interrupt presentation
        if (prep.interruptType === 'WAYPOINT') {
          sound.playFanfare();
          if (this._engine.activeObstacle) {
            this.activeObstacle = this._engine.activeObstacle;
            this.modalType = 'OBSTACLE';
          }
        } else if (prep.interruptType === 'HAZARD') {
          sound.playStinkBuzzer();
          const event = this._eventManager.pickEligibleEvent(this._engine);
          if (event) {
            this.activeEvent = event;
            this.modalType = 'DILEMMA';
          }
        } else if (prep.interruptType === 'ARRIVAL') {
          sound.playFanfare();
          this.modalType = 'VICTORY';
        } else if (this.ui.status === 'DIED' || this.ui.status === 'U_TURN') {
          sound.playStinkBuzzer();
          this.modalType = 'GAMEOVER';
        }
      });
    },

    restTurn(force = false) {
      if (this.isTraveling || this.modalType || this.ui.status !== 'IN_PROGRESS') return;

      // Starvation confirmation: prevent accidental party wipe
      if (!force && this._engine.supplies.food <= 0) {
        sound.playStinkBuzzer();
        this.warningModal = {
          title: '⚠️ NO RATIONS REMAINING!',
          message:
            'Resting without food will inflict severe starvation damage (-15 Health, -20 Morale) to all living party members. Proceed with starvation rest?',
          confirmLabel: 'Rest Anyway [Enter]',
          cancelLabel: 'Cancel [Esc]',
          action: () => this.restTurn(true),
        };
        return;
      }

      const curWp = this._engine.getCurrentWaypoint();
      const nextWp = this._engine.getNextWaypoint();
      const isCommercial = Boolean(
        (curWp && (curWp.servoStop || curWp.tradingPost)) ||
          (nextWp && (nextWp.servoStop || nextWp.tradingPost))
      );
      const result = this._engine.executeRest(isCommercial);

      if (!result.success && result.reason === 'STARVATION') {
        sound.playStinkBuzzer();
      } else {
        sound.playBeep(520, 'sine', 0.25);
      }

      this.syncSnapshot();
      this.autoSave();

      if (this.ui.status === 'DIED' || this.ui.status === 'U_TURN') {
        sound.playStinkBuzzer();
        this.modalType = 'GAMEOVER';
      }
    },

    cyclePace() {
      sound.playBeep(400, 'square', 0.08);
      const paces = Object.keys(this._engine.paceMultipliers);
      const curIdx = paces.indexOf(this._engine.currentPaceKey);
      this._engine.currentPaceKey = paces[(curIdx + 1) % paces.length];
      this.syncSnapshot();
    },

    resolveDilemmaChoice(choice) {
      if (!this.activeEvent || !choice) return;
      const receipt = this._eventManager.executeChoice(this._engine, this.activeEvent, choice);

      if (!receipt.success) {
        sound.playStinkBuzzer();
        alert(receipt.reason || 'Requirement not met');
        return;
      }

      if (receipt.passed) {
        sound.playFanfare();
      } else {
        sound.playStinkBuzzer();
      }

      this.modalType = null;
      this.activeEvent = null;
      this.syncSnapshot();
      this.autoSave();
    },

    resolveObstacle(action) {
      if (!this._engine.activeObstacle) return;
      const obsSnapshot = this._engine.activeObstacle;
      const perks = { carpenterPerk: this.cartridgeId === 'oregon_1848' && this.selectedOccupationIdx === 1 };
      const outcome = this._engine.resolveObstacle(action, perks);

      if (!outcome.success && outcome.error === 'INSUFFICIENT_FUNDS') {
        sound.playStinkBuzzer();
        alert(`Insufficient cash! Requires $${(outcome.costCents / 100).toFixed(2)}`);
        return;
      }

      if (!outcome.success && outcome.error === 'INSUFFICIENT_SUPPLIES') {
        sound.playStinkBuzzer();
        const req = outcome.required || {};
        alert(`Insufficient supplies for guide! Requires ${req.qty || 1}x (${req.label || req.slot}).`);
        return;
      }

      // Launch crossing scene animation on canvas
      this.modalType = null;
      sound.playSplash();

      const river = new RiverScene({
        cartridgeId: this.cartridgeId,
        obstacle: obsSnapshot,
        onComplete: () => {
          this._canvasEngine.activeScene = null;
          this.syncSnapshot();
        },
      });

      this._canvasEngine.activeScene = river;
      river.startCrossingAnimation(outcome.success, outcome.success ? 'Crossing successful!' : 'Crossing failed!');
    },

    openMidTrailStore() {
      if (this.isTraveling || this.modalType || !this.ui.canUseStore) return;
      sound.playBeep(480, 'triangle', 0.1);
      this.midTrailCatalog = this._engine.getMidTrailStoreCatalog();
      this.modalType = 'MID_STORE';
    },

    buyFromMidStore(itemId) {
      const res = this._engine.buyMidTrailItem(itemId, 1);
      if (!res.success) {
        sound.playStinkBuzzer();
        return;
      }
      sound.playBeep(620, 'sine', 0.12);
      this.midTrailCatalog = this._engine.getMidTrailStoreCatalog();
      this.syncSnapshot();
      this.autoSave();
    },

    getBarterSlots() {
      const slots = this.cartridgeData?.barterConfig?.slots || {};
      return Object.entries(slots).map(([key, meta], idx) => ({
        key,
        label: meta.label,
        baseQty: meta.baseQty,
        hotkey: idx + 1,
      }));
    },

    openTradeModal() {
      if (this.isTraveling || this.modalType || this.ui.status !== 'IN_PROGRESS') return;
      sound.playBeep(440, 'triangle', 0.1);
      this.activeTradeState = { step: 'SELECT', result: null };
      this.modalType = 'BARTER';
    },

    selectTradeWanted(slotKey) {
      const res = this._engine.initiateTradeAttempt(slotKey);
      if (res.foundTrader) {
        sound.playBeep(540, 'sine', 0.15);
      } else {
        sound.playStinkBuzzer();
      }
      this.activeTradeState = { step: 'OFFER', result: res };
      this.syncSnapshot();
      this.autoSave();

      if (this.ui.status === 'DIED' || this.ui.status === 'U_TURN') {
        this.modalType = 'GAMEOVER';
      }
    },

    confirmTradeDeal() {
      const offer = this.activeTradeState?.result?.offer;
      if (!offer) return;
      const res = this._engine.acceptTradeOffer(offer);
      if (!res.success) {
        sound.playStinkBuzzer();
        return;
      }
      sound.playFanfare();
      this.modalType = null;
      this.activeTradeState = null;
      this.syncSnapshot();
      this.autoSave();
    },

    launchMiniGame() {
      if (this.isTraveling || this.miniGameActive) return;
      sound.playBeep(600, 'square', 0.15);
      this.miniGameActive = true;
      this.modalType = null;

      const canvas = document.getElementById('trailCanvas');
      if (canvas) canvas.style.cursor = 'none';

      let cleanupListeners = null;

      const hunt = new HuntScene({
        cartridgeId: this.cartridgeId,
        ammo: this._engine.supplies.ammo,
        onComplete: (result) => {
          this._canvasEngine.activeScene = null;
          this.miniGameActive = false;
          if (cleanupListeners) cleanupListeners();

          // Commit harvested gains
          this._engine.supplies.food += result.foodYield;
          this._engine.supplies.ammo = Math.max(
            0,
            this._engine.supplies.ammo - result.ammoSpent
          );
          if (result.sanityGained) {
            this._engine.party.forEach((m) => {
              if (m.role === 'primary' && m.health > 0) {
                m.morale = Math.min(100, (m.morale ?? 100) + result.sanityGained);
              }
            });
          }

          sound.playFanfare();
          this._engine.logs.push(
            `Mini-game concluded: Harvested +${result.foodYield} ${this.cartridgeId === 'pacific_2026' ? 'Snacks' : 'lbs food'} (Spent ${result.ammoSpent} ammo).`
          );
          this.syncSnapshot();
          this.autoSave();
        },
      });

      this._canvasEngine.activeScene = hunt;

      // Attach pointer handlers to container / canvas
      const container = canvas?.parentElement;
      const targetEl = container || canvas;

      if (targetEl) {
        const pointerDownHandler = (e) => {
          if (!this.miniGameActive || this._canvasEngine.activeScene !== hunt) {
            if (cleanupListeners) cleanupListeners();
            return;
          }
          e.preventDefault();
          const v = this._canvasEngine.toVirtualCoords(e.clientX, e.clientY);
          if (this.cartridgeId === 'oregon_1848') sound.playMusket();
          else sound.playHonk();
          hunt.handlePointerDown(v.x, v.y);
        };

        const pointerMoveHandler = (e) => {
          if (!this.miniGameActive || this._canvasEngine.activeScene !== hunt) {
            if (cleanupListeners) cleanupListeners();
            return;
          }
          const v = this._canvasEngine.toVirtualCoords(e.clientX, e.clientY);
          hunt.handlePointerMove(v.x, v.y);
        };

        cleanupListeners = () => {
          targetEl.removeEventListener('pointerdown', pointerDownHandler);
          targetEl.removeEventListener('pointermove', pointerMoveHandler);
          if (canvas) canvas.style.cursor = '';
        };

        targetEl.addEventListener('pointerdown', pointerDownHandler);
        targetEl.addEventListener('pointermove', pointerMoveHandler);
      }
    },

    toggleSound() {
      this.soundMuted = sound.toggleMute();
    },

    toggleFullscreen() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    },

    confirmExit() {
      sound.playBeep(260, 'square', 0.1);
      this.modalType = 'EXIT';
    },

    async executeShutdown() {
      sound.playBeep(220, 'sawtooth', 0.2);
      this.autoSave();
      this.modalType = 'SHUTDOWN_IN_PROGRESS';

      try {
        await fetch('/api/shutdown', { method: 'POST' });
      } catch (_) {
        // If server terminates immediately, fetch rejection is expected
      }

      this.modalType = 'SHUTDOWN_COMPLETE';
      setTimeout(() => {
        try {
          window.close();
        } catch (_) {}
      }, 1200);
    },

    // Keyboard Dispatch Loop
    handleKeydown(e) {
      sound.unlock();

      // In mini-game, handle keyboard aiming and firing
      if (this.miniGameActive) {
        if (e.key === 'Escape') {
          if (this._canvasEngine && this._canvasEngine.activeScene) {
            this._canvasEngine.activeScene._endGame();
          }
          return;
        }

        const scene = this._canvasEngine?.activeScene;
        if (scene && typeof scene.handleKeyDown === 'function') {
          if (e.code === 'Space' || e.key === 'Enter') {
            e.preventDefault();
            if (this.cartridgeId === 'oregon_1848') sound.playMusket();
            else sound.playHonk();
            scene.handleKeyDown(' ');
          } else if (
            [
              'ArrowUp',
              'ArrowDown',
              'ArrowLeft',
              'ArrowRight',
              'w',
              'W',
              's',
              'S',
              'a',
              'A',
              'd',
              'D',
            ].includes(e.key)
          ) {
            e.preventDefault();
            scene.handleKeyDown(e.key);
          }
        }
        return;
      }

      // Warning / Confirmation Modal (Zero food departure or Starvation rest)
      if (this.warningModal) {
        if (e.key === 'Escape' || e.key === 'n' || e.key === 'N') {
          this.warningModal = null;
          return;
        }
        if (e.key === 'Enter' || e.key === 'y' || e.key === 'Y') {
          const act = this.warningModal.action;
          this.warningModal = null;
          if (typeof act === 'function') act();
          return;
        }
        return;
      }

      // Exit confirmation modal
      if (this.modalType === 'EXIT') {
        if (e.key === 'Escape') this.modalType = null;
        if (e.key === 'Enter') this.executeShutdown();
        return;
      }

      // Screen-Gated Keyboard Router
      if (this.screen === 'SETUP') {
        this.handleSetupKeys(e);
      } else if (this.screen === 'OUTFITTER') {
        this.handleOutfitterKeys(e);
      } else if (this.screen === 'GAME') {
        this.handleTrailKeys(e);
      }
    },

    handleKeyup(e) {
      if (this.miniGameActive) {
        const scene = this._canvasEngine?.activeScene;
        if (scene && typeof scene.handleKeyUp === 'function') {
          scene.handleKeyUp(e.key);
        }
      }
    },

    handleSetupKeys(e) {
      if (e.key === '1') this.selectDifficulty(0);
      else if (e.key === '2') this.selectDifficulty(1);
      else if (e.key === '3') this.selectDifficulty(2);
      else if (e.key === 'Enter') this.selectDifficulty(this.selectedOccupationIdx);
    },

    handleOutfitterKeys(e) {
      if (e.key === 'Escape') {
        this.screen = 'SETUP';
      } else if (e.key === 'Enter') {
        this.confirmOutfitterAndDepart();
      }
    },

    handleTrailKeys(e) {
      // Modals during trail gameplay
      if (this.modalType === 'DILEMMA' && this.activeEvent) {
        if (e.key === 'Escape') this.modalType = null;
        if (e.key === '1' && this.activeEvent.choices[0]) this.resolveDilemmaChoice(this.activeEvent.choices[0]);
        if (e.key === '2' && this.activeEvent.choices[1]) this.resolveDilemmaChoice(this.activeEvent.choices[1]);
        if (e.key === '3' && this.activeEvent.choices[2]) this.resolveDilemmaChoice(this.activeEvent.choices[2]);
        return;
      }

      if (this.modalType === 'OBSTACLE') {
        if (e.key === 'Escape') this.modalType = null;
        if (e.key === '1') this.resolveObstacle('force');
        if (e.key === '2') this.resolveObstacle('adapt');
        if (e.key === '3') this.resolveObstacle('pay');
        if (e.key === '4') this.resolveObstacle('delay');
        if (e.key === '5' && this.activeObstacle?.guideCost) this.resolveObstacle('guide');
        return;
      }

      if (this.modalType === 'MID_STORE') {
        if (e.key === 'Escape') {
          this.modalType = null;
          return;
        }
        const idx = parseInt(e.key, 10) - 1;
        if (idx >= 0 && idx < this.midTrailCatalog.length) {
          this.buyFromMidStore(this.midTrailCatalog[idx].id);
        }
        return;
      }

      if (this.modalType === 'BARTER') {
        if (e.key === 'Escape') {
          this.modalType = null;
          this.activeTradeState = null;
          return;
        }
        if (this.activeTradeState?.step === 'SELECT') {
          const slots = this.getBarterSlots();
          const idx = parseInt(e.key, 10) - 1;
          if (idx >= 0 && idx < slots.length) {
            this.selectTradeWanted(slots[idx].key);
          }
        } else if (this.activeTradeState?.step === 'OFFER') {
          const offer = this.activeTradeState.result?.offer;
          if ((e.key === 'y' || e.key === 'Y' || e.key === 'Enter') && offer && offer.canAfford) {
            this.confirmTradeDeal();
          } else if (e.key === 'n' || e.key === 'N' || e.key === 'Enter') {
            this.modalType = null;
            this.activeTradeState = null;
          }
        }
        return;
      }

      if (this.modalType === 'VICTORY' || this.modalType === 'GAMEOVER') {
        if (e.key === 'Escape' || e.key === 'Enter') {
          this.submitAndRestart();
        }
        return;
      }

      // Main console keyboard hotkeys
      if (e.code === 'Space') {
        e.preventDefault();
        if (this.isTraveling) {
          this._canvasEngine.skipTravelAnimation();
        } else {
          this.advanceTurn();
        }
      } else if (e.key === 'r' || e.key === 'R') {
        this.restTurn();
      } else if (e.key === 'p' || e.key === 'P') {
        this.cyclePace();
      } else if (e.key === 't' || e.key === 'T') {
        this.openTradeModal();
      } else if (e.key === 's' || e.key === 'S') {
        if (this.ui.canUseStore) this.openMidTrailStore();
      } else if (e.key === 'm' || e.key === 'M') {
        this.toggleSound();
      } else if (e.key === 'f' || e.key === 'F') {
        this.toggleFullscreen();
      } else if (e.key === 'h' || e.key === 'H') {
        this.launchMiniGame();
      }
    },
  };
}
