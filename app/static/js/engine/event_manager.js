/**
 * EventManager — Role-Aware Declarative Event DSL Evaluator.
 *
 * Provides:
 * - Dynamic event deck filtering & state-conditional weighting (weightRules)
 * - Dice rolls with stat & weather modifiers (roll.modifiers)
 * - Role-targeted atomic mutations (role:adult, role:child, role:all, member:Name, run)
 * - Safe closed operation dispatch (addResource, addStat, addStatus, addTime, setFlag)
 */

export class EventManager {
  /**
   * @param {Array<Object>} [deck=[]] Event deck
   * @param {import('./prng.js').PRNG} prng Seeded random number generator
   */
  constructor(deck = [], prng) {
    this.deck = deck;
    this.prng = prng;
    this.flags = {};
  }

  /**
   * Sets or updates the active deck.
   * @param {Array<Object>} deck
   */
  setDeck(deck) {
    this.deck = deck;
  }

  /**
   * Evaluates if an event satisfies minimum turn, distance, and prerequisite conditions.
   * @param {Object} event
   * @param {import('./trail_engine.js').CoreTrailEngine} engine
   * @returns {boolean}
   */
  isEventEligible(event, engine) {
    if (!event) return false;
    const cond = event.conditions || {};

    if (cond.cartridge && cond.cartridge !== engine.cartridgeId) return false;
    if (typeof cond.minTurn === 'number' && engine.turn < cond.minTurn) return false;
    if (typeof cond.minDistance === 'number' && engine.distance < cond.minDistance) return false;
    if (typeof cond.maxDistance === 'number' && engine.distance > cond.maxDistance) return false;

    if (typeof cond.custom === 'function') {
      try {
        if (!cond.custom(engine, this.flags)) return false;
      } catch {
        return false;
      }
    }

    return true;
  }

  /**
   * Calculates the dynamic weight of an eligible event considering weightRules.
   * @param {Object} event
   * @param {import('./trail_engine.js').CoreTrailEngine} engine
   * @returns {number}
   */
  computeEventWeight(event, engine) {
    let weight = event.baseWeight ?? 10;
    if (weight <= 0) return 0;

    const rules = event.weightRules || [];
    for (const rule of rules) {
      if (!rule) continue;
      let matches = false;

      if (typeof rule.condition === 'function') {
        matches = rule.condition(engine, this.flags);
      } else if (typeof rule.condition === 'string') {
        matches = this.evaluateSimpleCondition(rule.condition, engine);
      }

      if (matches) {
        weight *= (rule.multiplier ?? 1.0);
      }
    }

    return Math.max(0, weight);
  }

  /**
   * Helper to parse simple condition strings (e.g. "supplies.partA === 0" or "pace === 'hamish'").
   * @param {string} condStr
   * @param {import('./trail_engine.js').CoreTrailEngine} engine
   * @returns {boolean}
   */
  evaluateSimpleCondition(condStr, engine) {
    if (condStr === 'low_food') return engine.supplies.food < 15;
    if (condStr === 'low_fuel') return engine.traction < 30;
    if (condStr === 'has_nappy_kit') return (engine.supplies.partA || 0) > 0;
    if (condStr === 'no_nappy_kit') return (engine.supplies.partA || 0) <= 0;
    if (condStr.startsWith('pace ===')) {
      const target = condStr.split('===')[1].trim().replace(/['"]/g, '');
      return engine.currentPaceKey === target;
    }
    if (condStr.startsWith('status ===')) {
      const target = condStr.split('===')[1].trim().replace(/['"]/g, '');
      return engine.party.some(m => m.status === target);
    }
    return false;
  }

  /**
   * Selects an eligible event from the deck using weighted random sampling.
   * @param {import('./trail_engine.js').CoreTrailEngine} engine
   * @returns {Object|null}
   */
  pickEligibleEvent(engine) {
    const candidates = [];
    let totalWeight = 0;

    for (const event of this.deck) {
      if (this.isEventEligible(event, engine)) {
        const w = this.computeEventWeight(event, engine);
        if (w > 0) {
          candidates.push({ event, weight: w });
          totalWeight += w;
        }
      }
    }

    if (candidates.length === 0 || totalWeight <= 0) return null;

    let sample = this.prng.next() * totalWeight;
    for (const item of candidates) {
      if (sample < item.weight) {
        return item.event;
      }
      sample -= item.weight;
    }

    return candidates[candidates.length - 1].event;
  }

  /**
   * Resolves target entities from target selectors:
   * - "role:adult" | "role:primary"
   * - "role:child" | "role:secondary"
   * - "role:pet"
   * - "role:all"
   * - "member:<Name>"
   * - "run"
   *
   * @param {string} targetStr
   * @param {import('./trail_engine.js').CoreTrailEngine} engine
   * @returns {Array<Object>|'run'}
   */
  resolveTargets(targetStr, engine) {
    if (!targetStr || targetStr === 'run') return 'run';

    if (targetStr === 'role:adult' || targetStr === 'role:primary') {
      return engine.party.filter(m => m.role === 'primary');
    }
    if (targetStr === 'role:child' || targetStr === 'role:secondary') {
      return engine.party.filter(m => m.role === 'secondary');
    }
    if (targetStr === 'role:pet') {
      return engine.party.filter(m => m.role === 'pet');
    }
    if (targetStr === 'role:all') {
      return engine.party;
    }
    if (targetStr.startsWith('member:')) {
      const targetName = targetStr.replace('member:', '').trim().toLowerCase();
      return engine.party.filter(m => m.name.toLowerCase().includes(targetName));
    }

    return [];
  }

  /**
   * Evaluates if a choice's inventory requirements are satisfied.
   * @param {Object} choice
   * @param {import('./trail_engine.js').CoreTrailEngine} engine
   * @returns {{ allowed: boolean, reason?: string }}
   */
  canAffordChoice(choice, engine) {
    if (!choice.requires) return { allowed: true };
    const req = choice.requires;

    if (req.item === 'cashCents') {
      if (engine.cashCents < req.qty) {
        return { allowed: false, reason: `Requires $${(req.qty / 100).toFixed(2)}` };
      }
    } else if (req.item in engine.supplies) {
      if (engine.supplies[req.item] < req.qty) {
        return { allowed: false, reason: `Requires ${req.qty}x ${req.item}` };
      }
    }

    return { allowed: true };
  }

  /**
   * Executes an atomic effect instruction on the engine.
   * @param {Object} effect
   * @param {import('./trail_engine.js').CoreTrailEngine} engine
   */
  applyEffect(effect, engine) {
    if (!effect || !effect.op) return;

    if (effect.op === 'addResource') {
      if (effect.item === 'cashCents') {
        engine.cashCents = Math.max(0, engine.cashCents + (effect.amount || 0));
      } else if (effect.item in engine.supplies) {
        engine.supplies[effect.item] = Math.max(0, engine.supplies[effect.item] + (effect.amount || 0));
      }
    } else if (effect.op === 'addStat') {
      const targets = this.resolveTargets(effect.target, engine);
      if (targets === 'run') {
        if (effect.stat === 'dadEgo') {
          engine.dadEgo = Math.max(0, Math.min(250, engine.dadEgo + (effect.amount || 0)));
        } else if (effect.stat === 'traction') {
          engine.traction = Math.max(10, Math.min(100, engine.traction + (effect.amount || 0)));
        }
      } else {
        for (const member of targets) {
          if (effect.stat === 'health') {
            member.health = Math.max(0, Math.min(100, member.health + (effect.amount || 0)));
          } else if (effect.stat === 'morale') {
            member.morale = Math.max(0, Math.min(100, (member.morale ?? 100) + (effect.amount || 0)));
          }
        }
      }
    } else if (effect.op === 'addStatus') {
      const targets = this.resolveTargets(effect.target, engine);
      if (Array.isArray(targets)) {
        for (const member of targets) {
          member.status = effect.status;
          if (!Array.isArray(member.statusEffects)) member.statusEffects = [];

          if (Array.isArray(effect.clearExisting)) {
            member.statusEffects = member.statusEffects.filter(s => !effect.clearExisting.includes(s.id));
          }
          if (effect.durationTurns) {
            member.statusEffects.push({
              id: effect.status,
              label: effect.status,
              turnsRemaining: effect.durationTurns,
              modifiers: effect.modifiers || {},
            });
          }
        }
      }
    } else if (effect.op === 'addTime') {
      engine.turn += (effect.turns || 0);
    } else if (effect.op === 'setFlag') {
      this.flags[effect.flag] = effect.value;
    } else if (effect.op === 'triggerEvent') {
      this.flags.chainedEventId = effect.eventId;
    }
  }

  /**
   * Evaluates a player's choice, rolls dice if necessary, executes effects, and logs results.
   * @param {import('./trail_engine.js').CoreTrailEngine} engine
   * @param {Object} event
   * @param {Object} choice
   * @returns {Object} Execution receipt
   */
  executeChoice(engine, event, choice) {
    const affordability = this.canAffordChoice(choice, engine);
    if (!affordability.allowed) {
      return { success: false, reason: affordability.reason };
    }

    let passed = true;
    let rollResult = null;

    // Evaluate roll if choice has a test requirement
    if (choice.roll) {
      const baseRoll = this.prng.d100();
      let modifiedThreshold = choice.roll.threshold || 50;

      for (const mod of (choice.roll.modifiers || [])) {
        if (mod && this.evaluateSimpleCondition(mod.condition, engine)) {
          modifiedThreshold += (mod.modifier || 0);
        }
      }

      passed = baseRoll <= modifiedThreshold;
      rollResult = { roll: baseRoll, threshold: modifiedThreshold, passed };
    }

    // Determine list of effects to execute
    const effectsToApply = choice.roll
      ? (passed ? (choice.onPass || []) : (choice.onFail || []))
      : (choice.effects || []);

    for (const eff of effectsToApply) {
      this.applyEffect(eff, engine);
    }

    // Update survival and logs
    engine.evaluateSurvivalStatus();
    const resultLog = `${event.title}: Chose "${choice.label}" -> ${passed ? 'Success' : 'Complications'}`;
    engine.logs.push(resultLog);

    return {
      success: true,
      passed,
      rollResult,
      appliedCount: effectsToApply.length,
      log: resultLog,
    };
  }
}
