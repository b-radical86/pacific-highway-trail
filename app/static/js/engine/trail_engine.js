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

    // Route Waypoints
    this.waypoints = Array.isArray(config.waypoints) ? config.waypoints : [];

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
    this.status = 'IN_PROGRESS'; // 'IN_PROGRESS' | 'WON' | 'DIED' | 'U_TURN'
    this.dadEgo = 0;
    this.activeObstacle = null;
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
    const prodGamma = gamma1 * gamma2 * Math.pow(paceMult, 1.35) * this.weatherSeverity;

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

    // Decrement hazard cooldown
    if (this.hazardCooldown > 0) {
      this.hazardCooldown -= 1;
    }

    // Consume Food Rations
    const foodPerPerson = this.rationTier === 'filling' ? 3 : (this.rationTier === 'meager' ? 2 : 1);
    const activeCount = this.party.filter(m => m.health > 0).length;
    const foodUsed = foodPerPerson * activeCount;
    this.supplies.food = Math.max(0, this.supplies.food - foodUsed);

    // If out of food, apply starvation damage to health
    if (this.supplies.food === 0) {
      for (const m of this.party) {
        if (m.health > 0) m.health = Math.max(0, m.health - 10);
      }
      this.logs.push('Rations exhausted! Party suffered starvation health penalty.');
    }

    // Handle Interrupt Types
    if (prep.interruptType === 'WAYPOINT' && prep.waypoint) {
      this.resolvedWaypoints.add(prep.waypoint.id);
      if (prep.waypoint.obstacle) {
        this.activeObstacle = JSON.parse(JSON.stringify(prep.waypoint.obstacle));
        this.activeObstacle.waypointId = prep.waypoint.id;
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
   * Resolves an obstacle (River Crossing or Highway Bottleneck).
   *
   * Actions:
   * - 'force': Ford river / Brave gridlock
   * - 'adapt': Caulk & float / Backroad detour
   * - 'pay': Ferry / Toll road
   * - 'delay': Camp on bank / Lay low at bakery (drifts Phi by +/-0.1)
   *
   * @param {'force'|'adapt'|'pay'|'delay'} action
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
    } else if (action === 'delay') {
      // Delay costs a turn & rations, but drifts Phi by +/- 0.1
      this.turn += 1;
      const drift = this.prng.range(-0.1, 0.1, true);
      obs.phi = Math.max(0.15, Math.min(0.95, phi + drift));
      outcome.success = true;
      outcome.newPhi = obs.phi;
      outcome.penalty = 'Rested 1 turn. River depth / traffic conditions shifted.';
      return outcome;
    }

    if (success) {
      this.activeObstacle = null;
    }

    this.evaluateSurvivalStatus();
    return outcome;
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
    this.status = state.status ?? this.status;
    this.dadEgo = state.dadEgo ?? this.dadEgo;
    this.activeObstacle = state.activeObstacle ? JSON.parse(JSON.stringify(state.activeObstacle)) : null;
    this.logs = Array.isArray(state.logs) ? [...state.logs] : [];
  }
}
