/**
 * CanvasEngine — 800x400 Virtual-Resolution Procedural 2D Vector Controller.
 *
 * Implements:
 * - High-DPI backing store scaling (DPR capped at 2)
 * - Clamped delta-time loop (dt <= 0.05s)
 * - Cached sky gradients (Dawn, Midday, Sunset, Night) & celestial arc
 * - Phased travel animation hook (sweeping Dawn -> Night and pausing at Midday on interrupts)
 * - Weather particle overlays & roadside memorial marker rendering
 * - Exact pointer-to-virtual coordinate normalization (800x400)
 */

import { drawBackground1848, drawMemorial1848, drawSchooner } from './renderers_1848.js';
import { drawBackground2026, drawMemorial2026, drawSUV } from './renderers_2026.js';

export const VIRTUAL_WIDTH = 800;
export const VIRTUAL_HEIGHT = 400;

export class CanvasEngine {
  /**
   * @param {HTMLCanvasElement|null} canvas DOM canvas element (or mock in headless tests)
   * @param {Object} [options={}]
   */
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;
    this.cartridgeId = options.cartridgeId || 'pacific_2026';

    // Timing & loop state
    this.running = false;
    this.lastTime = 0;
    this.animTime = 0;
    this.scrollX = 0;
    this.scrollSpeed = 65; // px/sec when moving
    this.isMoving = options.isMoving ?? true;
    this.fps = 60;
    this._frameCount = 0;
    this._fpsTimer = 0;

    // Sky & environment state
    this.timeOfDay = options.timeOfDay ?? 0.35; // 0.0=Dawn, 0.45=Midday, 0.78=Sunset, 0.92=Night
    this.weather = options.weather || 'CLEAR'; // 'CLEAR' | 'RAIN' | 'STORM' | 'DUST'
    this.vfxFlags = {
      vfxStinkLines: false,
      vfxSongLoop: false,
      ...(options.vfxFlags || {}),
    };

    // Phased travel transition state
    this.travelTween = null;

    // Roadside memorials [{ name, distance, epitaph, status }]
    this.memorials = Array.isArray(options.memorials) ? options.memorials : [];
    this.currentDistance = 0;

    // Pluggable scene override for Phase 4 mini-games (SCENE_RIVER, SCENE_HUNT)
    this.activeScene = null;

    // Cached gradients and stars
    this._skyGradients = {};
    this._stars = this._generateStars(40);
    this._particles = this._generateParticles(35);

    if (this.canvas && this.ctx) {
      this.configureBackingStore();
      this._buildSkyGradientCache();
    }
  }

  /**
   * Configures DPI-aware backing store (DPR capped at 2).
   */
  configureBackingStore() {
    if (!this.canvas || !this.ctx) return;
    const rawDpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    this.dpr = Math.min(2, Math.max(1, rawDpr));
    this.canvas.width = VIRTUAL_WIDTH * this.dpr;
    this.canvas.height = VIRTUAL_HEIGHT * this.dpr;
    if (typeof this.ctx.setTransform === 'function') {
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }
  }

  /**
   * Pre-builds and caches the 4 sky gradients so zero allocations occur per frame.
   */
  _buildSkyGradientCache() {
    if (!this.ctx || typeof this.ctx.createLinearGradient !== 'function') return;
    const horizonY = 240;

    const makeGrad = (stops) => {
      const g = this.ctx.createLinearGradient(0, 0, 0, horizonY);
      for (const [offset, color] of stops) {
        g.addColorStop(offset, color);
      }
      return g;
    };

    this._skyGradients = {
      DAWN: makeGrad([[0, '#ff7e5f'], [1, '#feb47b']]),
      MIDDAY: makeGrad([[0, '#1a5276'], [1, '#5dade2']]),
      SUNSET: makeGrad([[0, '#78281f'], [0.55, '#e67e22'], [1, '#f39c12']]),
      NIGHT: makeGrad([[0, '#0b132b'], [1, '#1c2541']]),
    };
  }

  _generateStars(count) {
    const stars = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: (i * 97) % VIRTUAL_WIDTH,
        y: (i * 53) % 155,
        phase: (i * 1.3) % (Math.PI * 2),
      });
    }
    return stars;
  }

  _generateParticles(count) {
    const parts = [];
    for (let i = 0; i < count; i++) {
      parts.push({
        x: (i * 73) % VIRTUAL_WIDTH,
        y: (i * 41) % VIRTUAL_HEIGHT,
        speed: 140 + (i % 5) * 30,
      });
    }
    return parts;
  }

  /**
   * Maps timeOfDay float [0, 1] to bucket key ('DAWN'|'MIDDAY'|'SUNSET'|'NIGHT').
   * @param {number} [tod]
   * @returns {'DAWN'|'MIDDAY'|'SUNSET'|'NIGHT'}
   */
  getSkyBucket(tod = this.timeOfDay) {
    if (tod < 0.25) return 'DAWN';
    if (tod < 0.70) return 'MIDDAY';
    if (tod < 0.85) return 'SUNSET';
    return 'NIGHT';
  }

  /**
   * Starts a phased travel sky animation from Dawn toward targetDayPhase.
   * Pauses at MIDDAY when a hazard or waypoint interrupt triggers.
   *
   * @param {'MIDDAY'|'SUNSET'|'NIGHT'} targetDayPhase
   * @param {number} [durationMs=1600]
   * @param {Function} [onComplete]
   */
  startPhasedTravel(targetDayPhase = 'NIGHT', durationMs = 1600, onComplete = null) {
    const endMap = {
      DAWN: 0.18,
      MIDDAY: 0.48,
      SUNSET: 0.78,
      NIGHT: 0.92,
    };
    const startTod = 0.08;
    const endTod = endMap[targetDayPhase] ?? 0.92;
    this.timeOfDay = startTod;
    this.isMoving = true;

    this.travelTween = {
      startTod,
      endTod,
      elapsedMs: 0,
      durationMs: Math.max(100, durationMs),
      onComplete,
    };
  }

  /**
   * Immediately completes any active phased travel tween (e.g. user taps Space to skip).
   */
  skipTravelAnimation() {
    if (!this.travelTween) return;
    const tween = this.travelTween;
    this.timeOfDay = tween.endTod;
    this.travelTween = null;
    if (typeof tween.onComplete === 'function') {
      tween.onComplete();
    }
  }

  /**
   * Converts DOM clientX/clientY pointer coordinates into virtual 800x400 coordinates,
   * accounting for CSS object-contain letterboxing.
   *
   * @param {number} clientX
   * @param {number} clientY
   * @returns {{ x: number, y: number, inBounds: boolean }}
   */
  toVirtualCoords(clientX, clientY) {
    if (!this.canvas || typeof this.canvas.getBoundingClientRect !== 'function') {
      return { x: clientX, y: clientY, inBounds: true };
    }
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return { x: 0, y: 0, inBounds: false };
    }

    const targetAspect = VIRTUAL_WIDTH / VIRTUAL_HEIGHT;
    const boxAspect = rect.width / rect.height;

    let drawWidth = rect.width;
    let drawHeight = rect.height;
    let offsetX = 0;
    let offsetY = 0;

    if (boxAspect > targetAspect) {
      // Pillarbox (horizontal bars)
      drawWidth = rect.height * targetAspect;
      offsetX = (rect.width - drawWidth) / 2;
    } else if (boxAspect < targetAspect) {
      // Letterbox (vertical bars)
      drawHeight = rect.width / targetAspect;
      offsetY = (rect.height - drawHeight) / 2;
    }

    const relX = clientX - rect.left - offsetX;
    const relY = clientY - rect.top - offsetY;
    const vx = (relX / drawWidth) * VIRTUAL_WIDTH;
    const vy = (relY / drawHeight) * VIRTUAL_HEIGHT;
    const inBounds = vx >= 0 && vx <= VIRTUAL_WIDTH && vy >= 0 && vy <= VIRTUAL_HEIGHT;

    return {
      x: Math.max(0, Math.min(VIRTUAL_WIDTH, vx)),
      y: Math.max(0, Math.min(VIRTUAL_HEIGHT, vy)),
      inBounds,
    };
  }

  /**
   * Advances simulation state by raw delta-time (clamped to <= 0.05s).
   * @param {number} rawDtSeconds
   * @returns {number} Clamped dt in seconds
   */
  step(rawDtSeconds) {
    const dt = Math.min(0.05, Math.max(0, rawDtSeconds));
    this.animTime += dt;

    if (this.isMoving) {
      this.scrollX += this.scrollSpeed * dt;
    }

    // Update phased travel tween if active
    if (this.travelTween) {
      this.travelTween.elapsedMs += dt * 1000;
      const t = Math.min(1, this.travelTween.elapsedMs / this.travelTween.durationMs);
      this.timeOfDay = this.travelTween.startTod + (this.travelTween.endTod - this.travelTween.startTod) * t;
      if (t >= 1) {
        const doneCb = this.travelTween.onComplete;
        this.travelTween = null;
        if (typeof doneCb === 'function') doneCb();
      }
    }

    // Step active custom scene if mounted
    if (this.activeScene && typeof this.activeScene.update === 'function') {
      this.activeScene.update(dt);
    }

    return dt;
  }

  /**
   * Renders a single frame onto the virtual 800x400 canvas.
   */
  renderFrame() {
    if (!this.ctx) return;
    const ctx = this.ctx;

    // Delegate to full-screen mini-game scene if active
    if (this.activeScene && typeof this.activeScene.render === 'function') {
      this.activeScene.render(ctx, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
      return;
    }

    ctx.clearRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

    // 1. Dynamic Sky Gradient & Celestial Body
    const bucket = this.getSkyBucket(this.timeOfDay);
    ctx.fillStyle = this._skyGradients[bucket] || '#1a5276';
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, 240);

    // Night Stars
    if (bucket === 'NIGHT') {
      ctx.fillStyle = '#ffffff';
      for (const s of this._stars) {
        const alpha = 0.35 + 0.65 * Math.abs(Math.sin(this.animTime * 2 + s.phase));
        ctx.globalAlpha = alpha;
        ctx.fillRect(s.x, s.y, 2, 2);
      }
      ctx.globalAlpha = 1.0;
    }

    // Sun / Moon Arc
    const celestialX = 90 + this.timeOfDay * 620;
    const celestialY = 95 - Math.sin(this.timeOfDay * Math.PI) * 58;
    ctx.fillStyle = bucket === 'NIGHT' ? '#f4f6f7' : '#f9e79f';
    ctx.beginPath();
    ctx.arc(celestialX, celestialY, 14, 0, Math.PI * 2);
    ctx.fill();

    // 2. Cartridge-Specific Parallax Terrain
    if (this.cartridgeId === 'oregon_1848') {
      drawBackground1848(ctx, this.scrollX, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
    } else {
      drawBackground2026(ctx, this.scrollX, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
    }

    // 3. Roadside Memorials / Past Run Tombstones
    this._renderMemorials(ctx);

    // 4. Hero Vehicle
    if (this.cartridgeId === 'oregon_1848') {
      drawSchooner(ctx, 250, 240, this.animTime, this.isMoving);
    } else {
      drawSUV(ctx, 280, 242, this.animTime, this.isMoving, {
        ...this.vfxFlags,
        timeOfDay: this.timeOfDay,
        isNight: bucket === 'NIGHT',
      });
    }

    // 5. Weather Particle Overlay
    this._renderWeatherOverlay(ctx);
  }

  _renderMemorials(ctx) {
    if (!this.memorials || this.memorials.length === 0) return;
    for (const mem of this.memorials) {
      const distDiff = (mem.distance || 0) - this.currentDistance;
      if (Math.abs(distDiff) <= 25) {
        const screenX = 340 + distDiff * 18;
        if (this.cartridgeId === 'oregon_1848') {
          drawMemorial1848(ctx, screenX, 248, mem);
        } else {
          drawMemorial2026(ctx, screenX, 246, mem);
        }
      }
    }
  }

  _renderWeatherOverlay(ctx) {
    if (this.weather === 'CLEAR') return;
    ctx.save();
    if (this.weather === 'RAIN' || this.weather === 'STORM') {
      ctx.strokeStyle = 'rgba(174, 214, 241, 0.55)';
      ctx.lineWidth = 1.5;
      for (const p of this._particles) {
        const py = (p.y + this.animTime * p.speed) % VIRTUAL_HEIGHT;
        const px = (p.x - this.animTime * 45 + VIRTUAL_WIDTH) % VIRTUAL_WIDTH;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px - 4, py + 12);
        ctx.stroke();
      }
    } else if (this.weather === 'DUST') {
      ctx.fillStyle = 'rgba(211, 84, 0, 0.14)';
      ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
    }
    ctx.restore();
  }

  /**
   * Starts the 60 FPS requestAnimationFrame loop.
   */
  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    this._fpsTimer = this.lastTime;

    const loop = (now) => {
      if (!this.running) return;
      const rawDt = (now - this.lastTime) / 1000;
      this.lastTime = now;

      this._frameCount++;
      if (now - this._fpsTimer >= 1000) {
        this.fps = this._frameCount;
        this._frameCount = 0;
        this._fpsTimer = now;
      }

      this.step(rawDt);
      this.renderFrame();

      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(loop);
      }
    };

    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(loop);
    }
  }

  stop() {
    this.running = false;
  }
}
