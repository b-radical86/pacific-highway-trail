/**
 * RiverScene — Interactive River Crossing, M1 Bottleneck & Columbia Rafting Scene.
 *
 * Implements:
 * - Cartridge-adaptive visual staging (1848 River Crossing vs 2026 M1 Bottleneck Gridlock)
 * - Live Depth (ft) & Congestion (%) gauges driven by obstacle Phi and Psi metrics
 * - Animated crossing physics with splash particles or traffic merge animations
 * - The Dalles Columbia River Raft steering mini-game with rock hazard collision detection
 */

export class RiverScene {
  /**
   * @param {Object} options Configuration options
   * @param {'oregon_1848'|'pacific_2026'} options.cartridgeId
   * @param {Object} options.obstacle { type, phi, psi, costCents, label }
   * @param {Function} [options.onComplete] Callback when crossing sequence concludes
   */
  constructor(options = {}) {
    this.cartridgeId = options.cartridgeId || 'pacific_2026';
    this.obstacle = options.obstacle || { phi: 0.5, psi: 0.5, costCents: 500, label: 'River Crossing' };
    this.onComplete = options.onComplete || (() => {});

    // Scene State: 'IDLE' | 'CROSSING' | 'RAFTING' | 'RESOLVED'
    this.state = options.isRaftingMiniGame ? 'RAFTING' : 'IDLE';
    this.animTime = 0;
    this.crossingProgress = 0; // 0 to 1
    this.crossingSuccess = true;
    this.resultMessage = '';

    // Rafting Mini-Game State (The Dalles)
    this.raftX = 380;
    this.raftY = 280;
    this.raftSpeed = 160;
    this.raftHealth = 100;
    this.raftTimer = 15.0; // 15-second canyon descent
    this.rocks = this._spawnRocks(12);

    // Splash / exhaust particle systems
    this.particles = [];
  }

  _spawnRocks(count) {
    const rocks = [];
    for (let i = 0; i < count; i++) {
      rocks.push({
        x: 100 + ((i * 137) % 600),
        y: -50 - (i * 90),
        r: 16 + (i % 3) * 6,
        passed: false,
      });
    }
    return rocks;
  }

  /**
   * Begins the crossing animation sequence.
   * @param {boolean} success Whether the crossing succeeded
   * @param {string} message Outcome summary text
   */
  startCrossingAnimation(success, message) {
    this.state = 'CROSSING';
    this.crossingProgress = 0;
    this.crossingSuccess = success;
    this.resultMessage = message;
    this.particles = [];
  }

  /**
   * Handles pointer click or touch navigation.
   * @param {number} vx Virtual X (0 - 800)
   * @param {number} vy Virtual Y (0 - 400)
   */
  handlePointerDown(vx, vy) {
    if (this.state === 'RAFTING') {
      // Steer raft toward clicked horizontal location
      this.raftX = Math.max(80, Math.min(720, vx));
    }
  }

  /**
   * Handles keyboard navigation in raft mini-game.
   * @param {string} key Key identifier (ArrowLeft, ArrowRight, a, d)
   */
  handleKeyDown(key) {
    if (this.state === 'RAFTING') {
      if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
        this.raftX = Math.max(80, this.raftX - 35);
      } else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
        this.raftX = Math.min(720, this.raftX + 35);
      }
    }
  }

  /**
   * Updates river waves, crossing progress, and rock obstacle collisions.
   * @param {number} dt Delta time in seconds
   */
  update(dt) {
    this.animTime += dt;

    if (this.state === 'CROSSING') {
      this.crossingProgress += dt * 0.45; // ~2.2s crossing duration

      // Spawn water splash or road dust particles
      if (this.particles.length < 25) {
        this.particles.push({
          x: 200 + this.crossingProgress * 400 + (Math.random() - 0.5) * 20,
          y: 250 + (Math.random() - 0.5) * 15,
          vx: (Math.random() - 0.5) * 40,
          vy: -30 - Math.random() * 40,
          life: 0.6,
        });
      }

      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.life <= 0) this.particles.splice(i, 1);
      }

      if (this.crossingProgress >= 1.0) {
        this.state = 'RESOLVED';
        setTimeout(() => this.onComplete(this.crossingSuccess), 1200);
      }
    } else if (this.state === 'RAFTING') {
      this.raftTimer = Math.max(0, this.raftTimer - dt);

      // Advance rocks downward past the raft
      const rockSpeed = 190 * (1.0 + (this.obstacle.psi || 0.5) * 0.5);
      for (const rock of this.rocks) {
        rock.y += rockSpeed * dt;

        // Collision check with circular raft hitbox
        const dx = rock.x - this.raftX;
        const dy = rock.y - this.raftY;
        const dist = Math.hypot(dx, dy);
        if (dist < rock.r + 20 && !rock.hit) {
          rock.hit = true;
          this.raftHealth = Math.max(0, this.raftHealth - 30);
        }
      }

      if (this.raftTimer <= 0) {
        this.state = 'RESOLVED';
        const success = this.raftHealth > 0;
        this.resultMessage = success ? 'Columbia River Gorge navigated safely!' : 'Raft broke up on the boulders!';
        setTimeout(() => this.onComplete(success), 1200);
      }
    }
  }

  /**
   * Renders the stage, gauges, and crossing animations onto virtual canvas.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} width 800
   * @param {number} height 400
   */
  render(ctx, width = 800, height = 400) {
    ctx.clearRect(0, 0, width, height);

    if (this.state === 'RAFTING') {
      this._renderRaftingMiniGame(ctx, width, height);
      return;
    }

    if (this.cartridgeId === 'oregon_1848') {
      this._render1848River(ctx, width, height);
    } else {
      this._render2026Bottleneck(ctx, width, height);
    }

    this._renderGaugeOverlay(ctx);
  }

  _render1848River(ctx, width, height) {
    // 1. Sky & Riverbank cliffs
    ctx.fillStyle = '#85929e';
    ctx.fillRect(0, 0, width, 140);
    ctx.fillStyle = '#5d6d7e';
    ctx.fillRect(0, 140, width, 50);

    // 2. Flowing River Water (Multi-Layer Wave Sine Curves)
    ctx.fillStyle = '#2980b9';
    ctx.fillRect(0, 190, width, 210);

    ctx.strokeStyle = 'rgba(212, 239, 252, 0.65)';
    ctx.lineWidth = 2;
    for (let row = 0; row < 5; row++) {
      const yBase = 220 + row * 38;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 30) {
        const wave = Math.sin((x / 40) + this.animTime * 4 + row) * 6;
        if (x === 0) ctx.moveTo(x, yBase + wave);
        else ctx.lineTo(x, yBase + wave);
      }
      ctx.stroke();
    }

    // 3. Wagon crossing or resting on riverbank
    const bob = Math.sin(this.animTime * 6) * 4;
    let wagonX = 140;
    let wagonY = 230 + bob;

    if (this.state === 'CROSSING') {
      wagonX = 140 + this.crossingProgress * 480;
      wagonY = 240 + bob;
    }

    // Render Prairie Schooner in river
    ctx.fillStyle = '#f5eef8';
    ctx.beginPath();
    ctx.ellipse(wagonX + 35, wagonY - 18, 35, 20, 0, Math.PI, 0);
    ctx.fill();

    ctx.fillStyle = '#784212';
    ctx.fillRect(wagonX, wagonY - 2, 70, 14);

    // Water splash particles
    ctx.fillStyle = '#ebf5fb';
    for (const p of this.particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _render2026Bottleneck(ctx, width, height) {
    // 1. Overpass Highway Architecture & Twilight Sky
    ctx.fillStyle = '#1c2833';
    ctx.fillRect(0, 0, width, 150);

    // Concrete Overpass & Guardrails
    ctx.fillStyle = '#566573';
    ctx.fillRect(0, 150, width, 30);
    ctx.fillStyle = '#7f8c8d';
    ctx.fillRect(0, 180, width, 15);

    // 2. M1 Highway Lanes with stopped congestion traffic
    ctx.fillStyle = '#212f3d';
    ctx.fillRect(0, 195, width, 205);

    // Lane divider lines
    ctx.fillStyle = '#fdfefe';
    for (let lx = 0; lx < width; lx += 60) {
      ctx.fillRect(lx, 260, 32, 4);
      ctx.fillRect(lx, 330, 32, 4);
    }

    // Stopped Gary's Jayco Caravan in Lane 1
    ctx.fillStyle = '#eaecee';
    ctx.fillRect(360, 230, 95, 26);
    ctx.fillStyle = '#d35400';
    ctx.fillRect(360, 240, 95, 4);
    ctx.fillStyle = '#e74c3c'; // Tail lights
    ctx.fillRect(360, 248, 4, 6);
    ctx.fillRect(451, 248, 4, 6);

    // SUV Attempting Merge / Slingshot
    let suvX = 160;
    let suvY = 295;
    if (this.state === 'CROSSING') {
      suvX = 160 + this.crossingProgress * 440;
    }

    // Render Player's 7-Seater SUV
    ctx.fillStyle = '#34495e';
    ctx.beginPath();
    ctx.roundRect(suvX, suvY, 80, 24, 4);
    ctx.fill();
    ctx.fillStyle = '#f1c40f'; // Blinking hazard indicator
    if (Math.sin(this.animTime * 12) > 0) {
      ctx.fillRect(suvX + 76, suvY + 2, 4, 5);
      ctx.fillRect(suvX + 76, suvY + 17, 4, 5);
    }
  }

  _renderGaugeOverlay(ctx) {
    const phi = this.obstacle.phi || 0.5;
    const psi = this.obstacle.psi || 0.5;

    // HUD Status Pill Top Left
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fillRect(18, 16, 320, 64);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(18, 16, 320, 64);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(this.obstacle.label || 'Obstacle Checkpoint', 30, 34);

    if (this.cartridgeId === 'oregon_1848') {
      const depthFt = (1.5 + phi * 7.5).toFixed(1);
      const velocityKnots = (psi * 9.5).toFixed(1);
      ctx.font = '10px monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`Water Depth: ${depthFt} ft (Gauge)`, 30, 52);
      ctx.fillStyle = '#facc15';
      ctx.fillText(`Current Velocity: ${velocityKnots} knots`, 30, 68);
    } else {
      const congestionPct = Math.round(phi * 100);
      const volatility = Math.round(psi * 10);
      ctx.font = '10px monospace';
      ctx.fillStyle = congestionPct > 65 ? '#f87171' : '#facc15';
      ctx.fillText(`Congestion Index: ${congestionPct}% (Gridlock)`, 30, 52);
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`Road Volatility: ${volatility}/10 Severity`, 30, 68);
    }

    // Outcome toast on completion
    if (this.state === 'RESOLVED' && this.resultMessage) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
      ctx.fillRect(200, 160, 400, 70);
      ctx.strokeStyle = this.crossingSuccess ? '#4ade80' : '#f87171';
      ctx.lineWidth = 2;
      ctx.strokeRect(200, 160, 400, 70);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(this.resultMessage, 400, 200);
      ctx.textAlign = 'left';
    }
  }

  _renderRaftingMiniGame(ctx, width, height) {
    // Canyon Rapids Background
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(0, 0, width, height);

    // Canyon Walls Left & Right
    ctx.fillStyle = '#78350f';
    ctx.fillRect(0, 0, 70, height);
    ctx.fillRect(width - 70, 0, 70, height);

    // Rushing Water Texture Lines
    ctx.strokeStyle = 'rgba(147, 197, 253, 0.4)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 18; i++) {
      const lineY = ((this.animTime * 320 + i * 45) % height);
      ctx.beginPath();
      ctx.moveTo(85 + (i * 37) % 620, lineY);
      ctx.lineTo(85 + (i * 37) % 620, lineY + 28);
      ctx.stroke();
    }

    // Canyon Rocks
    for (const rock of this.rocks) {
      if (rock.y > -30 && rock.y < height + 30) {
        ctx.fillStyle = rock.hit ? '#b91c1c' : '#475569';
        ctx.beginPath();
        ctx.arc(rock.x, rock.y, rock.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Player Log Raft
    ctx.fillStyle = '#92400e';
    ctx.fillRect(this.raftX - 22, this.raftY - 14, 44, 28);
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 2;
    for (let logX = this.raftX - 18; logX <= this.raftX + 18; logX += 9) {
      ctx.beginPath();
      ctx.moveTo(logX, this.raftY - 14);
      ctx.lineTo(logX, this.raftY + 14);
      ctx.stroke();
    }

    // Raft HUD
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(85, 15, 630, 40);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(85, 15, 630, 40);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(`COLUMBIA RIVER RAPIDS — Timer: ${this.raftTimer.toFixed(1)}s`, 100, 32);
    ctx.fillStyle = this.raftHealth > 40 ? '#4ade80' : '#f87171';
    ctx.fillText(`Raft Integrity: ${this.raftHealth}%`, 480, 32);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px monospace';
    ctx.fillText('Steer: [Left / Right Arrow] or Click River Stage', 100, 47);
  }
}
