/**
 * Procedural 2D Vector Renderers for Cartridge 1: 1848 Oregon Trail.
 * Pure Canvas 2D API calls — zero external image assets.
 */

/**
 * Renders 3-layer parallax terrain for the 1848 Oregon Trail.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} scrollX Cumulative scroll offset
 * @param {number} width Virtual width (800)
 * @param {number} height Virtual height (400)
 */
export function drawBackground1848(ctx, scrollX, width = 800, height = 400) {
  const horizonY = 240;

  // 1. Parallax Layer 1: Distant Jagged Rocky Mountains (0.2x speed)
  const mOffset = (scrollX * 0.2) % 400;
  ctx.fillStyle = '#2c3e50';
  ctx.beginPath();
  ctx.moveTo(-mOffset, horizonY);
  for (let x = -mOffset; x < width + 400; x += 100) {
    const peakH = 75 + ((Math.abs(Math.floor(x / 100)) * 37) % 45);
    ctx.lineTo(x + 50, horizonY - peakH);
    ctx.lineTo(x + 100, horizonY);
  }
  ctx.closePath();
  ctx.fill();

  // Snow caps on tall peaks
  ctx.fillStyle = 'rgba(236, 240, 241, 0.35)';
  for (let x = -mOffset; x < width + 400; x += 200) {
    const peakY = horizonY - 95;
    ctx.beginPath();
    ctx.moveTo(x + 50, peakY);
    ctx.lineTo(x + 36, peakY + 22);
    ctx.lineTo(x + 64, peakY + 22);
    ctx.closePath();
    ctx.fill();
  }

  // 2. Parallax Layer 2: Midground Pine Forests & Western Buttes (0.5x speed)
  const tOffset = (scrollX * 0.5) % 160;
  ctx.fillStyle = '#196f3d';
  for (let x = -tOffset; x < width + 160; x += 40) {
    const treeH = 28 + ((Math.abs(Math.floor(x / 40)) * 19) % 16);
    ctx.beginPath();
    ctx.moveTo(x, horizonY + 4);
    ctx.lineTo(x + 12, horizonY + 4 - treeH);
    ctx.lineTo(x + 24, horizonY + 4);
    ctx.closePath();
    ctx.fill();
  }

  // 3. Parallax Layer 3: Foreground Prairie & Dirt Wagon Trail (1.0x speed)
  ctx.fillStyle = '#6e5a11';
  ctx.fillRect(0, horizonY, width, height - horizonY);

  // Main beaten dirt track
  ctx.fillStyle = '#876d22';
  ctx.fillRect(0, horizonY + 35, width, 75);

  // Wagon wheel ruts & gravel stones
  ctx.fillStyle = '#564504';
  const rutOffset = (scrollX * 1.5) % 80;
  for (let rx = -rutOffset; rx < width + 80; rx += 80) {
    ctx.fillRect(rx, horizonY + 50, 48, 3);
    ctx.fillRect(rx + 20, horizonY + 92, 48, 3);
    // Prairie grass tuft
    ctx.fillStyle = '#4d5627';
    ctx.fillRect(rx + 10, horizonY + 18, 6, 8);
    ctx.fillStyle = '#564504';
  }
}

/**
 * Renders the 1848 Prairie Schooner Wagon and Yoked Oxen team.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x Base X coordinate
 * @param {number} y Base Y coordinate
 * @param {number} animTime Elapsed animation time in seconds
 * @param {boolean} isMoving Whether the wagon is actively rolling
 */
export function drawSchooner(ctx, x = 250, y = 240, animTime = 0, isMoving = true) {
  ctx.save();
  const bounce = isMoving ? Math.sin(animTime * 9) * 1.8 : 0;

  // 1. Canvas Bonnet (Prairie Schooner Cover with Ribs)
  ctx.fillStyle = '#f5eef8';
  ctx.beginPath();
  ctx.ellipse(x + 48, y - 24 + bounce, 48, 28, 0, Math.PI, 0);
  ctx.fill();

  ctx.strokeStyle = '#cbb8d4';
  ctx.lineWidth = 2;
  for (let ribX = x + 16; ribX <= x + 80; ribX += 16) {
    ctx.beginPath();
    ctx.moveTo(ribX, y - 24 + bounce);
    ctx.lineTo(ribX, y - 48 + bounce);
    ctx.stroke();
  }

  // 2. Wooden Wagon Box
  ctx.fillStyle = '#784212';
  ctx.fillRect(x, y - 4 + bounce, 96, 18);
  ctx.strokeStyle = '#4a2306';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y - 4 + bounce, 96, 18);

  // 3. Wagon Tongue & Yoke Hitch connecting to Oxen
  ctx.strokeStyle = '#5c330a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + 96, y + 6 + bounce);
  ctx.lineTo(x + 145, y + 4);
  ctx.stroke();

  // 4. Spoked Wooden Wheels (Rear larger, Front slightly smaller)
  const wheelAngle = isMoving ? animTime * 4.5 : 0;
  const wheels = [
    { wx: x + 18, wy: y + 16 + bounce, r: 15 },
    { wx: x + 78, wy: y + 18 + bounce, r: 13 },
  ];

  for (const w of wheels) {
    ctx.save();
    ctx.translate(w.wx, w.wy);
    ctx.rotate(wheelAngle);

    // Outer wooden rim
    ctx.strokeStyle = '#6e2c00';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, w.r, 0, Math.PI * 2);
    ctx.stroke();

    // 6 Rotating Spokes
    ctx.strokeStyle = '#935116';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * w.r, Math.sin(a) * w.r);
      ctx.stroke();
    }

    // Iron hub
    ctx.fillStyle = '#1c2833';
    ctx.beginPath();
    ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 5. 2-Frame Walking Oxen Team
  const stride = isMoving ? Math.sin(animTime * 8) * 4.5 : 0;
  const oxX = x + 128;
  const oxY = y - 2;

  // Ox Body
  ctx.fillStyle = '#512e10';
  ctx.fillRect(oxX, oxY, 42, 22);

  // Ox Head & Horns
  ctx.fillRect(oxX + 38, oxY - 8, 15, 18);
  ctx.fillStyle = '#f2f4f4';
  ctx.beginPath();
  ctx.moveTo(oxX + 44, oxY - 8);
  ctx.lineTo(oxX + 49, oxY - 18);
  ctx.lineTo(oxX + 52, oxY - 8);
  ctx.fill();

  // Wooden Neck Yoke
  ctx.fillStyle = '#9c640c';
  ctx.fillRect(oxX + 33, oxY - 10, 5, 22);

  // Alternating Legs
  ctx.fillStyle = '#3a210a';
  ctx.fillRect(oxX + 4 + stride, oxY + 22, 5, 13);
  ctx.fillRect(oxX + 12 - stride, oxY + 22, 5, 13);
  ctx.fillRect(oxX + 28 + stride, oxY + 22, 5, 13);
  ctx.fillRect(oxX + 35 - stride, oxY + 22, 5, 13);

  ctx.restore();
}

/**
 * Draws a roadside pioneer gravestone for past fallen travelers.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x Screen X coordinate
 * @param {number} y Screen Y coordinate
 * @param {{name: string, epitaph?: string}} memorial
 */
export function drawMemorial1848(ctx, x, y, memorial) {
  ctx.save();
  // Stone slab with rounded arch top
  ctx.fillStyle = '#7f8c8d';
  ctx.beginPath();
  ctx.arc(x + 14, y - 20, 14, Math.PI, 0);
  ctx.lineTo(x + 28, y);
  ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#2c3e50';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // R.I.P. inscription
  ctx.fillStyle = '#1c2833';
  ctx.font = 'bold 7px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('R.I.P.', x + 14, y - 16);

  // Floating nameplate if close to center of screen
  if (x > 120 && x < 680 && memorial && memorial.name) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
    ctx.fillRect(x - 45, y - 54, 118, 24);
    ctx.fillStyle = '#f5b041';
    ctx.font = 'bold 8px monospace';
    ctx.fillText(memorial.name.slice(0, 18), x + 14, y - 43);
    if (memorial.epitaph) {
      ctx.fillStyle = '#d0d3d4';
      ctx.font = '7px monospace';
      ctx.fillText(`"${memorial.epitaph.slice(0, 22)}"`, x + 14, y - 34);
    }
  }
  ctx.restore();
}
