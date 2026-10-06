/**
 * „Liquid Glass” (Apple) – statyczne przybliżenie na canvasie: rozmyte tło pod spodem,
 * delikatny tint, połysk u góry i jasna krawędź. Bez refrakcji/soczewkowania (to wymaga
 * shaderów), ale na kolorowym tle efekt jest czytelny.
 */
import type { Tone } from '../design';
import { CANVAS } from '../layout';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function drawGlass(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  radius: number,
  backdrop: HTMLCanvasElement,
  tone: Tone,
): void {
  const { x, y, width, height } = rect;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.clip();
  // Tło „przez mleczne szkło”: ta sama warstwa tła, tylko rozmyta – idealnie w tym samym miejscu.
  ctx.drawImage(backdrop, 0, 0, CANVAS, CANVAS);
  // Tint dopasowany do tła: na ciemnym słabszy, żeby szkło nie wyglądało na mgłę.
  ctx.fillStyle = tone === 'light' ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.10)';
  ctx.fillRect(x, y, width, height);
  // Połysk w górnej części.
  const sheen = ctx.createLinearGradient(0, y, 0, y + height * 0.45);
  sheen.addColorStop(0, 'rgba(255,255,255,0.28)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(x, y, width, height * 0.45);
  ctx.restore();

  // Krawędź: refleks światła na górnym-lewym i dolnym-prawym rogu.
  const edge = ctx.createLinearGradient(x, y, x + width, y + height);
  edge.addColorStop(0, 'rgba(255,255,255,0.75)');
  edge.addColorStop(0.5, 'rgba(255,255,255,0.15)');
  edge.addColorStop(1, 'rgba(255,255,255,0.45)');
  ctx.save();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x + 0.75, y + 0.75, width - 1.5, height - 1.5, Math.max(0, radius - 0.75));
  ctx.stroke();
  ctx.restore();
}
