/**
 * Warstwa tła: wypełnienie albo zdjęcie → wzór → ziarno → ramka. Rysowana do osobnego canvasa
 * i trzymana w cache – zmiana gier, napisu czy kafelków nie przerysowuje tła. Ta sama warstwa
 * (rozmyta) jest „za szkłem” w kafelkach `glass`.
 */
import type { BackgroundDesign, Fill, Focus, Tone } from '../design';
import { pickTextColor, rgbToHex, textColorFor, toneOfFill } from '../color';
import { INK } from '../design';
import { CANVAS } from '../layout';
import { presetById } from '../presets';
import { blurred } from './blur';
import { context2d, createCanvas, withAlpha } from './canvas';
import { drawFrame } from './frames';
import { drawGrain, drawPattern } from './patterns';

/** Zdjęcie tła z urządzenia, już przeskalowane (krótszy bok ≥ 1080 px, o ile oryginał pozwala). */
export interface BackgroundImage {
  /** Rośnie przy każdym nowym pliku – klucz cache. */
  id: number;
  source: HTMLCanvasElement;
}

/** Jak bardzo tło jest „zajęte” – tekst wprost na nim dostaje halo. */
export type Busy = 'none' | 'soft' | 'strong';

export interface BackgroundLayer {
  canvas: HTMLCanvasElement;
  tone: Tone;
  /** Kolor tekstu wynikający z tonu. */
  text: string;
  accent: string;
  busy: Busy;
  /** Rozmyta kopia dla szkła – liczona dopiero, gdy potrzebna. */
  blurred: () => HTMLCanvasElement;
}

// ---------- Wypełnienia ----------

export function drawFill(ctx: CanvasRenderingContext2D, fill: Fill): void {
  switch (fill.kind) {
    case 'solid':
      ctx.fillStyle = fill.color;
      break;
    case 'linear': {
      // Kąt jak w CSS: 0° = w górę, 90° = w prawo; długość linii gradientu jak w CSS dla kwadratu.
      const rad = (fill.angle * Math.PI) / 180;
      const dx = Math.sin(rad);
      const dy = -Math.cos(rad);
      const half = ((Math.abs(dx) + Math.abs(dy)) * CANVAS) / 2;
      const c = CANVAS / 2;
      const gradient = ctx.createLinearGradient(
        c - dx * half,
        c - dy * half,
        c + dx * half,
        c + dy * half,
      );
      addStops(gradient, fill.colors);
      ctx.fillStyle = gradient;
      break;
    }
    case 'radial': {
      // Środek lekko nad środkiem grafiki – tam jest napis.
      const gradient = ctx.createRadialGradient(540, 454, 0, 540, 454, 810);
      addStops(gradient, fill.colors);
      ctx.fillStyle = gradient;
      break;
    }
    case 'mesh':
      ctx.fillStyle = fill.base;
      ctx.fillRect(0, 0, CANVAS, CANVAS);
      for (const blob of fill.blobs) {
        const x = blob.x * CANVAS;
        const y = blob.y * CANVAS;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, blob.r * CANVAS);
        gradient.addColorStop(0, blob.color);
        gradient.addColorStop(1, withAlpha(blob.color, 0));
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, CANVAS, CANVAS);
      }
      return;
  }
  ctx.fillRect(0, 0, CANVAS, CANVAS);
}

function addStops(gradient: CanvasGradient, colors: readonly string[]) {
  colors.forEach((color, i) => gradient.addColorStop(i / (colors.length - 1), color));
}

// ---------- Zdjęcie ----------

const FOCUS: Record<Focus, [number, number]> = {
  'top-left': [0, 0],
  top: [0.5, 0],
  'top-right': [1, 0],
  left: [0, 0.5],
  center: [0.5, 0.5],
  right: [1, 0.5],
  'bottom-left': [0, 1],
  bottom: [0.5, 1],
  'bottom-right': [1, 1],
};

/** Kadr „cover” do kwadratu `size` z punktem skupienia + rozmycie. */
function croppedImage(
  source: HTMLCanvasElement,
  focus: Focus,
  blurPx: number,
  size: number,
): HTMLCanvasElement {
  const side = Math.min(source.width, source.height);
  const [fx, fy] = FOCUS[focus];
  const crop = createCanvas(size);
  const ctx = context2d(crop);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    source,
    (source.width - side) * fx,
    (source.height - side) * fy,
    side,
    side,
    0,
    0,
    size,
    size,
  );
  return blurPx > 0 ? blurred(crop, (blurPx * size) / CANVAS) : crop;
}

/** Średni kolor warstwy (pomniejszenie do 8×8). Blob z urządzenia jest same-origin – OK. */
function meanColor(canvas: HTMLCanvasElement): string {
  const small = createCanvas(8);
  const ctx = context2d(small);
  ctx.drawImage(canvas, 0, 0, 8, 8);
  const { data } = ctx.getImageData(0, 0, 8, 8);
  const sum = [0, 0, 0];
  for (let i = 0; i < data.length; i += 4) {
    sum[0]! += data[i]!;
    sum[1]! += data[i + 1]!;
    sum[2]! += data[i + 2]!;
  }
  return rgbToHex(sum.map((c) => c / 64) as [number, number, number]);
}

// ---------- Warstwa ----------

function buildLayer(
  bg: BackgroundDesign,
  image: BackgroundImage | null,
  size: number,
): BackgroundLayer {
  const canvas = createCanvas(size);
  const ctx = context2d(canvas);
  ctx.scale(size / CANVAS, size / CANVAS);

  const preset = presetById(bg.presetId);
  let tone: Tone;
  let accent: string | null = null;
  let busy: Busy;

  if (bg.source === 'image' && image) {
    const { focus, blur, dim } = bg.image;
    ctx.drawImage(croppedImage(image.source, focus, blur, size), 0, 0, CANVAS, CANVAS);
    if (dim !== 0) {
      ctx.fillStyle = dim < 0 ? `rgba(0,0,0,${-dim / 100})` : `rgba(255,255,255,${dim / 100})`;
      ctx.fillRect(0, 0, CANVAS, CANVAS);
    }
    tone = pickTextColor(meanColor(canvas)) === INK ? 'light' : 'dark';
    busy = 'strong';
  } else if (bg.source === 'custom') {
    drawFill(ctx, bg.custom);
    tone = toneOfFill(bg.custom);
    busy = bg.custom.kind === 'solid' ? 'none' : 'soft';
  } else {
    drawFill(ctx, preset.fill);
    tone = preset.tone;
    accent = preset.accent;
    busy = preset.fill.kind === 'solid' ? 'none' : 'soft';
  }

  if (bg.textColor !== 'auto') {
    const forced: Tone = bg.textColor === 'dark' ? 'light' : 'dark';
    if (forced !== tone) accent = null; // akcent presetu dobrany do jego tonu
    tone = forced;
  }
  const text = textColorFor(tone);
  // Własne tło/zdjęcie: akcent = kolor tekstu (pewny kontrast z tłem).
  accent ??= text;

  drawPattern(ctx, bg.pattern, text, bg.patternOpacity, bg.seed);
  if (bg.grain) drawGrain(ctx, bg.seed);
  drawFrame(ctx, bg.frame, { tone, text, accent });

  let blurredCanvas: HTMLCanvasElement | undefined;
  return {
    canvas,
    tone,
    text,
    accent,
    busy,
    blurred: () => (blurredCanvas ??= blurred(canvas, (28 * size) / CANVAS)),
  };
}

/** Cache LRU: duże warstwy (podgląd) zajmują ~4,7 MB każda – trzymamy tylko 2. */
const cache = new Map<string, BackgroundLayer>();
const LIMIT = { large: 2, small: 40 } as const;

export function getBackgroundLayer(
  bg: BackgroundDesign,
  image: BackgroundImage | null,
  size: number,
): BackgroundLayer {
  const key = `${size}|${bg.source === 'image' ? (image?.id ?? 0) : '-'}|${JSON.stringify(bg)}`;
  const hit = cache.get(key);
  if (hit) {
    cache.delete(key);
    cache.set(key, hit); // na koniec kolejki = najświeższy
    return hit;
  }
  const layer = buildLayer(bg, image, size);
  cache.set(key, layer);
  const large = size >= CANVAS;
  const sameKind = [...cache.keys()].filter((k) => Number(k.split('|')[0]) >= CANVAS === large);
  const limit = large ? LIMIT.large : LIMIT.small;
  for (const old of sameKind.slice(0, Math.max(0, sameKind.length - limit))) cache.delete(old);
  return layer;
}

/**
 * Plik z urządzenia → canvas z krótszym bokiem 1080 px (większe zdjęcia z telefonu nie zjadają
 * pamięci i nie są skalowane przy każdym renderze). Orientację EXIF uwzględnia createImageBitmap.
 */
export async function decodeBackgroundFile(file: File): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, CANVAS / Math.min(bitmap.width, bitmap.height));
    const canvas = createCanvas(bitmap.width * scale, bitmap.height * scale);
    const ctx = context2d(canvas);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    bitmap.close();
  }
}
