/**
 * Rysowanie grafiki na canvasie. Tylko przeglądarka (canvas w jsdom nie działa – bez testów
 * jednostkowych; geometria jest w `layout.ts`, kolory w `color.ts` i tam są testowane).
 *
 * Kolejność warstw: tło (wypełnienie/zdjęcie → wzór → ziarno → ramka) → napis → kafelki → logo.
 * Wszystko rysujemy w przestrzeni 1080×1080; mniejszy canvas (miniatury w panelu) = ta sama
 * grafika pod `ctx.scale()`.
 */
import type { PosterDesign } from '../design';
import { ensureFont, ensureHeadingFont, HEADING_FONTS, LABEL_FONT } from '../fonts';
import { CANVAS, LOGO } from '../layout';
import type { SelectedItem } from '../types';
import { getBackgroundLayer, type BackgroundImage } from './background';
import { drawHeading } from './heading';
import { drawTiles } from './tiles';

export type { BackgroundImage } from './background';
export { wrapText } from './text';

export interface PosterOptions {
  heading: string;
  items: readonly SelectedItem[];
  design: PosterDesign;
  /** Do wielkich liter w stylu „Mocny” (`toLocaleUpperCase`). */
  locale: string;
  /** `dark` = czarne logo (na jasne tło), `light` = białe. `null` = bez logo. */
  logos: { dark: HTMLImageElement | null; light: HTMLImageElement | null } | null;
  /** Wczytane okładki (klucz = `item.key`); `null` = brak/błąd → placeholder. */
  images: ReadonlyMap<string, HTMLImageElement | null>;
  backgroundImage: BackgroundImage | null;
}

// ---------- Zasoby ----------

const imageCache = new Map<string, Promise<HTMLImageElement | null>>();

/** Wczytuje i dekoduje obraz. Błąd → `null` (placeholder zamiast wywalenia całej grafiki). */
export function loadImage(url: string): Promise<HTMLImageElement | null> {
  let promise = imageCache.get(url);
  if (!promise) {
    const img = new Image();
    img.src = url;
    promise = img.decode().then(
      () => img,
      () => null,
    );
    imageCache.set(url, promise);
  }
  return promise;
}

/** Fonty potrzebne do narysowania danego projektu (napis + podpisy). */
export function loadFontsFor(design: PosterDesign): Promise<unknown> {
  return Promise.all([
    ensureHeadingFont(design.heading.font),
    ensureFont(LABEL_FONT),
    design.tiles.style === 'polaroid' ? ensureFont(HEADING_FONTS.handwritten) : null,
  ]);
}

// ---------- Rysowanie ----------

export function renderPoster(ctx: CanvasRenderingContext2D, options: PosterOptions): void {
  const { heading, items, design, locale, logos, images, backgroundImage } = options;
  const size = ctx.canvas.width;
  const scale = size / CANVAS;

  ctx.save();
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, CANVAS, CANVAS);

  const layer = getBackgroundLayer(design.background, backgroundImage, size);
  ctx.drawImage(layer.canvas, 0, 0, CANVAS, CANVAS);

  drawHeading(ctx, heading, design.heading, layer, locale);
  drawTiles(ctx, items, images, design.tiles, layer);

  const logo = logos && (layer.tone === 'light' ? logos.dark : logos.light);
  if (logo) {
    const width = Math.round((logo.naturalWidth / logo.naturalHeight) * LOGO.height);
    ctx.drawImage(logo, LOGO.right - width, LOGO.y, width, LOGO.height);
  }
  ctx.restore();
}

/** `grota-gry-2026-10-05.png` – data lokalna, nie UTC. */
export function posterFileName(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `grota-gry-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.png`;
}
