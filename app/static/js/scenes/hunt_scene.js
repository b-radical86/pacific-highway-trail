/**
 * HuntScene — 30-Second Pointer-Normalized Target Mini-Game.
 *
 * Supports:
 * - 1848: Prairie Hunting (Bison 200lb, Deer 100lb, Rabbits 15lb with 100lb carry cap)
 * - 2026: Coastal Rest-Stop Defence (Shooing Bin Chickens/Ibises & Seagulls; catching Flat Whites & Sausage Rolls)
 * - Minimum 22px pointer hit radius (retina/touch safe)
 * - Self-contained canvas HUD (zero Alpine DOM reactivity during 60 FPS play)
 */

export class HuntScene {
  /**
   * @param {Object} options Configuration
   * @param {'oregon_1848'|'pacific_2026'} options.cartridgeId
   * @param {number} [options.ammo=20] Initial ammo/coins
   * @param {Function} [options.onComplete] Callback with { foodYield, ammoSpent, sanityGained }
   */
  constructor(options = {}) {
    this.cartridgeId = options.cartridgeId || 'pacific_2026';
    this.initialAmmo = options.ammo ?? 20;
    this.ammo = this.initialAmmo;
    this.onComplete = options.onComplete || (() => {});

    this.timer = 30.0;
    this.isActive = true;
    this.ammoSpent = 0;
    this.foodHarvested = 0;
    this.sanityGained = 0;

    // Caps per specification
    this.carryCap = this.cartridgeId === 'pacific_2026' ? 20 : 100;

    // Spawn initial entities
    this.entities = [];
    this._spawnInitialEntities();

    // Visual feedback (shots, hit markers, floating text)
    this.shotEffects = [];
    this.crosshairX = 400;
    this.crosshairY = 200;
  }

  _spawnInitialEntities() {
    const count = this.cartridgeId === 'pacific_2026' ? 7 : 5;
    for (let i = 0; i < count; i++) {
      this._spawnEntity(true);
    }
  }

  _spawnEntity(randomX = false) {
    const fromLeft = Math.random() > 0.5;
    const x = randomX ? (100 + Math.random() * 600) : (fromLeft ? -40 : 840);
    const y = 80 + Math.random() * 240;

    if (this.cartridgeId === 'oregon_1848') {
      const roll = Math.random();
      if (roll < 0.3) {
        // Bison (slow, high yield)
        this.entities.push({
          type: 'BISON',
          x, y, vx: (fromLeft ? 1 : -1) * (25 + Math.random() * 25),
          r: 28, yieldFood: 200, label: 'Bison (200 lbs)', color: '#4a2810'
        });
      } else if (roll < 0.7) {
        // Deer (medium)
        this.entities.push({
          type: 'DEER',
          x, y, vx: (fromLeft ? 1 : -1) * (50 + Math.random() * 40),
          r: 22, yieldFood: 100, label: 'Deer (100 lbs)', color: '#a0522d'
        });
      } else {
        // Rabbit (fast)
        this.entities.push({
          type: 'RABBIT',
          x, y, vx: (fromLeft ? 1 : -1) * (95 + Math.random() * 55),
          r: 18, yieldFood: 15, label: 'Rabbit (15 lbs)', color: '#d2b48c'
        });
      }
    } else {
      const roll = Math.random();
      if (roll < 0.4) {
        // Bin Chicken / Ibis (threat trying to steal snacks)
        this.entities.push({
          type: 'IBIS',
          x, y, vx: (fromLeft ? 1 : -1) * (65 + Math.random() * 45),
          r: 24, isThreat: true, label: 'Bin Chicken', color: '#f8fafc'
        });
      } else if (roll < 0.7) {
        // Seagull
        this.entities.push({
          type: 'SEAGULL',
          x, y, vx: (fromLeft ? 1 : -1) * (80 + Math.random() * 50),
          r: 20, isThreat: true, label: 'Seagull', color: '#e2e8f0'
        });
      } else if (roll < 0.88) {
        // Floating Flat White Coffee (+Sanity)
        this.entities.push({
          type: 'COFFEE',
          x, y, vx: (fromLeft ? 1 : -1) * 35,
          r: 22, yieldSanity: 15, label: 'Flat White (+15)', color: '#92400e'
        });
      } else {
        // Sausage Roll / Hot Pie (+Snacks)
        this.entities.push({
          type: 'SNACK',
          x, y, vx: (fromLeft ? 1 : -1) * 40,
          r: 22, yieldFood: 8, label: 'Sausage Roll (+8)', color: '#b45309'
        });
      }
    }
  }

  /**
   * Pointer down event handling with normalized virtual coordinates.
   * Enforces minimum 22px hit radius.
   *
   * @param {number} vx Virtual X (0 - 800)
   * @param {number} vy Virtual Y (0 - 400)
   * @returns {{ hit: boolean, type?: string }}
   */
  handlePointerDown(vx, vy) {
    if (!this.isActive || this.ammo <= 0) return { hit: false };

    this.ammo -= 1;
    this.ammoSpent += 1;
    this.crosshairX = vx;
    this.crosshairY = vy;

    // Shot flash effect
    this.shotEffects.push({ x: vx, y: vy, life: 0.25 });

    const minHitRadius = 22; // Minimum touch/pointer accessibility radius
    let hitSomething = false;

    for (let i = this.entities.length - 1; i >= 0; i--) {
      const ent = this.entities[i];
      const dist = Math.hypot(vx - ent.x, vy - ent.y);
      const effectiveRadius = Math.max(minHitRadius, ent.r);

      if (dist <= effectiveRadius) {
        hitSomething = true;
        this.entities.splice(i, 1);

        if (ent.yieldFood) {
          this.foodHarvested += ent.yieldFood;
          this.shotEffects.push({
            x: vx, y: vy - 15, text: `+${ent.yieldFood} ${this.cartridgeId === 'pacific_2026' ? 'Snacks' : 'lbs'}`,
            life: 0.8, color: '#4ade80'
          });
        } else if (ent.yieldSanity) {
          this.sanityGained += ent.yieldSanity;
          this.shotEffects.push({
            x: vx, y: vy - 15, text: `+${ent.yieldSanity} Sanity`, life: 0.8, color: '#38bdf8'
          });
        } else if (ent.isThreat) {
          this.shotEffects.push({
            x: vx, y: vy - 15, text: 'Shooed!', life: 0.8, color: '#facc15'
          });
        }

        break; // Single shot hits closest topmost entity
      }
    }

    if (this.ammo <= 0) {
      this._endGame();
    }

    return { hit: hitSomething };
  }

  /**
   * Updates entity movement and countdown timer.
   * @param {number} dt Delta time in seconds
   */
  update(dt) {
    if (!this.isActive) return;

    this.timer = Math.max(0, this.timer - dt);
    if (this.timer <= 0) {
      this._endGame();
      return;
    }

    // Move entities
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const ent = this.entities[i];
      ent.x += ent.vx * dt;

      // Remove entities off-screen and spawn new ones
      if (ent.x < -60 || ent.x > 860) {
        this.entities.splice(i, 1);
        this._spawnEntity(false);
      }
    }

    // Maintain minimum entity count
    while (this.entities.length < 6) {
      this._spawnEntity(false);
    }

    // Update shot flash & text effects
    for (let i = this.shotEffects.length - 1; i >= 0; i--) {
      const ef = this.shotEffects[i];
      ef.life -= dt;
      if (ef.text) ef.y -= dt * 25;
      if (ef.life <= 0) this.shotEffects.splice(i, 1);
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
   * Renders the mini-game hunting grounds directly to virtual canvas.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} width 800
   * @param {number} height 400
   */
  render(ctx, width = 800, height = 400) {
    // 1. Scenic Mini-Game Stage Background
    if (this.cartridgeId === 'oregon_1848') {
      // Prairie Meadow with Mountains
      ctx.fillStyle = '#60a5fa';
      ctx.fillRect(0, 0, width, 180);
      ctx.fillStyle = '#166534';
      ctx.fillRect(0, 180, width, 220);
    } else {
      // Coastal Beach Rest Stop & Highway Lookout
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(0, 0, width, 160);
      ctx.fillStyle = '#fef08a'; // Sand
      ctx.fillRect(0, 160, width, 80);
      ctx.fillStyle = '#0284c7'; // Ocean
      ctx.fillRect(0, 240, width, 160);
    }

    // 2. Render Target Entities
    for (const ent of this.entities) {
      ctx.save();
      ctx.fillStyle = ent.color;

      if (ent.type === 'BISON') {
        ctx.beginPath();
        ctx.ellipse(ent.x, ent.y, ent.r + 6, ent.r - 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#291b12';
        ctx.fillRect(ent.vx > 0 ? ent.x + 14 : ent.x - 22, ent.y - 12, 10, 12);
      } else if (ent.type === 'DEER') {
        ctx.beginPath();
        ctx.ellipse(ent.x, ent.y, ent.r, ent.r - 6, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (ent.type === 'RABBIT') {
        ctx.beginPath();
        ctx.ellipse(ent.x, ent.y, ent.r - 4, ent.r - 6, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (ent.type === 'IBIS' || ent.type === 'SEAGULL') {
        // Bird body + curved beak
        ctx.beginPath();
        ctx.ellipse(ent.x, ent.y, ent.r, ent.r - 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ent.vx > 0 ? ent.x + 16 : ent.x - 16, ent.y);
        ctx.lineTo(ent.vx > 0 ? ent.x + 28 : ent.x - 28, ent.y + 6);
        ctx.stroke();
      } else if (ent.type === 'COFFEE') {
        // Cup shape
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(ent.x - 12, ent.y - 14, 24, 28);
        ctx.fillStyle = '#92400e';
        ctx.fillRect(ent.x - 10, ent.y - 12, 20, 8);
      } else if (ent.type === 'SNACK') {
        // Sausage roll pastry
        ctx.fillStyle = '#d97706';
        ctx.beginPath();
        ctx.roundRect(ent.x - 16, ent.y - 10, 32, 20, 6);
        ctx.fill();
      }

      ctx.restore();
    }

    // 3. Render Shot Flashes and Floating Text
    for (const ef of this.shotEffects) {
      if (ef.text) {
        ctx.fillStyle = ef.color || '#f8fafc';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText(ef.text, ef.x - 15, ef.y);
      } else {
        // Shot impact flash
        ctx.fillStyle = 'rgba(254, 240, 138, 0.75)';
        ctx.beginPath();
        ctx.arc(ef.x, ef.y, 14, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 4. Render Crosshair
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(this.crosshairX, this.crosshairY, 12, 0, Math.PI * 2);
    ctx.moveTo(this.crosshairX - 16, this.crosshairY);
    ctx.lineTo(this.crosshairX + 16, this.crosshairY);
    ctx.moveTo(this.crosshairX, this.crosshairY - 16);
    ctx.lineTo(this.crosshairX, this.crosshairY + 16);
    ctx.stroke();

    // 5. In-Canvas HUD (Timer, Ammo, Harvest Yield)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fillRect(15, 15, 770, 42);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(15, 15, 770, 42);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(
      this.cartridgeId === 'pacific_2026'
        ? `REST STOP DEFENCE — Time: ${this.timer.toFixed(1)}s`
        : `PRAIRIE HUNTING GROUNDS — Time: ${this.timer.toFixed(1)}s`,
      30, 34
    );

    ctx.fillStyle = this.ammo > 5 ? '#facc15' : '#f87171';
    ctx.fillText(`Ammo: ${this.ammo}`, 420, 34);

    ctx.fillStyle = '#4ade80';
    const unit = this.cartridgeId === 'pacific_2026' ? 'pkts' : 'lbs';
    const isCapped = this.foodHarvested >= this.carryCap;
    ctx.fillText(
      `Yield: ${Math.min(this.carryCap, this.foodHarvested)} / ${this.carryCap} ${unit}${isCapped ? ' (CAPPED)' : ''}`,
      540, 34
    );
  }
}
