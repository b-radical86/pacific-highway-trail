/**
 * CoreTrailEngine — Headless Deterministic Trail Simulation Engine.
 *
 * Implements:
 * - Kinematic progress with waypoint clamping (resolvedWaypoints)
 * - Two-phase step execution (prepareStep / commitStep)
 * - Dynamic entropy hazard calculation with vitality weighting and cooldowns
 * - Obstacle resolution matrix (force, adapt, pay, delay with Phi drift)
 * - Integer-cent cash accounting
 * - Stack-aware scoring engine with anti-exploit caps
 */

import { PRNG } from './prng.js';

export class CoreTrailEngine {
  /**
   * @param {Object} config Engine initialization configuration
   */
  constructor(config = {}) {
    this.cartridgeId = config.cartridgeId || 'pacific_2026';
    this.prng = new PRNG(config.prngSeed || 18482026);

    // Route & Kinematics Config
    this.dBase = config.dBase ?? (this.cartridgeId === 'pacific_2026' ? 45 : 20);
    this.totalDistance = config.totalDistance ?? (this.cartridgeId === 'pacific_2026' ? 920 : 2000);
    this.distanceUnit = config.distanceUnit || (this.cartridgeId === 'pacific_2026' ? 'km' : 'mi');
    this.timeUnit = config.timeUnit || (this.cartridgeId === 'pacific_2026' ? 'legs' : 'days');
    this.lambdaBase = config.lambdaBase ?? (this.cartridgeId === 'pacific_2026' ? 0.22 : 0.10);
    this.scoreMultiplier = config.scoreMultiplier ?? 1.0;
    this.tPar = config.tPar ?? (this.cartridgeId === 'pacific_2026' ? 24 : 160);
    this.kt = config.kt ?? (this.cartridgeId === 'pacific_2026' ? 150 : 25);
    this.startingCashCents = config.cashCents ?? (this.cartridgeId === 'pacific_2026' ? 28550 : 80000);

    // Pacing multipliers
    this.paceMultipliers = config.paceMultipliers || (
      this.cartridgeId === 'pacific_2026'
        ? { cruise: 0.8, sit_on_limit: 1.0, hamish: 1.25 }
        : { steady: 0.625, strenuous: 1.0, grueling: 1.375 }
    );
    this.currentPaceKey = config.currentPaceKey || (this.cartridgeId === 'pacific_2026' ? 'sit_on_limit' : 'steady');

    // Rations: filling (3), meager (1.5), bare_bones (0.5) per member
    this.rationTier = config.rationTier || 'filling';

    // Route Waypoints & Economy Config
    this.waypoints = Array.isArray(config.waypoints) ? config.waypoints : [];
    this.outfitterCatalog = Array.isArray(config.outfitter) ? config.outfitter : [];
    this.barterConfig = config.barterConfig || null;
    this._storeCache = { distance: -1, items: [] };

    // Party Members [{ name, role: 'primary'|'secondary'|'pet', health, morale, statusEffects: [] }]
    this.party = Array.isArray(config.party) ? JSON.parse(JSON.stringify(config.party)) : [];

    // Supplies & Currency (cents)
    this.supplies = Object.assign(
      { food: 40, ammo: 20, partA: 2, partB: 1, partC: 1 },
      config.supplies || {}
    );
    this.cashCents = this.startingCashCents;

    // Kinematic modifiers
    this.traction = config.traction ?? 100;
    this.maxTraction = 100;
    this.friction = config.friction ?? 0.0;
    this.weatherSeverity = config.weatherSeverity ?? 1.0;

    // Simulation State
    this.distance = 0;
    this.turn = 1;
    this.resolvedWaypoints = new Set(config.resolvedWaypoints || []);
    this.hazardCooldown = 0;
    this.consecutiveRests = 0;
    this.occupationId = config.occupationId || null;
    this.difficultyMultiplier = config.difficultyMultiplier ?? this.scoreMultiplier;
    this.perks = config.perks || {};
    this.status = 'IN_PROGRESS'; // 'IN_PROGRESS' | 'WON' | 'DIED' | 'U_TURN'
    this.dadEgo = 0;
    this.hazardMultiplier = config.hazardMultiplier ?? 1.0;
    this.chosenBranches = Array.isArray(config.chosenBranches) ? [...config.chosenBranches] : [];
    this.activeObstacle = null;
    this.activeTradeOffer = null;
    this.logs = [];
  }

  /**
   * Retrieves the current pace multiplier.
   * @returns {number}
   */
  getPaceMultiplier() {
    return this.paceMultipliers[this.currentPaceKey] ?? 1.0;
  }

  /**
   * Finds the next upcoming unresolved waypoint.
   * @returns {Object|null}
   */
  getNextWaypoint() {
    for (const wp of this.waypoints) {
      if (!this.resolvedWaypoints.has(wp.id) && wp.distance > this.distance) {
        return wp;
      }
    }
    return null;
  }

  /**
   * Finds the waypoint matching the party's current exact distance, if any.
   * @returns {Object|null}
   */
  getCurrentWaypoint() {
    for (const wp of this.waypoints) {
      if (wp.distance === this.distance) {
        return wp;
      }
    }
    return null;
  }

  /**
   * Calculates party vitality means (H_bar) for primary and secondary roles.
   * @returns {{ hPrimary: number, hSecondary: number }}
   */
  calculateVitalityMeans() {
    let primarySum = 0;
    let primaryCount = 0;
    let secondarySum = 0;
    let secondaryWeight = 0;

    for (const member of this.party) {
      if (member.health <= 0) continue; // Out of action / dead members omitted
      const vit = (0.6 * member.health + 0.4 * (member.morale ?? 100)) / 100;

      if (member.role === 'primary') {
        primarySum += vit;
        primaryCount += 1;
      } else if (member.role === 'secondary') {
        secondarySum += vit;
        secondaryWeight += 1.0;
      } else if (member.role === 'pet') {
        secondarySum += vit * 0.5;
        secondaryWeight += 0.5;
      }
    }

    return {
      hPrimary: primaryCount > 0 ? (primarySum / primaryCount) : 1.0,
      hSecondary: secondaryWeight > 0 ? (secondarySum / secondaryWeight) : 1.0,
    };
  }

  /**
   * Evaluates dynamic hazard probability for the upcoming step.
   * P(Hazard) = 1 - exp(-lambdaBase * prodGamma), capped at 0.45.
   * @returns {{ p: number, shouldTrigger: boolean }}
   */
  evaluateHazardRoll() {
    if (this.hazardCooldown > 0) {
      return { p: 0.0, shouldTrigger: false };
    }

    const { hPrimary, hSecondary } = this.calculateVitalityMeans();
    const paceMult = this.getPaceMultiplier();

    const gamma1 = 1 + 1.0 * (1 - hPrimary);
    const gamma2 = 1 + 1.5 * (1 - hSecondary);
    const prodGamma =
      gamma1 *
      gamma2 *
      Math.pow(paceMult, 1.35) *
      this.weatherSeverity *
      (this.hazardMultiplier || 1.0);

    const rawP = 1 - Math.exp(-this.lambdaBase * prodGamma);
    const pClamped = Math.min(0.45, Math.max(0.01, rawP));
    const roll = this.prng.next();

    return {
      p: pClamped,
      shouldTrigger: roll < pClamped,
    };
  }

  /**
   * PHASE 1 STEP HOOK: Prepares step kinematics and determines interrupt points
   * without mutating permanent state. Allows frontend to animate Dawn -> Night
   * and pause mid-day when an interrupt occurs.
   *
   * @returns {Object} Prepared step specification
   */
  prepareStep() {
    if (this.status !== 'IN_PROGRESS') {
      return { deltaD: 0, targetDistance: this.distance, interrupted: false, interruptType: null };
    }

    // Kinematic step: D_base * M_pace * (T_curr/T_max)^0.75 * (1 - Omega) * (1 +/- epsilon)
    const mPace = this.getPaceMultiplier();
    const tractionRatio = Math.max(0.1, Math.min(1.0, this.traction / this.maxTraction));
    const tractionFactor = Math.pow(tractionRatio, 0.75);
    const frictionFactor = Math.max(0.3, 1.0 - Math.min(0.7, this.friction));
    const epsilon = this.prng.range(-0.08, 0.08, true);

    let rawDeltaD = this.dBase * mPace * tractionFactor * frictionFactor * (1 + epsilon);
    rawDeltaD = Math.max(1, Math.round(rawDeltaD));

    let tentativeDistance = this.distance + rawDeltaD;
    const nextWp = this.getNextWaypoint();

    // 1. Waypoint Clamping check
    if (nextWp && tentativeDistance >= nextWp.distance) {
      return {
        deltaD: nextWp.distance - this.distance,
        targetDistance: nextWp.distance,
        interrupted: true,
        interruptType: 'WAYPOINT',
        waypoint: nextWp,
        dayPhase: 'MIDDAY', // Waypoint interrupts travel in broad daylight
      };
    }

    // 2. Goal Arrival check
    if (tentativeDistance >= this.totalDistance) {
      return {
        deltaD: this.totalDistance - this.distance,
        targetDistance: this.totalDistance,
        interrupted: true,
        interruptType: 'ARRIVAL',
        dayPhase: 'SUNSET',
      };
    }

    // 3. Dynamic Hazard Entropy check
    const hazardCheck = this.evaluateHazardRoll();
    if (hazardCheck.shouldTrigger) {
      const midStep = Math.max(1, Math.floor(rawDeltaD * 0.5));
      return {
        deltaD: midStep,
        targetDistance: this.distance + midStep,
        interrupted: true,
        interruptType: 'HAZARD',
        hazardProb: hazardCheck.p,
        dayPhase: 'MIDDAY', // Hazards interrupt mid-journey
      };
    }

    // Uninterrupted Full Step
    return {
      deltaD: rawDeltaD,
      targetDistance: tentativeDistance,
      interrupted: false,
      interruptType: null,
      dayPhase: 'NIGHT', // Completes full day/leg
    };
  }

  /**
   * Commits a prepared step to the engine state.
   * @param {Object} [prepared] Result from prepareStep(); if omitted, prepared automatically.
   * @returns {Object} State delta summary
   */
  commitStep(prepared = null) {
    const prep = prepared || this.prepareStep();
    this.distance = prep.targetDistance;
    this.turn += 1;

    // Decrement hazard cooldown & reset consecutive rest counter
    if (this.hazardCooldown > 0) {
      this.hazardCooldown -= 1;
    }
    this.consecutiveRests = 0;

    const activeParty = this.party.filter((m) => m.health > 0);

    // Consume Food Rations
    const foodPerPerson =
      this.rationTier === 'filling' ? 3 : this.rationTier === 'meager' ? 2 : 1;
    const foodUsed = foodPerPerson * activeParty.length;
    this.supplies.food = Math.max(0, this.supplies.food - foodUsed);

    // Starvation Attrition
    if (this.supplies.food === 0) {
      for (const m of activeParty) {
        m.health = Math.max(0, m.health - 15);
        m.morale = Math.max(0, (m.morale ?? 100) - 15);
        m.status = 'Starving';
      }
      this.logs.push('Out of rations! Starvation damage inflicted (-15 HP, -15 Morale).');
    }

    // Travel Pace Attrition & Friction
    const isGrueling =
      this.currentPaceKey === 'grueling' ||
      this.currentPaceKey === 'hamish' ||
      this.currentPaceKey === 'reckless';
    const isStrenuous =
      this.currentPaceKey === 'strenuous' || this.currentPaceKey === 'fast';

    if (isGrueling) {
      // High speed shreds tyres/traction and drains party stamina
      this.traction = Math.max(10, this.traction - 5);
      for (const m of activeParty) {
        m.morale = Math.max(0, (m.morale ?? 100) - 8);
        m.health = Math.max(0, m.health - 4);
      }
      this.logs.push('Grueling pace punished the party! -5 Traction, -8 Morale, -4 Health.');
    } else if (isStrenuous) {
      this.traction = Math.max(10, this.traction - 2);
      for (const m of activeParty) {
        m.morale = Math.max(0, (m.morale ?? 100) - 3);
      }
    }

    // Ration Tier Morale Impacts
    if (this.rationTier === 'meager') {
      for (const m of activeParty) {
        m.morale = Math.max(0, (m.morale ?? 100) - 4);
      }
    } else if (this.rationTier === 'bare_bones') {
      for (const m of activeParty) {
        m.morale = Math.max(0, (m.morale ?? 100) - 8);
        m.health = Math.max(0, m.health - 5);
      }
      this.logs.push('Bare-bones rations are draining party vitality.');
    }

    // Handle Interrupt Types
    if (prep.interruptType === 'WAYPOINT' && prep.waypoint) {
      this.resolvedWaypoints.add(prep.waypoint.id);
      if (prep.waypoint.obstacle) {
        this.activeObstacle = JSON.parse(JSON.stringify(prep.waypoint.obstacle));
        this.activeObstacle.waypointId = prep.waypoint.id;
        if (this.activeObstacle.width === undefined) {
          this.activeObstacle.width =
            this.cartridgeId === 'pacific_2026'
              ? Number(this.prng.range(1.2, 6.5, true).toFixed(1))
              : Math.round(this.prng.range(180, 650));
        }
        if (this.activeObstacle.phi === undefined) {
          this.activeObstacle.phi = 0.5;
        }
        if (this.activeObstacle.depth === undefined) {
          this.activeObstacle.depth = Number((this.activeObstacle.phi * 10).toFixed(1));
        }
      }
    } else if (prep.interruptType === 'HAZARD') {
      this.hazardCooldown = 1; // 1-turn cooldown prevents back-to-back hazard loops
    } else if (prep.interruptType === 'ARRIVAL') {
      this.status = 'WON';
    }

    // Check Loss Conditions
    this.evaluateSurvivalStatus();

    return {
      distance: this.distance,
      turn: this.turn,
      interrupted: prep.interrupted,
      interruptType: prep.interruptType,
      status: this.status,
    };
  }

  /**
   * Evaluates if party has collapsed.
   */
  evaluateSurvivalStatus() {
    if (this.cartridgeId === 'pacific_2026') {
      // 2026 Loss Condition: Both adults reach 0 sanity/morale -> U-Turn Home
      const adults = this.party.filter(m => m.role === 'primary');
      const allAdultsCollapsed = adults.length > 0 && adults.every(a => (a.morale ?? 100) <= 0 || a.health <= 0);
      if (allAdultsCollapsed) {
        this.status = 'U_TURN';
        this.logs.push('Cabin Mutiny & Total Exhaustion: Adults initiated emergency U-Turn home!');
      }
    } else {
      // 1848 Loss Condition: All primary and secondary members dead
      const humans = this.party.filter(m => m.role === 'primary' || m.role === 'secondary');
      const allDead = humans.length > 0 && humans.every(h => h.health <= 0);
      if (allDead) {
        this.status = 'DIED';
        this.logs.push('Tragedy on the trail: All party members have perished.');
      }
    }
  }

  /**
   * Executes a rest stop action with authentic ration and starvation mechanics.
   * Eliminates the infinite free healing exploit.
   *
   * @param {boolean} isCommercialStop Whether resting at a paid motel/servo/post
   * @returns {{ success: boolean, reason?: string, hpGain?: number, moraleGain?: number }}
   */
  executeRest(isCommercialStop = false) {
    if (this.status !== 'IN_PROGRESS') {
      return { success: false, reason: 'GAME_OVER' };
    }

    this.turn += 1;
    this.consecutiveRests = (this.consecutiveRests || 0) + 1;

    const activeParty = this.party.filter((m) => m.health > 0);
    const foodPerPerson =
      this.rationTier === 'filling' ? 3 : this.rationTier === 'meager' ? 2 : 1;
    const foodNeeded = activeParty.length * foodPerPerson;

    // Hard Starvation: resting without food causes starvation attrition!
    if (this.supplies.food <= 0) {
      for (const m of activeParty) {
        m.health = Math.max(0, m.health - 15);
        m.morale = Math.max(0, (m.morale ?? 100) - 20);
        m.status = 'Starving';
      }
      this.logs.push(
        'Halted with no food! Party suffered severe starvation damage (-15 HP, -20 Morale).'
      );
      this.evaluateSurvivalStatus();
      return {
        success: false,
        reason: 'STARVATION',
        healthDelta: -15,
        moraleDelta: -20,
      };
    }

    // Deduct food rations
    const foodConsumed = Math.min(this.supplies.food, foodNeeded);
    this.supplies.food -= foodConsumed;

    // Commercial stop fee check:
    // 2026: Roadside Motel & Servo ($25.00 = 2500 cents)
    // 1848: Trading Post / Roadhouse ($30.00 = 3000 cents)
    const lodgingFeeCents = this.cartridgeId === 'pacific_2026' ? 2500 : 3000;
    let commercialPaid = false;

    if (isCommercialStop) {
      if (this.cashCents >= lodgingFeeCents) {
        this.cashCents -= lodgingFeeCents;
        commercialPaid = true;
      } else {
        this.logs.push(
          `Insufficient funds ($${(this.cashCents / 100).toFixed(2)} / $${(lodgingFeeCents / 100).toFixed(2)}) for commercial lodging! Turned away to rough roadside camping.`
        );
      }
    }

    // Diminishing returns on resting in the wild / rough camping:
    // Turn 1: 100% healing (+10 HP, +8 Morale)
    // Turn 2: 60% healing (+6 HP, +5 Morale)
    // Turn 3+: 25% healing (+3 HP, +2 Morale)
    // Commercial Lodging (when paid): Fixed luxury rest (+16 HP, +20 Morale)
    const wildEfficiency = Math.max(0.25, 1.0 - (this.consecutiveRests - 1) * 0.4);
    const hpGain = commercialPaid ? 16 : Math.round(10 * wildEfficiency);
    const moraleGain = commercialPaid ? 20 : Math.round(8 * wildEfficiency);

    for (const m of activeParty) {
      m.health = Math.min(100, m.health + hpGain);
      m.morale = Math.min(100, (m.morale ?? 100) + moraleGain);
      if (m.status === 'Starving' && this.supplies.food > 0) {
        m.status = m.role === 'pet' ? 'Purring' : 'Healthy';
      }
    }

    const restLabel =
      this.cartridgeId === 'pacific_2026'
        ? commercialPaid
          ? 'Checked into roadside motel & servo for hot showers.'
          : 'Camped in the car at roadside rest area.'
        : commercialPaid
          ? 'Rented warm room at pioneer trading post.'
          : 'Camped wagon by the trail.';

    this.logs.push(
      `${restLabel} Rations consumed: ${foodConsumed}. Restored +${hpGain} HP, +${moraleGain} Morale.`
    );

    this.evaluateSurvivalStatus();
    return {
      success: true,
      healed: true,
      hpGain,
      moraleGain,
      foodConsumed,
      commercialPaid,
    };
  }

  /**
   * Purchases provisions from an outfitter store catalog using starting or trail funds.
   *
   * @param {Object} cart Map of item IDs to requested quantities { food: 5, ammo: 2, ... }
   * @param {Array<Object>} catalog Cartridge outfitter catalog definitions
   * @returns {{ success: boolean, reason?: string, spentCents?: number, remainingCashCents?: number }}
   */
  buySupplies(cart, catalog) {
    let totalCostCents = 0;
    for (const [itemKey, qty] of Object.entries(cart)) {
      if (qty <= 0) continue;
      const catItem = catalog.find((i) => i.id === itemKey);
      if (catItem) {
        totalCostCents += qty * catItem.unitCostCents;
      }
    }

    if (totalCostCents > this.cashCents) {
      return {
        success: false,
        reason: 'INSUFFICIENT_FUNDS',
        required: totalCostCents,
        available: this.cashCents,
      };
    }

    this.cashCents -= totalCostCents;
    for (const [itemKey, qty] of Object.entries(cart)) {
      if (qty <= 0) continue;
      const catItem = catalog.find((i) => i.id === itemKey);
      const unitsAdded = qty * (catItem?.bundleSize || 1);
      this.supplies[itemKey] = (this.supplies[itemKey] || 0) + unitsAdded;
    }

    this.logs.push(`Purchased provisions: Spent $${(totalCostCents / 100).toFixed(2)}.`);
    return {
      success: true,
      spentCents: totalCostCents,
      remainingCashCents: this.cashCents,
    };
  }

  /**
   * Returns the mid-trail store catalog at the current distance with
   * geographic inflation and deterministic stock scarcity rolls.
   *
   * Formula:
   * UnitPrice(d) = round(BasePrice_cents * (1.0 + gamma * (d / D_total)^1.15))
   * P(SoldOut) = clamp(baseScarcity * (d / D_total), 0.0, 0.65)
   *
   * @param {Array<Object>} [baseCatalog] Optional override catalog
   * @returns {Array<Object>} Inflated catalog items with soldOut flags
   */
  getMidTrailStoreCatalog(baseCatalog = null) {
    const sourceCatalog =
      Array.isArray(baseCatalog) && baseCatalog.length > 0
        ? baseCatalog
        : this.outfitterCatalog;

    if (
      !baseCatalog &&
      this._storeCache &&
      this._storeCache.distance === this.distance &&
      this._storeCache.items.length > 0
    ) {
      return this._storeCache.items;
    }

    const gamma = this.cartridgeId === 'oregon_1848' ? 2.5 : 1.65;
    const dRatio = Math.max(0, Math.min(1.0, this.distance / Math.max(1, this.totalDistance)));
    const inflationFactor = 1.0 + gamma * Math.pow(dRatio, 1.15);
    const markupPct = Math.round((inflationFactor - 1.0) * 100);

    const items = sourceCatalog.map((item) => {
      const inflatedCostCents = Math.round(item.unitCostCents * inflationFactor);
      const isEssential = item.id === 'food' || item.id === 'ammo';
      const baseScarcity = isEssential ? 0.0 : (item.baseScarcity ?? 0.45);
      const pSoldOut = Math.max(0.0, Math.min(0.65, baseScarcity * dRatio));
      const soldOut = pSoldOut > 0 ? this.prng.next() < pSoldOut : false;

      return {
        ...item,
        baseCostCents: item.unitCostCents,
        unitCostCents: inflatedCostCents,
        markupPct,
        soldOut,
      };
    });

    if (!baseCatalog) {
      this._storeCache = { distance: this.distance, items };
    }
    return items;
  }

  /**
   * Purchases an item from a mid-trail Fort / Highway Servo store.
   * Enforces stock availability (soldOut) and integer-cent wallet balance.
   *
   * @param {string} itemId Supply slot ID ('food', 'ammo', 'traction', 'partA', 'partB', 'partC')
   * @param {number} [qty=1] Number of packs/units to purchase
   * @param {Array<Object>} [baseCatalog] Optional catalog override
   * @returns {{ success: boolean, reason?: string, spentCents?: number, remainingCashCents?: number, unitsAdded?: number }}
   */
  buyMidTrailItem(itemId, qty = 1, baseCatalog = null) {
    if (!itemId || qty <= 0) {
      return { success: false, reason: 'INVALID_QTY' };
    }

    const catalog = this.getMidTrailStoreCatalog(baseCatalog);
    const item = catalog.find((i) => i.id === itemId);
    if (!item) {
      return { success: false, reason: 'ITEM_NOT_FOUND' };
    }
    if (item.soldOut) {
      return { success: false, reason: 'SOLD_OUT' };
    }

    const totalCostCents = qty * item.unitCostCents;
    if (totalCostCents > this.cashCents) {
      return {
        success: false,
        reason: 'INSUFFICIENT_FUNDS',
        required: totalCostCents,
        available: this.cashCents,
      };
    }

    this.cashCents -= totalCostCents;
    const unitsAdded = qty * (item.bundleSize || 1);

    if (itemId === 'traction') {
      this.traction = Math.min(this.maxTraction, this.traction + unitsAdded);
    } else {
      this.supplies[itemId] = (this.supplies[itemId] || 0) + unitsAdded;
    }

    const wp = this.getCurrentWaypoint();
    const storeTitle =
      wp?.storeName || (this.cartridgeId === 'pacific_2026' ? 'Highway Servo' : 'Trading Post');
    this.logs.push(
      `${storeTitle}: Bought +${unitsAdded} ${item.unitLabel || item.id} for $${(totalCostCents / 100).toFixed(2)}.`
    );

    return {
      success: true,
      itemId,
      qty,
      unitsAdded,
      spentCents: totalCostCents,
      remainingCashCents: this.cashCents,
    };
  }

  /**
   * Attempts an authentic MECC 1985 blind barter trade with passersby on the trail or at a rest area.
   * Does not require the player to pick a wanted item upfront.
   * Immediately consumes 1 day/leg of time and daily rations regardless of whether
   * a trader is found or a deal is accepted.
   *
   * @param {Object} [customBarterConfig] Optional barter configuration override
   * @returns {Object} Trade attempt result and generated offer (if any)
   */
  attemptBlindTrade(customBarterConfig = null) {
    if (this.status !== 'IN_PROGRESS') {
      return { success: false, reason: 'GAME_OVER' };
    }

    const defaultSlots = {
      food: { label: this.cartridgeId === 'pacific_2026' ? 'Servos Snacks' : 'lbs Food', baseQty: 25 },
      ammo: { label: this.cartridgeId === 'pacific_2026' ? 'Coins / Fuel' : 'Bullets', baseQty: 20 },
      traction: { label: this.cartridgeId === 'pacific_2026' ? '% Battery/Tyre' : 'Oxen Yoke', baseQty: 20 },
      partA: { label: this.cartridgeId === 'pacific_2026' ? 'USB-C Cable' : 'Wagon Wheel', baseQty: 1 },
      partB: { label: this.cartridgeId === 'pacific_2026' ? 'Coolant Bottle' : 'Wagon Axle', baseQty: 1 },
      partC: { label: this.cartridgeId === 'pacific_2026' ? 'Wiper Blade' : 'Wagon Tongue', baseQty: 1 },
    };

    const cfg = customBarterConfig || this.barterConfig || {
      noTradeText:
        this.cartridgeId === 'pacific_2026'
          ? 'Every Grey Nomad in the rest area has their head down eating lukewarm servo pies. Nobody wants to swap today.'
          : 'No one wants to trade with you today.',
      slots: defaultSlots,
      archetypes: [
        {
          speaker: this.cartridgeId === 'pacific_2026' ? 'Grey Nomad in a Patrol' : 'Passing Emigrant',
          text: 'Can spare {offerQty} {offerLabel} if you trade me {demandQty} {demandLabel}.',
        },
      ],
    };

    const slots = cfg.slots || defaultSlots;

    // 1. Spend 1 day / leg and consume daily rations upfront
    this.turn += 1;
    const activeParty = this.party.filter((m) => m.health > 0);
    const foodPerPerson =
      this.rationTier === 'filling' ? 3 : this.rationTier === 'meager' ? 1.5 : 0.5;
    const foodNeeded = Math.ceil(activeParty.length * foodPerPerson);
    const wasStarving = (this.supplies.food || 0) === 0;
    this.supplies.food = Math.max(0, (this.supplies.food || 0) - foodNeeded);

    if (wasStarving) {
      for (const m of activeParty) {
        m.health = Math.max(0, m.health - 8);
        m.morale = Math.max(0, m.morale - 10);
      }
      this.evaluateSurvivalStatus();
    }

    // 2. Roll for trader availability (25% chance nobody wants to trade)
    const roll = this.prng.next();
    if (roll < 0.25) {
      this.activeTradeOffer = null;
      const msg = cfg.noTradeText || 'No one willing to trade today.';
      this.logs.push(`Barter Attempt (Turn ${this.turn}): ${msg}`);
      return {
        success: true,
        foundTrader: false,
        message: msg,
      };
    }

    // 3. Pick offerSlot with desperation bias:
    // If player has 0 of a critical spare part (partA/B/C) or low traction, 60% bias toward that missing good
    const criticalParts = ['partA', 'partB', 'partC'].filter((k) => (this.supplies[k] || 0) <= 0);
    const lowTraction = this.traction <= 30;
    let offerSlotKey = null;

    if ((criticalParts.length > 0 || lowTraction) && this.prng.next() < 0.60) {
      if (criticalParts.length > 0 && lowTraction) {
        offerSlotKey = this.prng.next() < 0.5 ? this.prng.pick(criticalParts) : 'traction';
      } else if (criticalParts.length > 0) {
        offerSlotKey = this.prng.pick(criticalParts);
      } else {
        offerSlotKey = 'traction';
      }
    } else {
      const allKeys = Object.keys(slots);
      offerSlotKey = this.prng.pick(allKeys);
    }

    // Pick demandSlotKey != offerSlotKey
    const candidateDemands = Object.keys(slots).filter((k) => k !== offerSlotKey);
    const demandSlotKey = this.prng.pick(candidateDemands);
    const offerMeta = slots[offerSlotKey];
    const demandMeta = slots[demandSlotKey];

    // Desperation Demand Multiplier: 1.75x if player is missing the offered good or low traction
    const isDesperate =
      offerSlotKey === 'traction'
        ? this.traction <= 30
        : (this.supplies[offerSlotKey] || 0) <= 0;
    const mDesp = isDesperate ? 1.75 : 1.0;

    const offerQty = Math.max(1, offerMeta.baseQty || 1);
    const demandQty = Math.max(1, Math.ceil((demandMeta.baseQty || 1) * mDesp));

    const canAfford =
      demandSlotKey === 'traction'
        ? this.traction > demandQty + 10
        : (this.supplies[demandSlotKey] || 0) >= demandQty;

    const arch =
      Array.isArray(cfg.archetypes) && cfg.archetypes.length > 0
        ? this.prng.pick(cfg.archetypes)
        : { speaker: 'Trader', text: 'Trade {offerQty} {offerLabel} for {demandQty} {demandLabel}?' };

    const rawTemplate = arch.template || arch.text || 'Trade {offerQty} {offerLabel} for {demandQty} {demandLabel}?';
    const dialogue = rawTemplate
      .replace('{offerQty}', String(offerQty))
      .replace('{offerLabel}', offerMeta.label)
      .replace('{demandQty}', String(demandQty))
      .replace('{demandLabel}', demandMeta.label);

    const offer = {
      wantedSlotKey: offerSlotKey, // for backwards-compatibility
      offerSlot: offerSlotKey,
      offerSlotKey,
      offerQty,
      offerLabel: offerMeta.label,
      demandSlot: demandSlotKey,
      demandSlotKey,
      demandQty,
      demandLabel: demandMeta.label,
      desperate: isDesperate,
      mDesp,
      speaker: arch.speaker,
      npcName: arch.speaker,
      dialogue,
      canAfford,
    };

    this.activeTradeOffer = offer;
    return {
      success: true,
      foundTrader: true,
      offer,
    };
  }

  /**
   * Attempts an on-demand barter trade with passersby on the trail or at a rest area.
   * If wantedSlotKey is provided, generates an offer for that slot; otherwise executes attemptBlindTrade.
   *
   * @param {string} [wantedSlotKey] Optional supply slot ('food', 'ammo', 'traction', 'partA', 'partB', 'partC')
   * @param {Object} [customBarterConfig] Optional barter configuration override
   * @returns {Object} Trade attempt result and generated offer (if any)
   */
  initiateTradeAttempt(wantedSlotKey = null, customBarterConfig = null) {
    if (!wantedSlotKey) {
      return this.attemptBlindTrade(customBarterConfig);
    }

    if (this.status !== 'IN_PROGRESS') {
      return { success: false, reason: 'GAME_OVER' };
    }

    const defaultSlots = {
      food: { label: this.cartridgeId === 'pacific_2026' ? 'Servos Snacks' : 'lbs Food', baseQty: 25 },
      ammo: { label: this.cartridgeId === 'pacific_2026' ? 'Coins / Fuel' : 'Bullets', baseQty: 20 },
      traction: { label: this.cartridgeId === 'pacific_2026' ? '% Battery/Tyre' : 'Oxen Yoke', baseQty: 20 },
      partA: { label: this.cartridgeId === 'pacific_2026' ? 'USB-C Cable' : 'Wagon Wheel', baseQty: 1 },
      partB: { label: this.cartridgeId === 'pacific_2026' ? 'Coolant Bottle' : 'Wagon Axle', baseQty: 1 },
      partC: { label: this.cartridgeId === 'pacific_2026' ? 'Wiper Blade' : 'Wagon Tongue', baseQty: 1 },
    };

    const cfg = customBarterConfig || this.barterConfig || {
      noTradeText:
        this.cartridgeId === 'pacific_2026'
          ? 'No one in the servo carpark wants to swap gear right now.'
          : 'Nobody meets your eye on the trail today. No trade.',
      slots: defaultSlots,
      archetypes: [
        {
          speaker: this.cartridgeId === 'pacific_2026' ? 'Grey Nomad in a Patrol' : 'Passing Emigrant',
          text: 'Can spare {offerQty} {offerLabel} if you trade me {demandQty} {demandLabel}.',
        },
      ],
    };

    const slots = cfg.slots || defaultSlots;
    if (!slots[wantedSlotKey]) {
      return { success: false, reason: 'INVALID_SLOT' };
    }

    // 1. Spend 1 day / leg and consume daily rations upfront
    this.turn += 1;
    const activeParty = this.party.filter((m) => m.health > 0);
    const foodPerPerson =
      this.rationTier === 'filling' ? 3 : this.rationTier === 'meager' ? 1.5 : 0.5;
    const foodNeeded = Math.ceil(activeParty.length * foodPerPerson);
    const wasStarving = (this.supplies.food || 0) === 0;
    this.supplies.food = Math.max(0, (this.supplies.food || 0) - foodNeeded);

    if (wasStarving) {
      for (const m of activeParty) {
        m.health = Math.max(0, m.health - 8);
        m.morale = Math.max(0, m.morale - 10);
      }
      this.evaluateSurvivalStatus();
    }

    // 2. Roll for trader availability (25% chance nobody wants to trade)
    const roll = this.prng.next();
    if (roll < 0.25) {
      this.activeTradeOffer = null;
      const msg = cfg.noTradeText || 'No one willing to trade today.';
      this.logs.push(`Barter Attempt (Turn ${this.turn}): ${msg}`);
      return {
        success: true,
        foundTrader: false,
        wantedSlotKey,
        message: msg,
      };
    }

    // 3. Pick a random demanded slot different from wantedSlotKey
    const candidateKeys = Object.keys(slots).filter((k) => k !== wantedSlotKey);
    const demandSlotKey = this.prng.pick(candidateKeys);
    const wantedMeta = slots[wantedSlotKey];
    const demandMeta = slots[demandSlotKey];

    // 4. Desperation Barter Multiplier (M_desp = 1.75 when player has 0 of wanted item or low traction)
    const isDesperate =
      wantedSlotKey === 'traction'
        ? this.traction <= 30
        : (this.supplies[wantedSlotKey] || 0) <= 0;
    const mDesp = isDesperate ? 1.75 : 1.0;

    const offerQty = Math.max(1, wantedMeta.baseQty || 1);
    const demandQty = Math.max(1, Math.ceil((demandMeta.baseQty || 1) * mDesp));

    const canAfford =
      demandSlotKey === 'traction'
        ? this.traction > demandQty + 10
        : (this.supplies[demandSlotKey] || 0) >= demandQty;

    const arch =
      Array.isArray(cfg.archetypes) && cfg.archetypes.length > 0
        ? this.prng.pick(cfg.archetypes)
        : { speaker: 'Trader', text: 'Trade {offerQty} {offerLabel} for {demandQty} {demandLabel}?' };

    const rawTemplate = arch.template || arch.text || 'Trade {offerQty} {offerLabel} for {demandQty} {demandLabel}?';
    const dialogue = rawTemplate
      .replace('{offerQty}', String(offerQty))
      .replace('{offerLabel}', wantedMeta.label)
      .replace('{demandQty}', String(demandQty))
      .replace('{demandLabel}', demandMeta.label);

    const offer = {
      wantedSlotKey,
      offerSlot: wantedSlotKey,
      offerSlotKey: wantedSlotKey,
      offerQty,
      offerLabel: wantedMeta.label,
      demandSlot: demandSlotKey,
      demandSlotKey,
      demandQty,
      demandLabel: demandMeta.label,
      desperate: isDesperate,
      mDesp,
      speaker: arch.speaker,
      npcName: arch.speaker,
      dialogue,
      canAfford,
    };

    this.activeTradeOffer = offer;
    return {
      success: true,
      foundTrader: true,
      offer,
    };
  }

  /**
   * Executes an active barter offer (pure goods-for-goods swap, zero cash touched).
   *
   * @param {Object} [offer=this.activeTradeOffer]
   * @returns {{ success: boolean, reason?: string, traded?: Object }}
   */
  acceptTradeOffer(offer = this.activeTradeOffer) {
    if (!offer) {
      return { success: false, reason: 'NO_ACTIVE_OFFER' };
    }

    const { wantedSlotKey, offerQty, demandSlotKey, demandQty } = offer;

    // Re-verify player still holds demanded goods
    if (demandSlotKey === 'traction') {
      if (this.traction <= demandQty + 10) {
        return { success: false, reason: 'INSUFFICIENT_GOODS' };
      }
      this.traction = Math.max(10, this.traction - demandQty);
    } else {
      if ((this.supplies[demandSlotKey] || 0) < demandQty) {
        return { success: false, reason: 'INSUFFICIENT_GOODS' };
      }
      this.supplies[demandSlotKey] -= demandQty;
    }

    // Grant wanted goods
    if (wantedSlotKey === 'traction') {
      this.traction = Math.min(this.maxTraction, this.traction + offerQty);
    } else {
      this.supplies[wantedSlotKey] = (this.supplies[wantedSlotKey] || 0) + offerQty;
    }

    this.activeTradeOffer = null;
    this.logs.push(
      `Barter Deal (${offer.speaker}): Swapped ${demandQty} ${offer.demandLabel} for +${offerQty} ${offer.offerLabel}.`
    );

    return {
      success: true,
      traded: offer,
    };
  }

  /**
   * Resolves an obstacle (River Crossing or Highway Bottleneck).
   *
   * Actions:
   * - 'force': Ford river / Brave gridlock
   * - 'adapt': Caulk & float / Backroad detour
   * - 'pay': Ferry / Toll road
   * - 'delay': Camp on bank / Lay low at bakery (drifts Phi by +/-0.1)
   * - 'guide': Barter goods for Indigenous/Local Guide or UHF Truckie Escort (96% safe pass)
   *
   * @param {'force'|'adapt'|'pay'|'delay'|'guide'} action
   * @param {Object} [perks={}] e.g. { carpenterPerk: boolean }
   * @returns {Object} Resolution outcome
   */
  resolveObstacle(action, perks = {}) {
    if (!this.activeObstacle) {
      throw new Error('No active obstacle to resolve.');
    }

    const obs = this.activeObstacle;
    let phi = obs.phi ?? 0.5;
    const psi = obs.psi ?? 0.5;

    let success = false;
    let pSuccess = 0;
    const outcome = { action, success: false, costCents: 0, penalty: null };

    if (action === 'force') {
      // P(Success) = max(0.05, 1.0 - (Phi / 0.65)^2)
      pSuccess = Math.max(0.05, 1.0 - Math.pow(phi / 0.65, 2));
      success = this.prng.next() < pSuccess;
      outcome.pSuccess = pSuccess;
      outcome.success = success;

      if (!success) {
        this.supplies.food = Math.max(0, this.supplies.food - 25);
        this.traction = Math.max(10, this.traction - 25);
        outcome.penalty = 'Lost 25 food/snacks and suffered 25% traction damage.';
      }
    } else if (action === 'adapt') {
      // P(Success) = max(0.10, 1.0 - (Phi * Psi * 1.3)) + perks
      pSuccess = Math.max(0.10, 1.0 - (phi * psi * 1.3));
      if (perks.carpenterPerk) pSuccess = Math.min(0.95, pSuccess + 0.35);
      success = this.prng.next() < pSuccess;
      outcome.pSuccess = pSuccess;
      outcome.success = success;

      if (!success) {
        for (const m of this.party) {
          m.health = Math.max(0, m.health - 15);
        }
        outcome.penalty = 'Rough crossing! All party members took -15 health damage.';
      }
    } else if (action === 'pay') {
      // Cost: C_base * (1 + Psi) in integer cents
      const baseCost = obs.costCents || 500;
      const totalCost = Math.round(baseCost * (1 + psi));
      if (this.cashCents < totalCost) {
        return { action: 'pay', success: false, error: 'INSUFFICIENT_FUNDS', costCents: totalCost };
      }
      this.cashCents -= totalCost;
      outcome.success = true;
      outcome.costCents = totalCost;
      success = true;

      // Ferry / Bottleneck Queue Wait Days (burns 1-3 days and daily rations in queue)
      if (obs.type === 'river' || obs.ferryWaitDays !== undefined) {
        const ferryWaitDays =
          obs.ferryWaitDays ?? (this.cartridgeId === 'oregon_1848' ? Math.floor(this.prng.range(1, 3)) : 1);
        if (ferryWaitDays > 0) {
          this.turn += ferryWaitDays;
          const activeParty = this.party.filter((m) => m.health > 0);
          const foodPerPerson =
            this.rationTier === 'filling' ? 3 : this.rationTier === 'meager' ? 2 : 1;
          const foodUsed = foodPerPerson * activeParty.length * ferryWaitDays;
          const wasStarving = (this.supplies.food || 0) === 0;
          this.supplies.food = Math.max(0, (this.supplies.food || 0) - foodUsed);

          if (wasStarving || this.supplies.food === 0) {
            for (const m of activeParty) {
              m.health = Math.max(0, m.health - 5 * ferryWaitDays);
              m.morale = Math.max(0, (m.morale ?? 100) - 5 * ferryWaitDays);
            }
          }
          outcome.ferryWaitDays = ferryWaitDays;
          outcome.foodConsumed = foodUsed;
        }
      }
    } else if (action === 'guide') {
      const guideCost = obs.guideCost;
      if (!guideCost || !guideCost.slot || !guideCost.qty) {
        return { action: 'guide', success: false, error: 'NO_GUIDE_AVAILABLE' };
      }
      const haveQty = this.supplies[guideCost.slot] || 0;
      if (haveQty < guideCost.qty) {
        return {
          action: 'guide',
          success: false,
          error: 'INSUFFICIENT_SUPPLIES',
          required: guideCost,
        };
      }
      this.supplies[guideCost.slot] = haveQty - guideCost.qty;
      pSuccess = 0.96;
      success = this.prng.next() < pSuccess;
      outcome.pSuccess = pSuccess;
      outcome.success = success;
      outcome.guidePaid = guideCost;

      if (!success) {
        for (const m of this.party) {
          m.health = Math.max(0, m.health - 8);
        }
        outcome.penalty = 'Even with a local guide, a sudden surge bruised the party (-8 HP).';
      }
    } else if (action === 'delay') {
      // Delay costs a turn & daily rations, but reduces depth and width (or swells in rain)
      this.turn += 1;
      const activeParty = this.party.filter((m) => m.health > 0);
      const foodPerPerson =
        this.rationTier === 'filling' ? 3 : this.rationTier === 'meager' ? 2 : 1;
      const foodNeeded = foodPerPerson * activeParty.length;
      const wasStarving = (this.supplies.food || 0) === 0;
      this.supplies.food = Math.max(0, (this.supplies.food || 0) - foodNeeded);

      if (wasStarving || this.supplies.food === 0) {
        for (const m of activeParty) {
          m.health = Math.max(0, m.health - 10);
          m.morale = Math.max(0, (m.morale ?? 100) - 12);
          m.status = 'Starving';
        }
      }

      // Depth & Width decay:
      // In rain/storm, depth swells (+0.08); otherwise recedes by 0.06 - 0.14 and width shrinks by 4%
      if (this.weatherSeverity > 1.2 || obs.weather === 'RAIN' || obs.weather === 'STORM') {
        obs.phi = Math.min(0.95, phi + 0.08);
      } else {
        const decay = this.prng.range(0.06, 0.14, true);
        obs.phi = Math.max(0.15, phi - decay);
        if (typeof obs.width === 'number') {
          obs.width = Math.max(50, Math.round(obs.width * 0.96 * 10) / 10);
        }
      }
      obs.depth = Number((obs.phi * 10).toFixed(1));

      outcome.success = true;
      outcome.newPhi = obs.phi;
      outcome.newDepth = obs.depth;
      outcome.newWidth = obs.width;
      outcome.penalty = 'Rested 1 turn. River depth / bottleneck conditions shifted.';
      return outcome;
    }

    if (success) {
      this.activeObstacle = null;
    }

    this.evaluateSurvivalStatus();
    return outcome;
  }

  /**
   * Selects an active route fork at a branch point waypoint.
   * Modifies overall distance delta and hazard multiplier.
   *
   * @param {string} branchId Branch choice ID
   * @returns {{ success: boolean, reason?: string, branch?: Object }}
   */
  selectBranch(branchId) {
    const wp = this.getCurrentWaypoint() || this.getNextWaypoint();
    if (!wp || !Array.isArray(wp.branches) || wp.branches.length === 0) {
      return { success: false, reason: 'NO_BRANCHES_AVAILABLE' };
    }

    const branch = wp.branches.find((b) => b.id === branchId);
    if (!branch) {
      return { success: false, reason: 'BRANCH_NOT_FOUND' };
    }

    this.chosenBranches = this.chosenBranches || [];
    this.chosenBranches.push(branch.id);

    if (branch.distanceDelta) {
      this.totalDistance = Math.max(this.distance + 10, this.totalDistance + branch.distanceDelta);
    }
    if (branch.hazardMult) {
      this.hazardMultiplier = Number(((this.hazardMultiplier || 1.0) * branch.hazardMult).toFixed(2));
    }

    this.logs.push(`Route Fork Chosen: ${branch.label}.`);
    return {
      success: true,
      branch,
      newTotalDistance: this.totalDistance,
      newHazardMultiplier: this.hazardMultiplier,
    };
  }

  /**
   * Calculates normalized final score.
   * Universal Formula:
   * Score = [S_comp + sum(H_p * W_role) + sum(Q_r * V_r) + max(0, (T_par - T_actual) * K_t) - Penalties] * M_diff
   *
   * @returns {number}
   */
  calculateScore() {
    const isCompleted = this.status === 'WON';

    // 1. Completion reward (5,000 pts if won; 50% proportional if abandoned/died)
    let sComp = 0;
    if (isCompleted) {
      sComp = 5000;
    } else {
      sComp = Math.floor((this.distance / this.totalDistance) * 2500);
    }

    // 2. Living/Active Vitality (Primary: 15 pts/%, Secondary: 8 pts/%, Pet: 5 pts/%)
    let vitalityScore = 0;
    for (const m of this.party) {
      if (m.health <= 0) continue;
      const weight = m.role === 'primary' ? 15 : (m.role === 'secondary' ? 8 : 5);
      vitalityScore += m.health * weight;
    }

    // 3. Unused Resources (Capped at reasonable arrival ceilings to kill hoarding exploits)
    const foodCap = this.cartridgeId === 'pacific_2026' ? 50 : 200;
    const foodPts = Math.min(this.supplies.food, foodCap) * 5;

    const cashCapCents = Math.floor(this.startingCashCents * 0.25);
    const countedCashCents = Math.min(this.cashCents, cashCapCents);
    const cashPts = Math.floor((countedCashCents / 100) * 1.5);

    const partsTotal = (this.supplies.partA || 0) + (this.supplies.partB || 0) + (this.supplies.partC || 0);
    const partsPts = Math.min(partsTotal, 5) * 60;

    const resourceScore = foodPts + cashPts + partsPts;

    // 4. Time Par Bonus
    const timeBonus = Math.max(0, (this.tPar - this.turn) * this.kt);

    // 5. Penalties
    let penalties = 0;
    for (const m of this.party) {
      if (m.health <= 0 || (m.role === 'primary' && (m.morale ?? 100) <= 0)) {
        penalties += 500;
      }
    }
    if (this.status === 'U_TURN') {
      penalties += 250;
    }

    // Dad Ego Bonus (2026 only, capped at +250)
    const egoBonus = Math.min(250, Math.max(0, this.dadEgo));

    const rawTotal = sComp + vitalityScore + resourceScore + timeBonus - penalties + egoBonus;

    // Multiplier M_diff applies ONLY on successful arrival
    const effectiveMult = isCompleted ? this.scoreMultiplier : 1.0;
    return Math.max(0, Math.round(rawTotal * effectiveMult));
  }

  /**
   * Serializes complete engine state for saving.
   * @returns {Object}
   */
  getState() {
    return {
      cartridgeId: this.cartridgeId,
      prngState: this.prng.getState(),
      distance: this.distance,
      turn: this.turn,
      supplies: { ...this.supplies },
      cashCents: this.cashCents,
      party: JSON.parse(JSON.stringify(this.party)),
      traction: this.traction,
      currentPaceKey: this.currentPaceKey,
      rationTier: this.rationTier,
      resolvedWaypoints: Array.from(this.resolvedWaypoints),
      hazardCooldown: this.hazardCooldown,
      hazardMultiplier: this.hazardMultiplier,
      chosenBranches: [...(this.chosenBranches || [])],
      status: this.status,
      dadEgo: this.dadEgo,
      activeObstacle: this.activeObstacle ? JSON.parse(JSON.stringify(this.activeObstacle)) : null,
      logs: [...this.logs],
    };
  }

  /**
   * Restores engine state from serialized object.
   * @param {Object} state
   */
  setState(state) {
    if (!state) return;
    this.cartridgeId = state.cartridgeId || this.cartridgeId;
    if (state.prngState) this.prng.setState(state.prngState);
    this.distance = state.distance ?? this.distance;
    this.turn = state.turn ?? this.turn;
    this.supplies = Object.assign(this.supplies, state.supplies || {});
    this.cashCents = state.cashCents ?? this.cashCents;
    if (Array.isArray(state.party)) this.party = JSON.parse(JSON.stringify(state.party));
    this.traction = state.traction ?? this.traction;
    this.currentPaceKey = state.currentPaceKey ?? this.currentPaceKey;
    this.rationTier = state.rationTier ?? this.rationTier;
    this.resolvedWaypoints = new Set(state.resolvedWaypoints || []);
    this.hazardCooldown = state.hazardCooldown ?? this.hazardCooldown;
    this.hazardMultiplier = state.hazardMultiplier ?? this.hazardMultiplier;
    this.chosenBranches = Array.isArray(state.chosenBranches) ? [...state.chosenBranches] : [];
    this.status = state.status ?? this.status;
    this.dadEgo = state.dadEgo ?? this.dadEgo;
    this.activeObstacle = state.activeObstacle ? JSON.parse(JSON.stringify(state.activeObstacle)) : null;
    this.logs = Array.isArray(state.logs) ? [...state.logs] : [];
  }
}
