/**
 * Wzory na tle (w kolorze tekstu, niskie krycie) i ziarno.
 */
import type { Pattern } from '../design';
import { CANVAS } from '../layout';
import { mulberry32 } from '../random';
import { context2d, createCanvas } from './canvas';
import { drawDie } from './frames';

/** Suwak „Intensywność” 0–1 → krycie wzoru. */
export const patternAlpha = (opacity: number): number => 0.03 + opacity * 0.12;

export function drawPattern(
  ctx: CanvasRenderingContext2D,
  pattern: Pattern,
  color: string,
  opacity: number,
  seed: number,
): void {
  if (pattern === 'none') return;
  ctx.save();
  ctx.globalAlpha = patternAlpha(opacity);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  switch (pattern) {
    case 'dots':
      ctx.beginPath();
      for (let y = 18; y < CANVAS; y += 36) {
        for (let x = 18; x < CANVAS; x += 36) {
          ctx.moveTo(x + 3, y);
          ctx.arc(x, y, 3, 0, Math.PI * 2);
        }
      }
      ctx.fill();
      break;
    case 'grid':
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i <= CANVAS; i += 54) {
        ctx.moveTo(i, 0);
        ctx.lineTo(i, CANVAS);
        ctx.moveTo(0, i);
        ctx.lineTo(CANVAS, i);
      }
      ctx.stroke();
      break;
    case 'hex':
      drawHexGrid(ctx, 40);
      break;
    case 'pips':
      drawScatteredDice(ctx, color, seed);
      break;
    case 'diagonal':
      ctx.beginPath();
      for (let x = -CANVAS; x < CANVAS * 2; x += 40) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x + 14, 0);
        ctx.lineTo(x + 14 - CANVAS, CANVAS);
        ctx.lineTo(x - CANVAS, CANVAS);
        ctx.closePath();
      }
      ctx.fill();
      break;
  }
  ctx.restore();
}

/** Heksy „płaskim bokiem do góry”, jak na planszy. */
function drawHexGrid(ctx: CanvasRenderingContext2D, side: number) {
  const h = Math.sqrt(3) * side;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let col = -1, x = 0; x < CANVAS + side * 2; col++, x = col * side * 1.5) {
    const offset = col % 2 === 0 ? 0 : h / 2;
    for (let y = -h + offset; y < CANVAS + h; y += h) {
      for (let k = 0; k <= 6; k++) {
        const angle = (Math.PI / 3) * k;
        const px = x + side * Math.cos(angle);
        const py = y + side * Math.sin(angle);
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
    }
  }
  ctx.stroke();
}

/** Rozrzucone ścianki kostek: siatka z losowym przesunięciem, część pól pusta. */
function drawScatteredDice(ctx: CanvasRenderingContext2D, color: string, seed: number) {
  const rng = mulberry32(seed);
  const cell = 120;
  for (let y = cell / 2; y < CANVAS + cell / 2; y += cell) {
    for (let x = cell / 2; x < CANVAS + cell / 2; x += cell) {
      if (rng() < 0.35) continue;
      const face = 1 + Math.floor(rng() * 6);
      const angle = (rng() - 0.5) * 1.2;
      drawDie(ctx, x + (rng() - 0.5) * 50, y + (rng() - 0.5) * 50, 44, face, angle, {
        stroke: color,
        pip: color,
      });
    }
  }
}

const noiseCache = new Map<number, HTMLCanvasElement>();

/** Szum 256×256 z `seed` (cache) – kafelkowany jako wzór. */
function noise(seed: number): HTMLCanvasElement {
  let canvas = noiseCache.get(seed);
  if (!canvas) {
    canvas = createCanvas(256);
    const ctx = context2d(canvas);
    const data = ctx.createImageData(256, 256);
    const rng = mulberry32(seed);
    for (let i = 0; i < data.data.length; i += 4) {
      const v = Math.floor(rng() * 256);
      data.data[i] = v;
      data.data[i + 1] = v;
      data.data[i + 2] = v;
      data.data[i + 3] = 255;
    }
    ctx.putImageData(data, 0, 0);
    noiseCache.set(seed, canvas);
  }
  return canvas;
}

/** Ziarno usuwa „cyfrową płaskość” gradientów i zapobiega widocznym pasom (banding). */
export function drawGrain(ctx: CanvasRenderingContext2D, seed: number): void {
  const pattern = ctx.createPattern(noise(seed), 'repeat');
  if (!pattern) return;
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, CANVAS, CANVAS);
  ctx.restore();
}
