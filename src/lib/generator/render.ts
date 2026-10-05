/**
 * Rysowanie grafiki na canvasie. Tylko przeglądarka (canvas w jsdom nie działa – bez testów
 * jednostkowych; geometria jest w `layout.ts` i tam jest testowana).
 */
import { CANVAS, HEADER, HEADING_FONT, LABEL, LOGO, computeLayout } from './layout';
import type { SelectedItem } from './types';

/** Kolory jasnego motywu z global.css – na sztywno, grafika nie zależy od motywu strony. */
const COLORS = { paper: '#f6f1e7', ink: '#1b1916', placeholder: '#efe8da' } as const;
const HEADING_FAMILY = '"Fraunces Variable", Georgia, serif';
const LABEL_FAMILY = '"Inter Variable", system-ui, sans-serif';
const ELLIPSIS = '…';

export interface PosterOptions {
  heading: string;
  items: readonly SelectedItem[];
  logo: HTMLImageElement | null;
  /** Wczytane okładki (klucz = `item.key`); `null` = brak/błąd → placeholder. */
  images: ReadonlyMap<string, HTMLImageElement | null>;
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

let fontsPromise: Promise<unknown> | undefined;

/**
 * Canvas nie czeka na fonty – bez tego narysuje font zastępczy. Drugi argument wymusza
 * pobranie podzbioru latin-ext (polskie znaki), który @font-face dociąga po unicode-range.
 */
export function loadFonts(): Promise<unknown> {
  fontsPromise ??= Promise.all([
    document.fonts.load(`600 64px ${HEADING_FAMILY}`, 'Aąęłóśźż'),
    document.fonts.load(`600 32px ${LABEL_FAMILY}`, 'Aąęłóśźż'),
  ]).catch(() => undefined);
  return fontsPromise;
}

// ---------- Tekst ----------

/** Łamie tekst po słowach; słowo dłuższe niż linia jest łamane po znakach. */
export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const fits = (s: string) => ctx.measureText(s).width <= maxWidth;
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (fits(candidate)) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = '';
    if (fits(word)) {
      line = word;
      continue;
    }
    for (const char of word) {
      if (line && !fits(line + char)) {
        lines.push(line);
        line = char;
      } else {
        line += char;
      }
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Jak `wrapText`, ale maks. `maxLines` linii – nadmiar ucięty „…” w ostatniej. */
function clampLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const lines = wrapText(ctx, text, maxWidth);
  if (lines.length <= maxLines) return lines;
  let last = lines.slice(maxLines - 1).join(' ');
  while (last && ctx.measureText(last + ELLIPSIS).width > maxWidth) last = last.slice(0, -1);
  return [...lines.slice(0, maxLines - 1), last.trimEnd() + ELLIPSIS];
}

// ---------- Rysowanie ----------

function drawHeading(ctx: CanvasRenderingContext2D, heading: string) {
  const text = heading.trim();
  if (!text) return;
  ctx.fillStyle = COLORS.ink;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  let size: number = HEADING_FONT.max;
  let lines: string[] = [];
  for (; size >= HEADING_FONT.min; size -= HEADING_FONT.step) {
    ctx.font = `600 ${size}px ${HEADING_FAMILY}`;
    lines = wrapText(ctx, text, HEADER.width);
    if (lines.length <= HEADING_FONT.maxLines) break;
  }
  if (lines.length > HEADING_FONT.maxLines) {
    size = HEADING_FONT.min;
    ctx.font = `600 ${size}px ${HEADING_FAMILY}`;
    lines = clampLines(ctx, text, HEADER.width, HEADING_FONT.maxLines);
  }
  lines.forEach((line, i) =>
    ctx.fillText(line, HEADER.x, HEADER.y + i * size * HEADING_FONT.lineHeight),
  );
}

/** Okładka przycięta „cover” do kwadratu (środek obrazu zachowany), z zaokrąglonymi rogami. */
function drawCover(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  x: number,
  y: number,
  tile: number,
) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, tile, tile, Math.round(tile * 0.06));
  if (image) {
    ctx.clip();
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    const sx = (image.naturalWidth - side) / 2;
    const sy = (image.naturalHeight - side) / 2;
    ctx.drawImage(image, sx, sy, side, side, x, y, tile, tile);
  } else {
    ctx.fillStyle = COLORS.placeholder;
    ctx.fill();
  }
  ctx.restore();
}

function drawLabel(
  ctx: CanvasRenderingContext2D,
  title: string,
  x: number,
  y: number,
  tile: number,
  fontSize: number,
) {
  ctx.fillStyle = COLORS.ink;
  ctx.font = `600 ${fontSize}px ${LABEL_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const lines = clampLines(ctx, title, tile, LABEL.lines);
  lines.forEach((line, i) =>
    ctx.fillText(line, x + tile / 2, y + tile + 10 + i * fontSize * LABEL.lineHeight),
  );
}

export function renderPoster(ctx: CanvasRenderingContext2D, options: PosterOptions) {
  const { heading, items, logo, images } = options;
  ctx.fillStyle = COLORS.paper;
  ctx.fillRect(0, 0, CANVAS, CANVAS);

  drawHeading(ctx, heading);

  const layout = computeLayout(items.length);
  items.forEach((item, i) => {
    const cell = layout.cells[i]!;
    drawCover(ctx, images.get(item.key) ?? null, cell.x, cell.y, layout.tile);
    drawLabel(ctx, item.title, cell.x, cell.y, layout.tile, layout.labelFontSize);
  });

  if (logo) {
    const width = Math.round((logo.naturalWidth / logo.naturalHeight) * LOGO.height);
    ctx.drawImage(logo, LOGO.right - width, LOGO.y, width, LOGO.height);
  }
}

/** `grota-gry-2026-10-05.png` – data lokalna, nie UTC. */
export function posterFileName(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `grota-gry-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.png`;
}
