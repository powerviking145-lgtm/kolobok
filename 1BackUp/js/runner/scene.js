import { RUNNER_CONFIG } from './runner-config.js';
import { getScenePalette } from './location.js';
import { drawSoilLayers } from './soilPatterns.js';

export function drawScene(ctx, width, height, scrollX) {
  const loc = getScenePalette();
  const groundY = height * RUNNER_CONFIG.groundY;

  const sky = ctx.createLinearGradient(0, 0, 0, groundY);
  sky.addColorStop(0, loc.skyTop);
  sky.addColorStop(1, loc.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, groundY);

  const parallax = (scrollX * width * 0.3) % width;
  ctx.fillStyle = loc.hill;
  for (let i = -1; i < 3; i++) {
    const bx = i * width * 0.55 - parallax * 0.5;
    ctx.beginPath();
    ctx.ellipse(bx + width * 0.3, groundY - height * 0.08, width * 0.35, height * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  drawSoilLayers(ctx, width, height, groundY, scrollX);

  ctx.strokeStyle = loc.groundLine;
  ctx.lineWidth = Math.max(2, height * 0.006);
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(width, groundY);
  ctx.stroke();

  const scrollPx = (scrollX * width) % 80;
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  for (let x = -scrollPx; x < width; x += 80) {
    ctx.fillRect(x, groundY + height * 0.02, 40, height * 0.015);
  }

  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}
