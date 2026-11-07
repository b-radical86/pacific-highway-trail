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
    this.approachingLandmark = options.approachingLandmark || null;
    this.isAutoMarching = options.isAutoMarching ?? false;

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
    this.isResting = false;

    this.travelTween = {
      startTod,
      endTod,
      elapsedMs: 0,
      durationMs: Math.max(100, durationMs),
      onComplete,
    };
  }

  /**
   * Starts a camp & rest visual animation simulating a full 24-hour cycle.
   * Sky progresses through Dusk -> Night (Campfire / Rest stop lighting) -> Dawn.
   *
   * @param {number} [durationMs=1400]
   * @param {Function} [onComplete]
   */
  startRestAnimation(durationMs = 1400, onComplete = null) {
    this.isMoving = false;
    this.isResting = true;
    const startTod = 0.35; // Start in afternoon
    const endTod = 1.15; // Sweep past night (0.95) into next dawn (1.15 -> wrapped to 0.15)

    this.travelTween = {
      startTod,
      endTod,
      elapsedMs: 0,
      durationMs: Math.max(100, durationMs),
      isRest: true,
      onComplete: () => {
        this.timeOfDay = 0.15; // Wake at morning
        this.isResting = false;
        if (typeof onComplete === 'function') onComplete();
      },
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
      const rawTod = this.travelTween.startTod + (this.travelTween.endTod - this.travelTween.startTod) * t;
      this.timeOfDay = rawTod > 1.0 ? rawTod - 1.0 : rawTod;
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

    // 2.5 Approaching Landmark Horizon Silhouette
    this._renderApproachingLandmark(ctx);

    // 3. Roadside Memorials / Past Run Tombstones
    this._renderMemorials(ctx);

    // 4. Hero Vehicle & Campsite Overlay
    if (this.cartridgeId === 'oregon_1848') {
      drawSchooner(ctx, 250, 240, this.animTime, this.isMoving);
      if (this.isResting) {
        this._renderCampsite1848(ctx, 210, 254);
      }
    } else {
      drawSUV(ctx, 280, 242, this.animTime, this.isMoving, {
        ...this.vfxFlags,
        timeOfDay: this.timeOfDay,
        isNight: bucket === 'NIGHT',
      });
      if (this.isResting) {
        this._renderCampsite2026(ctx, 235, 256);
      }
    }

    // 5. Weather Particle Overlay
    this._renderWeatherOverlay(ctx);

    // 6. Auto-March "Size Up the Situation" Retro Banner
    if (this.isAutoMarching) {
      this._renderAutoMarchBanner(ctx);
    }
  }

  _renderCampsite1848(ctx, fireX, fireY) {
    ctx.save();
    // Campfire wood base
    ctx.fillStyle = '#451a03';
    ctx.fillRect(fireX - 12, fireY + 4, 24, 4);
    ctx.fillRect(fireX - 8, fireY + 1, 16, 4);

    // Warm glow on ground
    const glow = ctx.createRadialGradient(fireX, fireY, 3, fireX, fireY, 35);
    glow.addColorStop(0, 'rgba(249, 115, 22, 0.45)');
    glow.addColorStop(1, 'rgba(249, 115, 22, 0.0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(fireX, fireY, 35, 0, Math.PI * 2);
    ctx.fill();

    // Flickering flame tongues
    const flicker = Math.sin(this.animTime * 18) * 3;
    const flameH = 14 + flicker;
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.moveTo(fireX - 8, fireY + 4);
    ctx.quadraticCurveTo(fireX - 4, fireY - flameH * 0.6, fireX, fireY - flameH);
    ctx.quadraticCurveTo(fireX + 4, fireY - flameH * 0.6, fireX + 8, fireY + 4);
    ctx.closePath();
    ctx.fill();

    // Inner bright yellow flame
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.moveTo(fireX - 4, fireY + 4);
    ctx.quadraticCurveTo(fireX - 2, fireY - flameH * 0.4, fireX, fireY - flameH * 0.65);
    ctx.quadraticCurveTo(fireX + 2, fireY - flameH * 0.4, fireX + 4, fireY + 4);
    ctx.closePath();
    ctx.fill();

    // Embers rising
    ctx.fillStyle = '#fed7aa';
    for (let i = 0; i < 4; i++) {
      const emberY = fireY - 10 - ((this.animTime * 45 + i * 15) % 30);
      const emberX = fireX + Math.sin(this.animTime * 8 + i * 2) * 6;
      ctx.fillRect(emberX, emberY, 2, 2);
    }
    ctx.restore();
  }

  _renderCampsite2026(ctx, campX, campY) {
    ctx.save();
    // Fold-out camping chairs & esky
    ctx.fillStyle = '#1e3a8a'; // Blue camping chair
    ctx.fillRect(campX - 16, campY - 8, 12, 16);
    ctx.fillStyle = '#dc2626'; // Red Esky (cooler)
    ctx.fillRect(campX + 4, campY - 2, 14, 10);
    ctx.fillStyle = '#f8fafc'; // White lid
    ctx.fillRect(campX + 3, campY - 4, 16, 3);

    // Warm lantern / camp light
    const lanternX = campX - 2;
    const lanternY = campY - 14;
    ctx.fillStyle = '#334155';
    ctx.fillRect(lanternX - 3, lanternY - 2, 6, 8);
    const lanternGlow = ctx.createRadialGradient(lanternX, lanternY, 2, lanternX, lanternY, 30);
    lanternGlow.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
    lanternGlow.addColorStop(1, 'rgba(254, 240, 138, 0.0)');
    ctx.fillStyle = lanternGlow;
    ctx.beginPath();
    ctx.arc(lanternX, lanternY, 30, 0, Math.PI * 2);
    ctx.fill();

    // Text banner: CAMP & REST
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('REST STOP', campX - 24, campY - 24);
    ctx.restore();
  }

  _renderApproachingLandmark(ctx) {
    if (!this.approachingLandmark) return;
    const { id, name, distRemaining, approachWindow } = this.approachingLandmark;
    const windowDist = approachWindow || (this.cartridgeId === 'pacific_2026' ? 120 : 100);
    if (distRemaining > windowDist || distRemaining <= 0) return;

    const progress = Math.max(0, Math.min(1.0, 1.0 - distRemaining / windowDist));
    const lx = 60 + progress * 200;
    const ly = 238;
    const scale = 0.55 + progress * 0.45;

    ctx.save();
    ctx.translate(lx, ly);
    ctx.scale(scale, scale);

    const key = (id || name || '').toLowerCase();
    if (this.cartridgeId === 'oregon_1848') {
      this._draw1848LandmarkSprite(ctx, key);
    } else {
      this._draw2026LandmarkSprite(ctx, key);
    }
    ctx.restore();
  }

  _draw1848LandmarkSprite(ctx, key) {
    if (key.includes('fort') || key.includes('kearney') || key.includes('laramie') || key.includes('hall')) {
      // Wooden fort stockade & American flag
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-22, -26, 44, 26);
      ctx.fillStyle = '#92400e';
      ctx.fillRect(-10, -42, 20, 16);
      // Roof
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.moveTo(-14, -42);
      ctx.lineTo(0, -52);
      ctx.lineTo(14, -42);
      ctx.fill();
      // Flagpole
      ctx.strokeStyle = '#d6d3d1';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -52);
      ctx.lineTo(0, -66);
      ctx.stroke();
      // Flag
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(0, -66, 12, 8);
    } else if (key.includes('chimney')) {
      // Chimney Rock Spire
      ctx.fillStyle = '#9a3412';
      ctx.beginPath();
      ctx.moveTo(-28, 0);
      ctx.lineTo(-12, -25);
      ctx.lineTo(-4, -65);
      ctx.lineTo(4, -65);
      ctx.lineTo(12, -25);
      ctx.lineTo(28, 0);
      ctx.closePath();
      ctx.fill();
    } else if (key.includes('rock')) {
      // Independence Rock dome
      ctx.fillStyle = '#78716c';
      ctx.beginPath();
      ctx.ellipse(0, 0, 38, 22, 0, Math.PI, 0);
      ctx.fill();
    } else if (key.includes('river') || key.includes('kansas') || key.includes('blue') || key.includes('green') || key.includes('snake')) {
      // River crossing trees & ferry post
      ctx.fillStyle = '#166534';
      ctx.beginPath();
      ctx.arc(-14, -20, 14, 0, Math.PI * 2);
      ctx.arc(8, -18, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#713f12';
      ctx.fillRect(-16, -10, 4, 10);
      ctx.fillRect(6, -8, 4, 8);
      // Ferry post
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(16, -24, 3, 24);
    } else {
      // Mountain divide pass
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(-35, 0);
      ctx.lineTo(-12, -40);
      ctx.lineTo(6, -18);
      ctx.lineTo(22, -45);
      ctx.lineTo(42, 0);
      ctx.closePath();
      ctx.fill();
    }
  }

  _draw2026LandmarkSprite(ctx, key) {
    if (key.includes('coffs')) {
      // The Big Banana
      ctx.save();
      // Yellow banana body
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(0, -18, 26, 0.4, 2.7, false);
      ctx.quadraticCurveTo(-14, -8, 18, -2);
      ctx.fill();
      // Green tip & brown stalk
      ctx.fillStyle = '#65a30d';
      ctx.fillRect(-22, -10, 5, 5);
      ctx.fillStyle = '#713f12';
      ctx.fillRect(18, -5, 4, 4);
      // Plinth
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-25, 0, 50, 6);
      ctx.restore();
    } else if (key.includes('ballina')) {
      // The Big Pink Prawn
      ctx.save();
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(0, -22, 18, 0, Math.PI * 2);
      ctx.fill();
      // Curled segmented tail
      ctx.strokeStyle = '#e11d48';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(10, -14, 12, 0.5, 2.5);
      ctx.stroke();
      // Eye & antennae
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-8, -26, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(-8, -26, 2, 0, Math.PI * 2);
      ctx.fill();
      // Plinth
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-20, 0, 40, 6);
      ctx.restore();
    } else if (key.includes('brisbane')) {
      // Brisbane skyline & Story Bridge
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-35, -45, 12, 45);
      ctx.fillRect(-20, -55, 14, 55);
      ctx.fillRect(-4, -40, 16, 40);
      ctx.fillRect(14, -50, 18, 50);
      // Golden beacon
      ctx.fillStyle = '#eab308';
      ctx.fillRect(-15, -57, 4, 3);
    } else if (key.includes('hawkesbury')) {
      // Massive concrete bridge tower
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(-18, -48, 6, 48);
      ctx.fillRect(12, -48, 6, 48);
      ctx.fillRect(-18, -32, 36, 4);
      // Cable stays
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-15, -46); ctx.lineTo(-32, 0);
      ctx.moveTo(15, -46); ctx.lineTo(32, 0);
      ctx.stroke();
    } else {
      // Highway Servo & Neon Canopy
      ctx.fillStyle = '#047857';
      ctx.fillRect(-26, -26, 52, 6); // Green canopy roof
      ctx.fillStyle = '#10b981';
      ctx.fillRect(-26, -20, 52, 2); // Neon stripe
      // Fuel bowser pillars
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-18, -20, 5, 20);
      ctx.fillRect(13, -20, 5, 20);
      // Fuel price pylon
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(28, -38, 10, 38);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(30, -34, 6, 8); // LED price display
    }
  }

  _renderAutoMarchBanner(ctx) {
    ctx.save();
    const bannerH = 26;
    const bannerY = VIRTUAL_HEIGHT - bannerH - 8;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.fillRect(80, bannerY, VIRTUAL_WIDTH - 160, bannerH);
    ctx.strokeRect(80, bannerY, VIRTUAL_WIDTH - 160, bannerH);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const text =
      this.cartridgeId === 'pacific_2026'
        ? '[ Press SPACE or ENTER to Pull Into Left Lane & Assess Cabin Chaos ]'
        : '[ Press SPACE or ENTER to Size Up the Situation ]';

    const pulse = 0.85 + 0.15 * Math.sin(this.animTime * 6);
    ctx.globalAlpha = pulse;
    ctx.fillText(text, VIRTUAL_WIDTH / 2, bannerY + bannerH / 2);
    ctx.restore();
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
