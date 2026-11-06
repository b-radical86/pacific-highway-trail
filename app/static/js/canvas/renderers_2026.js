/**
 * Procedural 2D Vector Renderers for Cartridge 2: 2026 The M1 Gauntlet.
 * Pure Canvas 2D API calls — zero external image assets.
 */

/**
 * Renders 3-layer parallax terrain for the 2026 M1 Pacific Motorway.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} scrollX Cumulative scroll offset
 * @param {number} width Virtual width (800)
 * @param {number} height Virtual height (400)
 */
export function drawBackground2026(ctx, scrollX, width = 800, height = 400) {
  const horizonY = 240;

  // 1. Parallax Layer 1: Eucalyptus Great Dividing Range Silhouettes (0.2x speed)
  const mOffset = (scrollX * 0.2) % 360;
  ctx.fillStyle = '#143628';
  ctx.beginPath();
  ctx.moveTo(-mOffset, horizonY);
  for (let x = -mOffset; x < width + 360; x += 90) {
    const hillH = 48 + ((Math.abs(Math.floor(x / 90)) * 29) % 35);
    ctx.quadraticCurveTo(x + 45, horizonY - hillH, x + 90, horizonY);
  }
  ctx.closePath();
  ctx.fill();

  // 2. Parallax Layer 2: Gum Trees, Golden Wattle & Highway Exit Signs (0.5x speed)
  const tOffset = (scrollX * 0.5) % 240;
  for (let x = -tOffset; x < width + 240; x += 60) {
    // Gum tree trunk
    ctx.fillStyle = '#7f8c8d';
    ctx.fillRect(x + 14, horizonY - 22, 4, 24);
    // Gum canopy
    ctx.fillStyle = '#1e5631';
    ctx.beginPath();
    ctx.arc(x + 16, horizonY - 26, 14, 0, Math.PI * 2);
    ctx.fill();

    // Golden Wattle bush every second slot
    if (Math.abs(Math.floor(x / 60)) % 2 === 0) {
      ctx.fillStyle = '#f1c40f';
      ctx.beginPath();
      ctx.arc(x + 42, horizonY - 5, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Green Australian Highway Exit Sign every 480px in Layer 2
  const signOffset = (scrollX * 0.5) % 480;
  const signX = width - signOffset;
  if (signX > -80 && signX < width + 40) {
    ctx.fillStyle = '#95a5a6';
    ctx.fillRect(signX + 10, horizonY - 24, 3, 26);
    ctx.fillRect(signX + 48, horizonY - 24, 3, 26);
    ctx.fillStyle = '#0b5345';
    ctx.fillRect(signX, horizonY - 46, 62, 24);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(signX + 2, horizonY - 44, 58, 20);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('M1 NORTH', signX + 31, horizonY - 32);
  }

  // 3. Parallax Layer 3: Two-Lane M1 Motorway Asphalt & Markings (1.0x speed)
  ctx.fillStyle = '#212f3d';
  ctx.fillRect(0, horizonY, width, height - horizonY);

  // Verge & Breakdown Shoulder
  ctx.fillStyle = '#17202a';
  ctx.fillRect(0, horizonY, width, 16);
  ctx.fillStyle = '#f39c12';
  ctx.fillRect(0, horizonY + 15, width, 2);

  // Dashed White Highway Lane Markings
  ctx.fillStyle = '#fdfefe';
  const laneOffset = (scrollX * 2.4) % 64;
  for (let lx = -laneOffset; lx < width + 64; lx += 64) {
    ctx.fillRect(lx, horizonY + 72, 34, 5);
  }

  // Roadside Guideposts with Red Reflectors
  const postOffset = (scrollX * 1.2) % 120;
  for (let px = -postOffset; px < width + 120; px += 120) {
    ctx.fillStyle = '#ecf0f1';
    ctx.fillRect(px, horizonY + 4, 4, 12);
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(px + 1, horizonY + 5, 2, 4);
  }
}

/**
 * Renders the 2026 7-Seater Family SUV with Roof Cargo Pod and Active Status VFX.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x Base X coordinate
 * @param {number} y Base Y coordinate
 * @param {number} animTime Elapsed animation time in seconds
 * @param {boolean} isMoving Whether the SUV is driving
 * @param {Object} [vfxFlags={}] { vfxStinkLines, vfxSongLoop, isNight, timeOfDay }
 */
export function drawSUV(ctx, x = 280, y = 242, animTime = 0, isMoving = true, vfxFlags = {}) {
  ctx.save();
  const bounce = isMoving ? Math.sin(animTime * 11) * 1.2 : 0;

  // 1. Automatic Dusk/Night LED Headlight Cone
  const tod = vfxFlags.timeOfDay ?? 0.35;
  const headlightsOn = vfxFlags.isNight || tod > 0.72 || tod < 0.22;
  if (headlightsOn) {
    const beamGrad = ctx.createLinearGradient(x + 122, y + 6, x + 280, y + 18);
    beamGrad.addColorStop(0, 'rgba(254, 249, 231, 0.45)');
    beamGrad.addColorStop(1, 'rgba(254, 249, 231, 0.0)');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(x + 122, y + 2 + bounce);
    ctx.lineTo(x + 285, y - 12 + bounce);
    ctx.lineTo(x + 285, y + 38 + bounce);
    ctx.lineTo(x + 122, y + 16 + bounce);
    ctx.closePath();
    ctx.fill();
  }

  // 2. Roof Cargo Pod & Tie-Down Straps
  ctx.fillStyle = '#1c2833';
  ctx.beginPath();
  ctx.roundRect(x + 22, y - 34 + bounce, 68, 12, 5);
  ctx.fill();
  ctx.fillStyle = '#e67e22';
  ctx.fillRect(x + 36, y - 35 + bounce, 3, 14);
  ctx.fillRect(x + 70, y - 35 + bounce, 3, 14);

  // 3. SUV Upper Cabin & Tinted Windows
  ctx.fillStyle = '#283747';
  ctx.beginPath();
  ctx.moveTo(x + 12, y - 10 + bounce);
  ctx.lineTo(x + 28, y - 23 + bounce);
  ctx.lineTo(x + 96, y - 23 + bounce);
  ctx.lineTo(x + 112, y - 10 + bounce);
  ctx.closePath();
  ctx.fill();

  // Window Panes (Row 1, Row 2, Row 3)
  ctx.fillStyle = '#85c1e9';
  ctx.fillRect(x + 30, y - 20 + bounce, 18, 9);
  ctx.fillRect(x + 52, y - 20 + bounce, 20, 9);
  ctx.fillRect(x + 76, y - 20 + bounce, 18, 9);

  // 4. SUV Lower Metallic Body Chassis
  ctx.fillStyle = '#34495e';
  ctx.beginPath();
  ctx.roundRect(x, y - 11 + bounce, 124, 34, 6);
  ctx.fill();

  // Tail light & Front LED Daytime Running Strip
  ctx.fillStyle = '#e74c3c';
  ctx.fillRect(x + 1, y - 6 + bounce, 4, 10);
  ctx.fillStyle = '#fdfefe';
  ctx.fillRect(x + 119, y - 4 + bounce, 5, 8);

  // 5. Spinning 5-Spoke Alloy Wheels
  const wheelAngle = isMoving ? animTime * 9.0 : 0;
  for (const wx of [x + 26, x + 98]) {
    const wy = y + 23 + bounce;
    ctx.save();
    ctx.translate(wx, wy);
    ctx.rotate(wheelAngle);

    // Tyre
    ctx.fillStyle = '#11171d';
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();

    // Alloy Rim & Spokes
    ctx.fillStyle = '#bdc3c7';
    ctx.beginPath();
    ctx.arc(0, 0, 6.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * 6, Math.sin(a) * 6);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 6. Status VFX: Green Wavy Stink Lines (Arthur's Code Brown)
  if (vfxFlags.vfxStinkLines) {
    ctx.strokeStyle = 'rgba(88, 214, 141, 0.78)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const sx = x + 46 + i * 12;
      const sy = y - 22 + bounce;
      const wave = Math.sin(animTime * 5 + i) * 6;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.bezierCurveTo(sx + wave, sy - 14, sx - wave, sy - 28, sx + wave * 0.5, sy - 42);
      ctx.stroke();
    }
  }

  // 7. Status VFX: Floating Musical Notes (Toddler Song Loop)
  if (vfxFlags.vfxSongLoop) {
    ctx.fillStyle = '#f4d03f';
    ctx.font = 'bold 12px sans-serif';
    const notes = ['♪', '♫', '♬'];
    for (let i = 0; i < 3; i++) {
      const floatOffset = ((animTime * 25 + i * 18) % 45);
      const nx = x + 35 + i * 22 + Math.sin(animTime * 3 + i) * 5;
      const ny = y - 36 - floatOffset;
      ctx.fillText(notes[i], nx, ny);
    }
  }

  ctx.restore();
}

/**
 * Draws a roadside variable-message board / abandoned roof pod for past U-Turned families.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x Screen X coordinate
 * @param {number} y Screen Y coordinate
 * @param {{name: string, epitaph?: string}} memorial
 */
export function drawMemorial2026(ctx, x, y, memorial) {
  ctx.save();
  // Roadside electronic traffic sign post
  ctx.fillStyle = '#566573';
  ctx.fillRect(x + 16, y - 26, 4, 26);

  // Digital amber matrix board
  ctx.fillStyle = '#17202a';
  ctx.fillRect(x - 10, y - 48, 56, 24);
  ctx.strokeStyle = '#f39c12';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x - 10, y - 48, 56, 24);

  ctx.fillStyle = '#f39c12';
  ctx.font = 'bold 7px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('U-TURNED', x + 18, y - 38);
  ctx.fillText('AHEAD', x + 18, y - 29);

  if (x > 120 && x < 680 && memorial && memorial.name) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.82)';
    ctx.fillRect(x - 42, y - 78, 120, 24);
    ctx.fillStyle = '#f5b041';
    ctx.font = 'bold 8px monospace';
    ctx.fillText(memorial.name.slice(0, 18), x + 18, y - 67);
    if (memorial.epitaph) {
      ctx.fillStyle = '#d0d3d4';
      ctx.font = '7px monospace';
      ctx.fillText(`"${memorial.epitaph.slice(0, 22)}"`, x + 18, y - 58);
    }
  }
  ctx.restore();
}
