/**
 * HuntScene — High-Fidelity 30-Second Target Mini-Game.
 *
 * Supports:
 * - 1848: Prairie Hunting (Bison, Deer, Rabbits with snow-capped Rockies & mountain parallax)
 * - 2026: Coastal Rest-Stop Defence (Shooing swooping Bin Chickens & Seagulls; salvaging Flat Whites & Sausage Rolls)
 * - Interactive Animated Crosshair with recoil, hover-lock indicators, and real-time pointer tracking
 * - High-detail procedural vector artwork (waves, dunes, picnic table, wheelie bin, flapping bird wings)
 * - Particle engine (feathers, steam wisps, pastry crumbs, floating comic score popups)
 * - Minimum 22px pointer hit radius (retina/touch safe)
 */

export class HuntScene {
  /**
   * @param {Object} options Configuration
   * @param {'oregon_1848'|'pacific_2026'} options.cartridgeId
   * @param {number} [options.ammo=20] Initial ammo/coins
   * @param {number} [options.difficultyMultiplier=1.0] Difficulty scaling (1.0 = Easy, 2.0 = Med, 3.0 = Hard)
   * @param {number} [options.distance=0] Current travel distance
   * @param {number} [options.totalDistance=2000] Total route distance
   * @param {Function} [options.onComplete] Callback with { foodYield, ammoSpent, sanityGained }
   */
  constructor(options = {}) {
    this.cartridgeId = options.cartridgeId || 'pacific_2026';
    this.initialAmmo = options.ammo ?? 20;
    this.ammo = this.initialAmmo;
    this.difficultyMultiplier = options.difficultyMultiplier || 1.0;
    this.distance = options.distance || 0;
    this.totalDistance = options.totalDistance || (this.cartridgeId === 'pacific_2026' ? 920 : 2000);
    this.onComplete = options.onComplete || (() => {});

    // Difficulty scaling:
    // Easy (1.0x): 28s timer, speed factor 0.85, hit radius bonus +6px
    // Medium (2.0x): 22s timer, speed factor 1.15, hit radius 0px
    // Hard (3.0x): 16s timer, speed factor 1.45, hit radius penalty -4px
    if (this.difficultyMultiplier >= 2.8) {
      this.maxTimer = 16.0;
      this.speedFactor = 1.45;
      this.hitRadiusOffset = -4;
      this.maxTargetDensity = this.cartridgeId === 'pacific_2026' ? 3 : 2;
    } else if (this.difficultyMultiplier >= 1.8) {
      this.maxTimer = 22.0;
      this.speedFactor = 1.15;
      this.hitRadiusOffset = 0;
      this.maxTargetDensity = this.cartridgeId === 'pacific_2026' ? 4 : 3;
    } else {
      this.maxTimer = 28.0;
      this.speedFactor = 0.85;
      this.hitRadiusOffset = 6;
      this.maxTargetDensity = this.cartridgeId === 'pacific_2026' ? 5 : 4;
    }
    this.timer = this.maxTimer;

    // Biome Resolution:
    // 1848: PLAINS (0 - 640 mi), MOUNTAINS_WOODS (640 - 1534 mi), DESERT_CRAGS (1534 - 2000 mi)
    // 2026: HIGHWAY_RURAL (0 - 315 km), COASTAL_WOODS (315 - 740 km), SUBURBAN_BORDER (740 - 920 km)
    const distRatio = Math.max(0, Math.min(1, this.distance / this.totalDistance));
    if (distRatio < 0.35) {
      this.biome = 'PLAINS';
    } else if (distRatio < 0.78) {
      this.biome = 'WOODS';
    } else {
      this.biome = 'CRAGS';
    }

    // Barren spot roll: 20% to 35% chance depending on difficulty
    const barrenChance = Math.min(0.35, 0.18 + (this.difficultyMultiplier - 1.0) * 0.08);
    this.isBarren = Math.random() < barrenChance;

    this.isActive = true;
    this.ammoSpent = 0;
    this.foodHarvested = 0;
    this.sanityGained = 0;

    // Caps per specification
    this.carryCap = this.cartridgeId === 'pacific_2026' ? 20 : 100;

    // Animation & Reticle tracking
    this.animTime = 0;
    this.crosshairX = 400;
    this.crosshairY = 200;
    this.recoil = 0;
    this.hoverTarget = null;
    this.keyState = { up: false, down: false, left: false, right: false };

    // Particles & visual effects
    this.particles = [];
    this.floatingTexts = [];
    this.shotFlashes = [];

    // Spawn initial target entities
    this.entities = [];
    if (!this.isBarren) {
      this._spawnInitialEntities();
    } else {
      // Auto-exit after 4.5 seconds if barren
      this.timer = Math.min(this.timer, 5.0);
    }
  }

  _spawnInitialEntities() {
    const count = Math.min(this.maxTargetDensity, this.cartridgeId === 'pacific_2026' ? 3 : 2);
    for (let i = 0; i < count; i++) {
      this._spawnEntity(true);
    }
  }

  _spawnEntity(randomX = false) {
    if (this.isBarren || this.entities.length >= this.maxTargetDensity) return;

    const fromLeft = Math.random() > 0.5;
    const x = randomX ? 80 + Math.random() * 640 : fromLeft ? -50 : 850;
    const y = 90 + Math.random() * 210;
    const phase = Math.random() * Math.PI * 2;
    const spd = this.speedFactor;

    if (this.cartridgeId === 'oregon_1848') {
      const roll = Math.random();

      if (this.biome === 'PLAINS') {
        // High Bison presence (50%), Rabbits (35%), Deer (15%)
        if (roll < 0.50) {
          this.entities.push({
            type: 'BISON',
            x,
            y: 200 + Math.random() * 90,
            vx: (fromLeft ? 1 : -1) * (24 + Math.random() * 18) * spd,
            r: 30,
            phase,
            yieldFood: 200,
            label: 'Plains Bison (200 lbs)',
            color: '#38220f',
          });
        } else if (roll < 0.85) {
          this.entities.push({
            type: 'RABBIT',
            x,
            y: 240 + Math.random() * 80,
            vx: (fromLeft ? 1 : -1) * (90 + Math.random() * 45) * spd,
            r: 18,
            phase,
            yieldFood: 15,
            label: 'Prairie Hare (15 lbs)',
            color: '#d6d3d1',
          });
        } else {
          this.entities.push({
            type: 'DEER',
            x,
            y: 180 + Math.random() * 110,
            vx: (fromLeft ? 1 : -1) * (54 + Math.random() * 32) * spd,
            r: 24,
            phase,
            yieldFood: 100,
            label: 'White-tailed Deer (100 lbs)',
            color: '#a0522d',
          });
        }
      } else if (this.biome === 'WOODS') {
        // High Moose & Deer presence in mountain timber (Moose 40%, Deer 40%, Rabbit 20%)
        if (roll < 0.40) {
          this.entities.push({
            type: 'MOOSE',
            x,
            y: 190 + Math.random() * 100,
            vx: (fromLeft ? 1 : -1) * (20 + Math.random() * 14) * spd,
            r: 34,
            phase,
            yieldFood: 300,
            label: 'Bull Moose (300 lbs)',
            color: '#291d14',
          });
        } else if (roll < 0.80) {
          this.entities.push({
            type: 'DEER',
            x,
            y: 180 + Math.random() * 110,
            vx: (fromLeft ? 1 : -1) * (58 + Math.random() * 35) * spd,
            r: 24,
            phase,
            yieldFood: 100,
            label: 'Mule Deer (100 lbs)',
            color: '#a0522d',
          });
        } else {
          this.entities.push({
            type: 'RABBIT',
            x,
            y: 240 + Math.random() * 80,
            vx: (fromLeft ? 1 : -1) * (95 + Math.random() * 45) * spd,
            r: 18,
            phase,
            yieldFood: 15,
            label: 'Forest Rabbit (15 lbs)',
            color: '#a8a29e',
          });
        }
      } else {
        // High Desert & Canyon Crags: Fast fleet deer (45%), Bounding Jackrabbits (55%)
        if (roll < 0.45) {
          this.entities.push({
            type: 'DEER',
            x,
            y: 180 + Math.random() * 110,
            vx: (fromLeft ? 1 : -1) * (65 + Math.random() * 40) * spd,
            r: 24,
            phase,
            yieldFood: 100,
            label: 'Mountain Bighorn (100 lbs)',
            color: '#78350f',
          });
        } else {
          this.entities.push({
            type: 'RABBIT',
            x,
            y: 240 + Math.random() * 80,
            vx: (fromLeft ? 1 : -1) * (110 + Math.random() * 55) * spd,
            r: 18,
            phase,
            yieldFood: 15,
            label: 'Desert Jackrabbit (15 lbs)',
            color: '#d6d3d1',
          });
        }
      }
    } else {
      // 2026 Cartridge Rest-Stop Defence
      const roll = Math.random();
      if (this.biome === 'PLAINS') {
        // Coastal / River Flatlands: Seagulls (45%), Bin Chickens (30%), Sausage Roll (15%), Coffee (10%)
        if (roll < 0.45) {
          this.entities.push({
            type: 'SEAGULL',
            x,
            y,
            vx: (fromLeft ? 1 : -1) * (85 + Math.random() * 55) * spd,
            baseY: y,
            r: 22,
            phase,
            isThreat: true,
            label: 'Silver Gull',
            color: '#e2e8f0',
          });
        } else if (roll < 0.75) {
          this.entities.push({
            type: 'IBIS',
            x,
            y,
            vx: (fromLeft ? 1 : -1) * (60 + Math.random() * 45) * spd,
            baseY: y,
            r: 26,
            phase,
            isThreat: true,
            label: 'Bin Chicken',
            color: '#f8fafc',
          });
        } else if (roll < 0.90) {
          this.entities.push({
            type: 'SNACK',
            x,
            y: 120 + Math.random() * 150,
            vx: (fromLeft ? 1 : -1) * 36 * spd,
            baseY: y,
            r: 24,
            phase,
            yieldFood: 8,
            label: 'Sausage Roll (+8)',
            color: '#d97706',
          });
        } else {
          this.entities.push({
            type: 'COFFEE',
            x,
            y: 110 + Math.random() * 160,
            vx: (fromLeft ? 1 : -1) * 32 * spd,
            baseY: y,
            r: 22,
            phase,
            yieldSanity: 15,
            label: 'Flat White (+15 Sanity)',
            color: '#b45309',
          });
        }
      } else if (this.biome === 'WOODS') {
        // Mountain Highway Rest Stop: Aggressive Bin Chickens raiding picnic bins (55%), Coffee (25%), Snacks (20%)
        if (roll < 0.55) {
          this.entities.push({
            type: 'IBIS',
            x,
            y,
            vx: (fromLeft ? 1 : -1) * (68 + Math.random() * 48) * spd,
            baseY: y,
            r: 26,
            phase,
            isThreat: true,
            label: 'Raid Leader Ibis',
            color: '#f8fafc',
          });
        } else if (roll < 0.80) {
          this.entities.push({
            type: 'COFFEE',
            x,
            y: 110 + Math.random() * 160,
            vx: (fromLeft ? 1 : -1) * 34 * spd,
            baseY: y,
            r: 22,
            phase,
            yieldSanity: 15,
            label: 'Barista Espresso (+15 Sanity)',
            color: '#b45309',
          });
        } else {
          this.entities.push({
            type: 'SNACK',
            x,
            y: 120 + Math.random() * 150,
            vx: (fromLeft ? 1 : -1) * 38 * spd,
            baseY: y,
            r: 24,
            phase,
            yieldFood: 8,
            label: 'Meat Pie (+8 Food)',
            color: '#d97706',
          });
        }
      } else {
        // Border Gauntlet: Fast diving seagulls & crows (65%), Quick takeaway coffee (20%), Snacks (15%)
        if (roll < 0.65) {
          this.entities.push({
            type: 'SEAGULL',
            x,
            y,
            vx: (fromLeft ? 1 : -1) * (95 + Math.random() * 60) * spd,
            baseY: y,
            r: 22,
            phase,
            isThreat: true,
            label: 'Border Gull',
            color: '#e2e8f0',
          });
        } else if (roll < 0.85) {
          this.entities.push({
            type: 'COFFEE',
            x,
            y: 110 + Math.random() * 160,
            vx: (fromLeft ? 1 : -1) * 35 * spd,
            baseY: y,
            r: 22,
            phase,
            yieldSanity: 15,
            label: 'Iced Coffee (+15 Sanity)',
            color: '#b45309',
          });
        } else {
          this.entities.push({
            type: 'SNACK',
            x,
            y: 120 + Math.random() * 150,
            vx: (fromLeft ? 1 : -1) * 40 * spd,
            baseY: y,
            r: 24,
            phase,
            yieldFood: 8,
            label: 'Roadhouse Roll (+8)',
            color: '#d97706',
          });
        }
      }
    }
  }

  /**
   * Real-time pointer motion tracking for the virtual canvas crosshair.
   * @param {number} vx Virtual coordinate X (0-800)
   * @param {number} vy Virtual coordinate Y (0-400)
   */
  handlePointerMove(vx, vy) {
    this.crosshairX = Math.max(10, Math.min(790, vx));
    this.crosshairY = Math.max(10, Math.min(390, vy));
  }

  /**
   * Keyboard keydown dispatcher for directional aiming and trigger fire.
   * @param {string} key Key code / name
   * @returns {{ hit: boolean, target?: Object }|null}
   */
  handleKeyDown(key) {
    if (key === 'ArrowUp' || key === 'w' || key === 'W') this.keyState.up = true;
    else if (key === 'ArrowDown' || key === 's' || key === 'S') this.keyState.down = true;
    else if (key === 'ArrowLeft' || key === 'a' || key === 'A') this.keyState.left = true;
    else if (key === 'ArrowRight' || key === 'd' || key === 'D') this.keyState.right = true;
    else if (key === ' ' || key === 'Enter') {
      return this.handlePointerDown(this.crosshairX, this.crosshairY);
    }
    return null;
  }

  /**
   * Keyboard keyup dispatcher to release directional velocity.
   * @param {string} key Key code / name
   */
  handleKeyUp(key) {
    if (key === 'ArrowUp' || key === 'w' || key === 'W') this.keyState.up = false;
    else if (key === 'ArrowDown' || key === 's' || key === 'S') this.keyState.down = false;
    else if (key === 'ArrowLeft' || key === 'a' || key === 'A') this.keyState.left = false;
    else if (key === 'ArrowRight' || key === 'd' || key === 'D') this.keyState.right = false;
  }

  /**
   * Pointer down click handling with normalized virtual coordinates.
   * Enforces minimum 24px hit radius for accessibility and touch parity.
   *
   * @param {number} vx Virtual X (0 - 800)
   * @param {number} vy Virtual Y (0 - 400)
   * @returns {{ hit: boolean, target?: Object, reason?: string }}
   */
  handlePointerDown(vx, vy) {
    if (!this.isActive) return { hit: false };

    // In 1848: requires ammunition to fire rifle
    if (this.cartridgeId === 'oregon_1848' && this.ammo <= 0) {
      this.floatingTexts.push({
        x: vx,
        y: vy - 15,
        text: 'NO AMMO!',
        color: '#ef4444',
        life: 0.8,
      });
      return { hit: false, reason: 'NO_AMMO' };
    }

    this.crosshairX = vx;
    this.crosshairY = vy;
    this.recoil = 1.0; // Trigger punchy crosshair recoil animation

    // Impact muzzle flash / hit ring
    this.shotFlashes.push({ x: vx, y: vy, life: 0.22, r: 18 });

    const minHitRadius = Math.max(16, 24 + (this.hitRadiusOffset || 0));
    let hitSomething = false;
    let hitTarget = null;

    for (let i = this.entities.length - 1; i >= 0; i--) {
      const ent = this.entities[i];
      const dist = Math.hypot(vx - ent.x, vy - ent.y);
      const effectiveRadius = Math.max(minHitRadius, ent.r + (this.hitRadiusOffset || 0));

      if (dist <= effectiveRadius) {
        hitSomething = true;
        hitTarget = ent;
        this.entities.splice(i, 1);
        break;
      }
    }

    // Startle remaining targets on nearby gunshots/shooing in higher difficulty
    if (this.difficultyMultiplier >= 2.0) {
      for (const other of this.entities) {
        other.vx *= 1.35; // Flee faster
      }
    }

    if (this.cartridgeId === 'oregon_1848') {
      // 1848 always expends 1 bullet per shot
      this.ammo = Math.max(0, this.ammo - 1);
      this.ammoSpent += 1;
    } else {
      // 2026 Rest-Stop Defence:
      // Picking up Food/Coffee does NOT cost coins/chips!
      // Shooing birds spends 1 distraction coin/chip if available.
      if (hitTarget?.isThreat) {
        if (this.ammo > 0) {
          this.ammo -= 1;
          this.ammoSpent += 1;
        }
      } else if (!hitTarget) {
        // Missed in empty air in 2026: don't silently waste coins, show whiff feedback
        this.floatingTexts.push({
          x: vx,
          y: vy - 10,
          text: 'WHIFF!',
          color: '#94a3b8',
          life: 0.6,
        });
      }
    }

    if (hitSomething && hitTarget) {
      if (hitTarget.yieldFood) {
        this.foodHarvested += hitTarget.yieldFood;
        const unit = this.cartridgeId === 'pacific_2026' ? 'Snacks' : 'lbs';
        this.floatingTexts.push({
          x: vx,
          y: vy - 18,
          text: `+${hitTarget.yieldFood} ${unit}`,
          color: '#4ade80',
          life: 1.0,
        });
        // Pastry crumb / food particles
        this._spawnParticles(vx, vy, '#d97706', 7, 60);
      } else if (hitTarget.yieldSanity) {
        this.sanityGained += hitTarget.yieldSanity;
        this.floatingTexts.push({
          x: vx,
          y: vy - 18,
          text: `+${hitTarget.yieldSanity} Sanity ☕`,
          color: '#38bdf8',
          life: 1.0,
        });
        // Coffee droplet particles
        this._spawnParticles(vx, vy, '#60a5fa', 8, 55);
      } else if (hitTarget.isThreat) {
        const soundText =
          hitTarget.type === 'IBIS' ? 'SHOO! (HONK!)' : 'SHOO! (SQUAWK!)';
        this.floatingTexts.push({
          x: vx,
          y: vy - 18,
          text: soundText,
          color: '#facc15',
          life: 0.9,
        });
        // Feather burst particles
        this._spawnParticles(vx, vy, '#f8fafc', 10, 80, true);
      }
    } else if (this.cartridgeId === 'oregon_1848') {
      this.floatingTexts.push({
        x: vx,
        y: vy - 10,
        text: 'MISS!',
        color: '#94a3b8',
        life: 0.6,
      });
    }

    // In 1848, end when ammo is completely exhausted
    if (this.cartridgeId === 'oregon_1848' && this.ammo <= 0) {
      this._endGame();
    }

    return { hit: hitSomething, target: hitTarget };
  }

  _spawnParticles(x, y, color, count, speed, isFeather = false) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = speed * (0.4 + Math.random() * 0.8);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - (isFeather ? 25 : 0),
        r: isFeather ? 4 + Math.random() * 3 : 2 + Math.random() * 2.5,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 8,
        color,
        isFeather,
        life: 0.6 + Math.random() * 0.4,
        maxLife: 1.0,
      });
    }
  }

  /**
   * Updates animations, physics, particles, and countdown timer.
   * @param {number} dt Delta time in seconds
   */
  update(dt) {
    if (!this.isActive) return;

    this.animTime += dt;
    this.recoil = Math.max(0, this.recoil - dt * 5.0);

    // Smooth keyboard crosshair traversal
    let kx = 0;
    let ky = 0;
    if (this.keyState.up) ky -= 1;
    if (this.keyState.down) ky += 1;
    if (this.keyState.left) kx -= 1;
    if (this.keyState.right) kx += 1;

    if (kx !== 0 || ky !== 0) {
      const len = Math.hypot(kx, ky);
      const speed = 480;
      this.crosshairX = Math.max(15, Math.min(785, this.crosshairX + (kx / len) * speed * dt));
      this.crosshairY = Math.max(65, Math.min(385, this.crosshairY + (ky / len) * speed * dt));
    }

    // Update timer
    this.timer = Math.max(0, this.timer - dt);
    if (this.timer <= 0) {
      this._endGame();
      return;
    }

    // Move entities with natural undulating flight / bounding gaits
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const ent = this.entities[i];
      ent.x += ent.vx * dt;

      // Vertical sine undulation for swooping birds / bobbing snacks
      if (ent.type === 'IBIS' || ent.type === 'SEAGULL') {
        ent.y =
          (ent.baseY || 160) +
          Math.sin(this.animTime * 4 + ent.phase) * (ent.type === 'IBIS' ? 14 : 22);
      } else if (ent.type === 'COFFEE' || ent.type === 'SNACK') {
        ent.y =
          (ent.baseY || 180) + Math.sin(this.animTime * 3 + ent.phase) * 10;
      }

      // Recycle entities that move off-screen
      if (ent.x < -70 || ent.x > 870) {
        this.entities.splice(i, 1);
        this._spawnEntity(false);
      }
    }

    // Maintain difficulty-tuned target density (if not barren)
    if (!this.isBarren) {
      while (this.entities.length < this.maxTargetDensity) {
        this._spawnEntity(false);
      }
    }

    // Update target hover lock detection
    this.hoverTarget = null;
    const minHitRadius = Math.max(16, 24 + (this.hitRadiusOffset || 0));
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const ent = this.entities[i];
      const dist = Math.hypot(this.crosshairX - ent.x, this.crosshairY - ent.y);
      if (dist <= Math.max(minHitRadius, ent.r + (this.hitRadiusOffset || 0))) {
        this.hoverTarget = ent;
        break;
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.isFeather ? 35 * dt : 120 * dt; // Gravity
      p.rot += p.vrot * dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    // Update shot flashes
    for (let i = this.shotFlashes.length - 1; i >= 0; i--) {
      const sf = this.shotFlashes[i];
      sf.life -= dt;
      if (sf.life <= 0) this.shotFlashes.splice(i, 1);
    }

    // Update floating text popups
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= dt;
      ft.y -= dt * 28;
      if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }
  }

  _endGame() {
    this.isActive = false;
    const finalFood = Math.min(this.carryCap, this.foodHarvested);
    this.onComplete({
      foodYield: finalFood,
      ammoSpent: this.ammoSpent,
      sanityGained: this.sanityGained,
    });
  }

  /**
   * Renders the complete mini-game grounds, parallax, entities, and HUD.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} width 800
   * @param {number} height 400
   */
  render(ctx, width = 800, height = 400) {
    ctx.save();

    // 1. Scenic Stage Background
    if (this.cartridgeId === 'oregon_1848') {
      this._renderPrairieBackground(ctx, width, height);
    } else {
      this._renderRestStopBackground(ctx, width, height);
    }

    // 2. Render Target Entities
    for (const ent of this.entities) {
      this._renderEntity(ctx, ent);
    }

    // 3. Render Particle Bursts
    this._renderParticles(ctx);

    // 4. Render Shot Impact Flashes & Floating Comic Texts
    this._renderCombatEffects(ctx);

    // 5. High-Tech / Retro Dynamic Reticle
    this._renderReticle(ctx);

    // 6. Integrated In-Canvas HUD
    this._renderHUD(ctx, width, height);

    ctx.restore();
  }

  _renderRestStopBackground(ctx, width, height) {
    // Sky gradient (warm coastal afternoon)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 190);
    skyGrad.addColorStop(0, '#0284c7');
    skyGrad.addColorStop(0.65, '#38bdf8');
    skyGrad.addColorStop(1, '#bae6fd');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, 190);

    // Soft coastal cumulus clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    this._drawCloud(ctx, (120 + this.animTime * 3) % (width + 120) - 60, 45, 55);
    this._drawCloud(ctx, (460 + this.animTime * 2) % (width + 120) - 60, 30, 75);
    this._drawCloud(ctx, (680 + this.animTime * 4) % (width + 120) - 60, 60, 48);

    // Distant Pacific Ocean
    const oceanGrad = ctx.createLinearGradient(0, 140, 0, 210);
    oceanGrad.addColorStop(0, '#0369a1');
    oceanGrad.addColorStop(1, '#0ea5e9');
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, 140, width, 70);

    // Rolling coastal surf foam waves
    ctx.strokeStyle = 'rgba(240, 249, 255, 0.85)';
    ctx.lineWidth = 2.5;
    for (let wave = 0; wave < 3; wave++) {
      ctx.beginPath();
      const waveY = 165 + wave * 14;
      for (let x = 0; x <= width; x += 15) {
        const y = waveY + Math.sin(x * 0.02 + this.animTime * 2.5 + wave) * 3.5;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Distant coastal headland hill on horizon
    ctx.fillStyle = '#166534';
    ctx.beginPath();
    ctx.moveTo(width - 240, 175);
    ctx.quadraticCurveTo(width - 120, 142, width, 170);
    ctx.lineTo(width, 195);
    ctx.lineTo(width - 240, 195);
    ctx.fill();

    // Golden sand dunes beach
    const sandGrad = ctx.createLinearGradient(0, 200, 0, height);
    sandGrad.addColorStop(0, '#fef08a');
    sandGrad.addColorStop(0.3, '#fde047');
    sandGrad.addColorStop(1, '#eab308');
    ctx.fillStyle = sandGrad;
    ctx.fillRect(0, 200, width, height - 200);

    // Coastal spinifex grass clumps along dune
    ctx.fillStyle = '#65a30d';
    for (let x = 30; x < width; x += 65) {
      const gy = 205 + Math.sin(x) * 6;
      ctx.beginPath();
      ctx.moveTo(x, gy);
      ctx.lineTo(x - 5, gy - 12);
      ctx.lineTo(x, gy - 16);
      ctx.lineTo(x + 5, gy - 10);
      ctx.closePath();
      ctx.fill();
    }

    // Lookout timber post & wire safety railing
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 222);
    ctx.lineTo(width, 222);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#94a3b8';
    ctx.beginPath();
    ctx.moveTo(0, 230);
    ctx.lineTo(width, 230);
    ctx.stroke();

    for (let x = 15; x < width; x += 75) {
      ctx.fillStyle = '#78350f';
      ctx.fillRect(x - 4, 215, 8, 30);
    }

    // --- Foreground Rest Area Elements ---

    // 1. Council Wheelie Bin (Green with Yellow lid ajar) on the right
    const binX = 730;
    const binY = 270;
    ctx.fillStyle = '#14532d'; // Forest green bin body
    ctx.beginPath();
    ctx.moveTo(binX - 18, binY);
    ctx.lineTo(binX + 18, binY);
    ctx.lineTo(binX + 14, binY + 54);
    ctx.lineTo(binX - 14, binY + 54);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#052e16';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Yellow Recycle Lid (tilted open enticing the birds)
    ctx.save();
    ctx.translate(binX - 20, binY);
    ctx.rotate(-0.25);
    ctx.fillStyle = '#eab308';
    ctx.fillRect(0, -6, 42, 7);
    ctx.restore();

    // Wheel
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(binX - 14, binY + 52, 6, 0, Math.PI * 2);
    ctx.arc(binX + 14, binY + 52, 6, 0, Math.PI * 2);
    ctx.fill();

    // 2. Weathered Timber Picnic Table on the left
    const tableX = 75;
    const tableY = 285;
    // Tabletop
    ctx.fillStyle = '#78350f';
    ctx.fillRect(tableX - 55, tableY, 110, 10);
    // Bench seats
    ctx.fillStyle = '#5c2b09';
    ctx.fillRect(tableX - 65, tableY + 24, 130, 7);
    // Legs
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(tableX - 45, tableY + 10);
    ctx.lineTo(tableX - 55, tableY + 45);
    ctx.moveTo(tableX + 45, tableY + 10);
    ctx.lineTo(tableX + 55, tableY + 45);
    ctx.stroke();

    // Red checkered picnic cloth overlay
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(tableX - 35, tableY - 1, 65, 5);

    // Scattered Hot Chips (French Fries) on table & sand that birds are eyeing
    ctx.fillStyle = '#fde047';
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 0.8;
    const chips = [
      { x: tableX - 25, y: tableY - 3, r: 0.2 },
      { x: tableX - 12, y: tableY - 2, r: -0.4 },
      { x: tableX + 8, y: tableY - 3, r: 0.1 },
      { x: tableX + 22, y: tableY - 2, r: 0.5 },
      { x: 280, y: 350, r: 0.8 },
      { x: 420, y: 360, r: -0.3 },
    ];
    for (const c of chips) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.r);
      ctx.fillRect(-2, -7, 4, 14);
      ctx.strokeRect(-2, -7, 4, 14);
      ctx.restore();
    }
  }

  _renderPrairieBackground(ctx, width, height) {
    // Sky
    const sky = ctx.createLinearGradient(0, 0, 0, 190);
    sky.addColorStop(0, '#1e3a8a');
    sky.addColorStop(0.5, '#3b82f6');
    sky.addColorStop(1, '#93c5fd');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, 190);

    // Snow-capped Rocky Mountains (Back Layer)
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(0, 190);
    ctx.lineTo(90, 85);
    ctx.lineTo(180, 190);
    ctx.lineTo(290, 70);
    ctx.lineTo(410, 190);
    ctx.lineTo(540, 60);
    ctx.lineTo(670, 190);
    ctx.lineTo(760, 95);
    ctx.lineTo(width, 190);
    ctx.fill();

    // Snow caps
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(90, 85);
    ctx.lineTo(70, 115);
    ctx.lineTo(110, 115);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(290, 70);
    ctx.lineTo(265, 105);
    ctx.lineTo(315, 105);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(540, 60);
    ctx.lineTo(510, 100);
    ctx.lineTo(570, 100);
    ctx.fill();

    // Midground rolling prairie hills
    ctx.fillStyle = '#166534';
    ctx.beginPath();
    ctx.moveTo(0, 190);
    ctx.quadraticCurveTo(200, 160, 420, 190);
    ctx.quadraticCurveTo(640, 155, width, 190);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.fill();

    // Foreground grass meadow
    const grassGrad = ctx.createLinearGradient(0, 210, 0, height);
    grassGrad.addColorStop(0, '#15803d');
    grassGrad.addColorStop(1, '#14532d');
    ctx.fillStyle = grassGrad;
    ctx.fillRect(0, 210, width, height - 210);

    // Tallgrass tufts
    ctx.fillStyle = '#4ade80';
    for (let x = 20; x < width; x += 55) {
      const gy = 230 + Math.sin(x) * 12;
      ctx.beginPath();
      ctx.moveTo(x, gy);
      ctx.lineTo(x - 3, gy - 14);
      ctx.lineTo(x + 2, gy - 18);
      ctx.lineTo(x + 5, gy - 8);
      ctx.fill();
    }
  }

  _drawCloud(ctx, x, y, size) {
    ctx.beginPath();
    ctx.arc(x, y, size * 0.35, 0, Math.PI * 2);
    ctx.arc(x + size * 0.3, y - size * 0.1, size * 0.42, 0, Math.PI * 2);
    ctx.arc(x + size * 0.65, y, size * 0.32, 0, Math.PI * 2);
    ctx.fill();
  }

  _renderEntity(ctx, ent) {
    ctx.save();
    ctx.translate(ent.x, ent.y);

    const facingRight = ent.vx >= 0;
    if (!facingRight) {
      ctx.scale(-1, 1);
    }

    if (ent.type === 'IBIS') {
      this._drawIbis(ctx, ent);
    } else if (ent.type === 'SEAGULL') {
      this._drawSeagull(ctx, ent);
    } else if (ent.type === 'COFFEE') {
      this._drawCoffee(ctx, ent);
    } else if (ent.type === 'SNACK') {
      this._drawSnack(ctx, ent);
    } else if (ent.type === 'BISON') {
      this._drawBison(ctx, ent);
    } else if (ent.type === 'MOOSE') {
      this._drawMoose(ctx, ent);
    } else if (ent.type === 'DEER') {
      this._drawDeer(ctx, ent);
    } else if (ent.type === 'RABBIT') {
      this._drawRabbit(ctx, ent);
    }

    ctx.restore();
  }

  _drawIbis(ctx, ent) {
    const flap = Math.sin(this.animTime * 12 + ent.phase);

    // Body (plump white feathered teardrop)
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(0, 0, 22, 14, 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Body shading
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.ellipse(-2, 4, 18, 9, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Scruffy black tail plumage
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(-18, -2);
    ctx.lineTo(-32, -4);
    ctx.lineTo(-28, 4);
    ctx.lineTo(-34, 10);
    ctx.lineTo(-14, 6);
    ctx.closePath();
    ctx.fill();

    // Bald black wrinkly neck & head
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 5.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.quadraticCurveTo(24, -6, 26, -18);
    ctx.stroke();

    // Head
    ctx.fillStyle = '#090d16';
    ctx.beginPath();
    ctx.arc(26, -18, 5, 0, Math.PI * 2);
    ctx.fill();

    // Long downward-curved Bin Chicken bill
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(28, -17);
    ctx.quadraticCurveTo(40, -14, 46, -2);
    ctx.stroke();

    // Flapping wing
    ctx.save();
    ctx.translate(-2, -4);
    ctx.rotate(flap * 0.45);
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 8, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Black wingtips
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(-14, -4);
    ctx.lineTo(-24, -2);
    ctx.lineTo(-12, 3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Trailing spindly legs
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-4, 10);
    ctx.lineTo(-16, 22);
    ctx.lineTo(-12, 23);
    ctx.stroke();
  }

  _drawSeagull(ctx, ent) {
    const flap = Math.sin(this.animTime * 18 + ent.phase);

    // Streamlined white body
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 10, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Grey wing
    ctx.save();
    ctx.translate(-2, -3);
    ctx.rotate(flap * 0.6);
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 6, -0.25, 0, Math.PI * 2);
    ctx.fill();
    // Black tip
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(-12, -2);
    ctx.lineTo(-20, -1);
    ctx.lineTo(-10, 3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Head
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(16, -6, 6, 0, Math.PI * 2);
    ctx.fill();

    // Coral red sharp beak
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(20, -7);
    ctx.lineTo(29, -5);
    ctx.lineTo(20, -3);
    ctx.closePath();
    ctx.fill();

    // Red eye dot
    ctx.fillStyle = '#eab308';
    ctx.fillRect(17, -8, 2, 2);
  }

  _drawCoffee(ctx, ent) {
    // Floating glowing aura
    const glow = 0.5 + 0.5 * Math.sin(this.animTime * 5 + ent.phase);
    ctx.fillStyle = `rgba(56, 189, 248, ${0.25 + glow * 0.25})`;
    ctx.beginPath();
    ctx.arc(0, 0, 24 + glow * 4, 0, Math.PI * 2);
    ctx.fill();

    // White takeaway paper cup
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(-10, -12);
    ctx.lineTo(10, -12);
    ctx.lineTo(7, 14);
    ctx.lineTo(-7, 14);
    ctx.closePath();
    ctx.fill();

    // Kraft paper heat sleeve
    ctx.fillStyle = '#b45309';
    ctx.fillRect(-8.5, -4, 17, 10);

    // Cup lid
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(-11, -15, 22, 4);

    // Rising hot steam wisps
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const sy = -16 - (this.animTime * 15) % 18;
    ctx.moveTo(-4, sy);
    ctx.quadraticCurveTo(0, sy - 6, -2, sy - 12);
    ctx.moveTo(3, sy);
    ctx.quadraticCurveTo(7, sy - 6, 4, sy - 12);
    ctx.stroke();
  }

  _drawSnack(ctx, ent) {
    // Golden glow aura
    const pulse = 0.5 + 0.5 * Math.sin(this.animTime * 6 + ent.phase);
    ctx.fillStyle = `rgba(250, 204, 21, ${0.25 + pulse * 0.25})`;
    ctx.beginPath();
    ctx.arc(0, 0, 26 + pulse * 4, 0, Math.PI * 2);
    ctx.fill();

    // Bakery paper wrapper
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(-17, -2, 34, 14);

    // Golden flaky sausage roll pastry
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.roundRect(-16, -11, 32, 18, 5);
    ctx.fill();
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Crispy score marks
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-10, -10);
    ctx.lineTo(-6, -4);
    ctx.moveTo(-2, -10);
    ctx.lineTo(2, -4);
    ctx.moveTo(6, -10);
    ctx.lineTo(10, -4);
    ctx.stroke();

    // Glossy red tomato sauce squiggle
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-12, -7);
    ctx.quadraticCurveTo(-4, -11, 0, -7);
    ctx.quadraticCurveTo(6, -3, 12, -7);
    ctx.stroke();
  }

  _drawBison(ctx, ent) {
    // Massive shaggy dark brown body
    ctx.fillStyle = '#38220f';
    ctx.beginPath();
    ctx.ellipse(-6, 2, 28, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // High shoulder hump
    ctx.beginPath();
    ctx.arc(6, -8, 18, 0, Math.PI * 2);
    ctx.fill();

    // Head with beard
    ctx.fillStyle = '#261509';
    ctx.beginPath();
    ctx.arc(22, -4, 12, 0, Math.PI * 2);
    ctx.fill();
    // Beard
    ctx.beginPath();
    ctx.moveTo(18, 4);
    ctx.lineTo(26, 14);
    ctx.lineTo(28, 4);
    ctx.fill();

    // Curved horn
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(22, -12);
    ctx.quadraticCurveTo(24, -20, 18, -20);
    ctx.stroke();

    // Hooves
    ctx.fillStyle = '#1c1007';
    ctx.fillRect(-18, 16, 5, 10);
    ctx.fillRect(-6, 16, 5, 10);
    ctx.fillRect(8, 16, 5, 10);
    ctx.fillRect(16, 16, 5, 10);
  }

  _drawMoose(ctx, ent) {
    // Massive dark brown timber body
    ctx.fillStyle = '#1c120c';
    ctx.beginPath();
    ctx.ellipse(-8, 4, 32, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    // High shoulder hump
    ctx.beginPath();
    ctx.arc(4, -8, 20, 0, Math.PI * 2);
    ctx.fill();

    // Thick snout & head
    ctx.fillStyle = '#26170d';
    ctx.beginPath();
    ctx.arc(24, -2, 14, 0, Math.PI * 2);
    ctx.fill();
    // Dewlap / bell under neck
    ctx.beginPath();
    ctx.moveTo(16, 8);
    ctx.lineTo(20, 20);
    ctx.lineTo(24, 8);
    ctx.fill();

    // Broad palmate antlers
    ctx.fillStyle = '#d4b996';
    ctx.strokeStyle = '#8c6d46';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(18, -14);
    ctx.quadraticCurveTo(8, -32, 2, -30);
    ctx.lineTo(-4, -22);
    ctx.lineTo(8, -18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(22, -14);
    ctx.quadraticCurveTo(28, -35, 34, -32);
    ctx.lineTo(32, -22);
    ctx.lineTo(24, -18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Sturdy long legs
    ctx.fillStyle = '#120a06';
    ctx.fillRect(-22, 18, 6, 16);
    ctx.fillRect(-8, 18, 6, 16);
    ctx.fillRect(6, 18, 6, 16);
    ctx.fillRect(18, 18, 6, 16);
  }

  _drawDeer(ctx, ent) {
    // Slender tan body
    ctx.fillStyle = '#a0522d';
    ctx.beginPath();
    ctx.ellipse(-4, 0, 20, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Long graceful neck & head
    ctx.beginPath();
    ctx.moveTo(6, -4);
    ctx.lineTo(16, -18);
    ctx.lineTo(22, -16);
    ctx.lineTo(12, 4);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(20, -18, 6, 0, Math.PI * 2);
    ctx.fill();

    // Branching antlers
    ctx.strokeStyle = '#fef3c7';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(18, -23);
    ctx.lineTo(16, -34);
    ctx.moveTo(17, -29);
    ctx.lineTo(22, -32);
    ctx.moveTo(18, -34);
    ctx.lineTo(24, -38);
    ctx.stroke();

    // Long thin legs
    ctx.strokeStyle = '#853e1a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-14, 8);
    ctx.lineTo(-14, 24);
    ctx.moveTo(-4, 8);
    ctx.lineTo(-4, 24);
    ctx.moveTo(8, 8);
    ctx.lineTo(8, 24);
    ctx.moveTo(16, 8);
    ctx.lineTo(16, 24);
    ctx.stroke();
  }

  _drawRabbit(ctx, ent) {
    const hop = Math.abs(Math.sin(this.animTime * 10 + ent.phase)) * 6;

    ctx.save();
    ctx.translate(0, -hop);

    // Body
    ctx.fillStyle = '#d6d3d1';
    ctx.beginPath();
    ctx.ellipse(-4, 2, 14, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.arc(10, -2, 7, 0, Math.PI * 2);
    ctx.fill();

    // Tall upright ears with pink interior
    ctx.fillStyle = '#d6d3d1';
    ctx.beginPath();
    ctx.ellipse(8, -14, 3, 9, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f472b6';
    ctx.beginPath();
    ctx.ellipse(8, -14, 1.5, 6, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Fluffy tail
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-18, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  _renderParticles(ctx) {
    for (const p of this.particles) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);

      if (p.isFeather) {
        // Soft curved fluttering feather
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.r * 1.8, p.r * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Glowing spark / crumb particle
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
    ctx.globalAlpha = 1.0;
  }

  _renderCombatEffects(ctx) {
    // Shot impact flashes
    for (const sf of this.shotFlashes) {
      ctx.save();
      const alpha = sf.life / 0.22;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sf.x, sf.y, sf.r * (1.6 - alpha * 0.6), 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath();
      ctx.arc(sf.x, sf.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Floating comic text score popups
    for (const ft of this.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = Math.min(1.0, ft.life * 1.6);
      ctx.font = 'bold 13px sans-serif';

      // Drop shadow for crisp readability
      ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
      ctx.fillText(ft.text, ft.x - 24, ft.y + 2);

      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x - 25, ft.y);
      ctx.restore();
    }
  }

  _renderReticle(ctx) {
    const x = this.crosshairX;
    const y = this.crosshairY;
    const isLocked = Boolean(this.hoverTarget);
    const isThreat = this.hoverTarget?.isThreat;
    const isReward = Boolean(
      this.hoverTarget?.yieldFood || this.hoverTarget?.yieldSanity
    );

    // Reticle color shifts dynamically based on hover lock
    let reticleColor = 'rgba(248, 113, 113, 0.9)'; // Default red
    if (isThreat) reticleColor = 'rgba(239, 68, 68, 0.95)'; // Intense alert red
    else if (isReward) reticleColor = 'rgba(56, 189, 248, 0.95)'; // Cyan lock-on

    const baseRadius = 16 + this.recoil * 12; // Expands on shot recoil

    ctx.save();
    ctx.strokeStyle = reticleColor;
    ctx.lineWidth = 1.8;

    // Outer rotating bracket ticks
    ctx.beginPath();
    ctx.arc(
      x,
      y,
      baseRadius,
      this.animTime * 1.2,
      this.animTime * 1.2 + Math.PI * 0.4
    );
    ctx.arc(
      x,
      y,
      baseRadius,
      this.animTime * 1.2 + Math.PI * 0.5,
      this.animTime * 1.2 + Math.PI * 0.9
    );
    ctx.arc(
      x,
      y,
      baseRadius,
      this.animTime * 1.2 + Math.PI,
      this.animTime * 1.2 + Math.PI * 1.4
    );
    ctx.arc(
      x,
      y,
      baseRadius,
      this.animTime * 1.2 + Math.PI * 1.5,
      this.animTime * 1.2 + Math.PI * 1.9
    );
    ctx.stroke();

    // Four corner crosshair brackets
    const bLen = 6;
    ctx.beginPath();
    // Top
    ctx.moveTo(x, y - baseRadius - 8);
    ctx.lineTo(x, y - baseRadius - 2);
    // Bottom
    ctx.moveTo(x, y + baseRadius + 2);
    ctx.lineTo(x, y + baseRadius + 8);
    // Left
    ctx.moveTo(x - baseRadius - 8, y);
    ctx.lineTo(x - baseRadius - 2, y);
    // Right
    ctx.moveTo(x + baseRadius + 2, y);
    ctx.lineTo(x + baseRadius + 8, y);
    ctx.stroke();

    // Center precision dot
    ctx.fillStyle = reticleColor;
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Lock-on Target Label
    if (isLocked) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect(x + baseRadius + 10, y - 10, 110, 18);
      ctx.strokeStyle = reticleColor;
      ctx.strokeRect(x + baseRadius + 10, y - 10, 110, 18);

      ctx.fillStyle = reticleColor;
      ctx.font = 'bold 9px monospace';
      ctx.fillText(this.hoverTarget.label || 'LOCKED', x + baseRadius + 14, y + 3);
    }

    ctx.restore();
  }

  _renderHUD(ctx, width, height) {
    // Frosted Top Command Bar
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.fillRect(15, 12, width - 30, 44);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(15, 12, width - 30, 44);

    // Title & Time Meter
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 11px sans-serif';
    const modeTitle =
      this.cartridgeId === 'pacific_2026'
        ? 'REST STOP DEFENCE'
        : 'PRAIRIE HUNTING';
    ctx.fillText(`${modeTitle}`, 28, 30);

    // Continue / Pack up prompt
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('[Space / Esc] Pack Up & Continue', 28, 45);

    // Time Progress Gauge
    const timeRatio = Math.max(0, this.timer / this.maxTimer);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(235, 30, 90, 10);
    ctx.fillStyle = timeRatio > 0.25 ? '#38bdf8' : '#ef4444';
    ctx.fillRect(235, 30, 90 * timeRatio, 10);
    ctx.strokeStyle = '#475569';
    ctx.strokeRect(235, 30, 90, 10);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(`${this.timer.toFixed(1)}s`, 332, 38);

    // Ammo / Shots Remaining
    const isLowAmmo = this.ammo <= 4;
    ctx.fillStyle = isLowAmmo ? '#ef4444' : '#facc15';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`AMMO: ${this.ammo} / ${this.initialAmmo}`, 340, 38);

    // Carry Harvest Capacity
    const unit = this.cartridgeId === 'pacific_2026' ? 'Snacks' : 'lbs';
    const isCapped = this.foodHarvested >= this.carryCap;
    ctx.fillStyle = isCapped ? '#f59e0b' : '#4ade80';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(
      `YIELD: ${Math.min(this.carryCap, this.foodHarvested)} / ${this.carryCap} ${unit}${isCapped ? ' (MAX)' : ''}`,
      520,
      38
    );

    // Sanity Gained (2026 only)
    if (this.cartridgeId === 'pacific_2026' && this.sanityGained > 0) {
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`+${this.sanityGained} Sanity`, 690, 38);
    }

    // Barren Alert Overlay Banner
    if (this.isBarren) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.fillRect(150, 160, width - 300, 80);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.strokeRect(150, 160, width - 300, 80);

      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      const barrenTitle =
        this.cartridgeId === 'pacific_2026'
          ? 'REST STOP DESERTED'
          : 'BARREN WILDERNESS';
      ctx.fillText(barrenTitle, width / 2, 190);

      ctx.fillStyle = '#f8fafc';
      ctx.font = '11px monospace';
      const barrenMsg =
        this.cartridgeId === 'pacific_2026'
          ? 'No food trucks, cafe, or birds here. Journey must continue!'
          : 'No animal tracks found in this region. You must move on!';
      ctx.fillText(barrenMsg, width / 2, 212);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px monospace';
      ctx.fillText(`Returning to trail in ${this.timer.toFixed(1)}s [Esc to exit]`, width / 2, 230);
      ctx.restore();
    }
  }
}
