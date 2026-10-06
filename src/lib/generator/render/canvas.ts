/**
 * Drobne pomocniki canvasa. Wszystkie funkcje rysujące działają w przestrzeni 1080×1080
 * (`CANVAS`) – miniatury w panelu to ten sam kod pod `ctx.scale()`.
 */

export function createCanvas(width: number, height = width): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

export function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D niedostępny');
  return ctx;
}

/** Skala bieżącej transformacji (zawsze jednolita: miniatury = `ctx.scale(s, s)`). */
export const scaleOf = (ctx: CanvasRenderingContext2D): number => ctx.getTransform().a;

export interface Shadow {
  color: string;
  blur: number;
  offsetY: number;
}

/**
 * Cień rysowany bez samego kształtu: kształt ląduje daleko poza canvasem, a przesunięcie cienia
 * sprowadza na miejsce tylko cień. Dzięki temu pod półprzezroczystą kartą (szkło) albo na
 * antyaliasowanych krawędziach okładki nie ma ciemnej obwódki.
 *
 * Uwaga: `shadowBlur` i `shadowOffset*` NIE podlegają transformacji canvasa – skalujemy je ręcznie.
 */
export function dropShadow(
  ctx: CanvasRenderingContext2D,
  shadows: readonly Shadow[],
  path: (ctx: CanvasRenderingContext2D, dx: number) => void,
): void {
  const scale = scaleOf(ctx);
  const away = 10_000;
  for (const shadow of shadows) {
    ctx.save();
    ctx.shadowColor = shadow.color;
    ctx.shadowBlur = shadow.blur * scale;
    ctx.shadowOffsetX = away * scale;
    ctx.shadowOffsetY = shadow.offsetY * scale;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    path(ctx, -away);
    ctx.fill();
    ctx.restore();
  }
}

/** Cień tekstu/kształtu przeskalowany do bieżącej transformacji. */
export function setShadow(ctx: CanvasRenderingContext2D, shadow: Shadow): void {
  const scale = scaleOf(ctx);
  ctx.shadowColor = shadow.color;
  ctx.shadowBlur = shadow.blur * scale;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = shadow.offsetY * scale;
}

/** `#rrggbb` + krycie → `rgba()`. */
export function withAlpha(hex: string, alpha: number): string {
  const value = parseInt(hex.slice(1), 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}
