/**
 * Ramki grafiki. Rysowane tylko w pasie `FRAME_BAND` przy krawędzi, więc napis, siatka i logo
 * zostają na miejscu. `FRAME_DEPTH` (jak głęboko od krawędzi sięga ramka) sprawdza test.
 */
import type { Frame, Tone } from '../design';
import { pickTextColor } from '../color';
import { CANVAS } from '../layout';
import { withAlpha } from './canvas';

/** Odległość od krawędzi, do której sięga rysunek ramki (z grubością linii i obrotem). */
export const FRAME_DEPTH: Record<Frame, number> = {
  none: 0,
  line: 25.5,
  double: 29.5,
  rounded: 25.5,
  mat: 28,
  corners: 30,
  dice: 31.5,
};

const DICE = { size: 24, inset: 6, radius: 5 } as const;

export interface FrameContext {
  tone: Tone;
  text: string;
  accent: string;
}

export function drawFrame(ctx: CanvasRenderingContext2D, frame: Frame, fc: FrameContext): void {
  if (frame === 'none') return;
  ctx.save();
  ctx.strokeStyle = withAlpha(fc.text, 0.85);
  switch (frame) {
    case 'line':
      ctx.lineWidth = 3;
      ctx.strokeRect(24, 24, CANVAS - 48, CANVAS - 48);
      break;
    case 'double':
      // Gruba i cienka linia – jak podwójne kreski wokół napisu „GROTA” w logo.
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 20, CANVAS - 40, CANVAS - 40);
      ctx.lineWidth = 1.5;
      ctx.strokeRect(28.75, 28.75, CANVAS - 57.5, CANVAS - 57.5);
      break;
    case 'rounded':
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(24, 24, CANVAS - 48, CANVAS - 48, 40);
      ctx.stroke();
      break;
    case 'mat': {
      // Passe-partout: pas papieru wokół, wewnętrzne rogi zaokrąglone.
      ctx.fillStyle = fc.tone === 'light' ? '#fffcf5' : '#1d1b18';
      ctx.beginPath();
      ctx.rect(0, 0, CANVAS, CANVAS);
      ctx.roundRect(28, 28, CANVAS - 56, CANVAS - 56, 32);
      ctx.fill('evenodd');
      ctx.strokeStyle = withAlpha(fc.text, 0.18);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(28, 28, CANVAS - 56, CANVAS - 56, 32);
      ctx.stroke();
      break;
    }
    case 'corners':
      drawCorners(ctx, fc.accent);
      break;
    case 'dice':
      drawDice(ctx, fc.accent);
      break;
  }
  ctx.restore();
}

/** Art-decowe narożniki: L + romb w rogu. */
function drawCorners(ctx: CanvasRenderingContext2D, color: string) {
  const inset = 24;
  const arm = 72;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;
  for (const [sx, sy] of [
    [1, 1],
    [-1, 1],
    [-1, -1],
    [1, -1],
  ] as const) {
    const x = sx > 0 ? inset : CANVAS - inset;
    const y = sy > 0 ? inset : CANVAS - inset;
    ctx.beginPath();
    ctx.moveTo(x, y + sy * arm);
    ctx.lineTo(x, y);
    ctx.lineTo(x + sx * arm, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y - 6);
    ctx.lineTo(x + 6, y);
    ctx.lineTo(x, y + 6);
    ctx.lineTo(x - 6, y);
    ctx.closePath();
    ctx.fill();
  }
}

/** Oczka kostki na siatce 3×3 (kolumna, wiersz). */
export const PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [
    [0, 0],
    [2, 2],
  ],
  3: [
    [0, 0],
    [1, 1],
    [2, 2],
  ],
  4: [
    [0, 0],
    [2, 0],
    [0, 2],
    [2, 2],
  ],
  5: [
    [0, 0],
    [2, 0],
    [1, 1],
    [0, 2],
    [2, 2],
  ],
  6: [
    [0, 0],
    [2, 0],
    [0, 1],
    [2, 1],
    [0, 2],
    [2, 2],
  ],
};

/** Ścianka kostki wyśrodkowana w (cx, cy). Wspólne dla ramki i wzoru „kostki”. */
export function drawDie(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  face: number,
  angle: number,
  style: { fill?: string; stroke?: string; pip: string },
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.roundRect(-size / 2, -size / 2, size, size, size * 0.22);
  if (style.fill) {
    ctx.fillStyle = style.fill;
    ctx.fill();
  }
  if (style.stroke) {
    ctx.strokeStyle = style.stroke;
    ctx.lineWidth = Math.max(1.5, size * 0.05);
    ctx.stroke();
  }
  ctx.fillStyle = style.pip;
  const step = size * 0.27;
  for (const [col, row] of PIPS[face] ?? []) {
    ctx.beginPath();
    ctx.arc((col - 1) * step, (row - 1) * step, size * 0.09, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawDice(ctx: CanvasRenderingContext2D, color: string) {
  const c = DICE.inset + DICE.size / 2;
  const corners = [
    [c, c, 1, -6],
    [CANVAS - c, c, 2, 5],
    [CANVAS - c, CANVAS - c, 5, -4],
    [c, CANVAS - c, 6, 6],
  ] as const;
  for (const [x, y, face, deg] of corners) {
    drawDie(ctx, x, y, DICE.size, face, (deg * Math.PI) / 180, {
      fill: color,
      pip: pickTextColor(color),
    });
  }
}
