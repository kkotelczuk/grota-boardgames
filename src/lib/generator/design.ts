/**
 * Projekt grafiki („Wygląd”): tło, napis, kafelki. Moduł client-safe (bez astro:*, node:*).
 * Jedno źródło prawdy dla panelu, renderera i zapisu w localStorage.
 */
import * as z from 'zod/mini';

/** Ton tła: jasne tło → ciemny tekst i czarne logo; ciemne → odwrotnie. */
export type Tone = 'light' | 'dark';

export const FILL_KINDS = ['solid', 'linear', 'radial', 'mesh'] as const;
export type FillKind = (typeof FILL_KINDS)[number];

export interface MeshBlob {
  /** Środek i promień jako ułamek boku grafiki (0–1). */
  x: number;
  y: number;
  r: number;
  color: string;
}

export type Fill =
  | { kind: 'solid'; color: string }
  /** 2–4 kolory, kąt jak w CSS: 0° = w górę, 90° = w prawo. */
  | { kind: 'linear'; colors: string[]; angle: number }
  /** Od środka (lekko nad środkiem grafiki) do brzegów – winieta. */
  | { kind: 'radial'; colors: string[] }
  /** „Mesh/aurora”: baza + miękkie plamy koloru (radialne gradienty do przezroczystości). */
  | { kind: 'mesh'; base: string; blobs: MeshBlob[] };

export const FOCUS_POINTS = [
  'top-left',
  'top',
  'top-right',
  'left',
  'center',
  'right',
  'bottom-left',
  'bottom',
  'bottom-right',
] as const;
export type Focus = (typeof FOCUS_POINTS)[number];

export const PATTERNS = ['none', 'dots', 'grid', 'hex', 'pips', 'diagonal'] as const;
export type Pattern = (typeof PATTERNS)[number];

export const FRAMES = ['none', 'line', 'double', 'rounded', 'mat', 'corners', 'dice'] as const;
export type Frame = (typeof FRAMES)[number];

export const TEXT_COLORS = ['auto', 'dark', 'light'] as const;
/** Kolor napisów (a nie ton tła!): `dark` = ciemny tekst, czyli tło jasne. */
export type TextColor = (typeof TEXT_COLORS)[number];

export interface BackgroundDesign {
  source: 'preset' | 'custom' | 'image';
  presetId: string;
  custom: Fill;
  /** Ustawienia zdjęcia. Sam plik trzyma GeneratorApp – nie da się go zserializować. */
  image: { focus: Focus; blur: number; dim: number };
  pattern: Pattern;
  /** 0–1, mapowane na krycie wzoru 0.03–0.15. */
  patternOpacity: number;
  grain: boolean;
  frame: Frame;
  textColor: TextColor;
  /** Dla wzoru „kostki”, szumu i układu plam mesh – stabilny między renderami. */
  seed: number;
}

export const HEADING_FONT_IDS = [
  'grota',
  'classic',
  'modern',
  'strong',
  'typewriter',
  'handwritten',
  'retro',
] as const;
export type HeadingFontId = (typeof HEADING_FONT_IDS)[number];

export const HEADING_EFFECTS = ['none', 'shadow', 'neon', 'highlight', 'glass'] as const;
export type HeadingEffect = (typeof HEADING_EFFECTS)[number];

export const ALIGNS = ['left', 'center'] as const;

export interface HeadingDesign {
  font: HeadingFontId;
  effect: HeadingEffect;
  align: (typeof ALIGNS)[number];
}

export const TILE_STYLES = ['classic', 'card', 'glass', 'polaroid', 'overlay'] as const;
export type TileStyle = (typeof TILE_STYLES)[number];

export const RADII = ['none', 's', 'm', 'l'] as const;
export type Radius = (typeof RADII)[number];
/** Promień jako ułamek boku karty. */
export const RADIUS_RATIO: Record<Radius, number> = { none: 0, s: 0.05, m: 0.1, l: 0.16 };

export interface TilesDesign {
  style: TileStyle;
  radius: Radius;
  shadow: boolean;
  /** Nazwy gier pod/na okładkach. */
  labels: boolean;
}

export interface PosterDesign {
  background: BackgroundDesign;
  heading: HeadingDesign;
  tiles: TilesDesign;
}

/** Kolory na grafice – na sztywno, grafika nie zależy od motywu strony. */
export const INK = '#1b1916';
export const LIGHT = '#fffcf5';

// ---------- Schemat (localStorage) ----------

const hex = z.string().check(z.regex(/^#[0-9a-f]{6}$/i));
const unit = z.number().check(z.gte(0), z.lte(1));

const fillSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('solid'), color: hex }),
  z.object({
    kind: z.literal('linear'),
    colors: z.array(hex).check(z.minLength(2), z.maxLength(4)),
    angle: z.number(),
  }),
  z.object({
    kind: z.literal('radial'),
    colors: z.array(hex).check(z.minLength(2), z.maxLength(4)),
  }),
  z.object({
    kind: z.literal('mesh'),
    base: hex,
    blobs: z
      .array(z.object({ x: unit, y: unit, r: unit, color: hex }))
      .check(z.minLength(1), z.maxLength(4)),
  }),
]);

export const designSchema = z.object({
  background: z.object({
    source: z.enum(['preset', 'custom', 'image']),
    presetId: z.string(),
    custom: fillSchema,
    image: z.object({
      focus: z.enum(FOCUS_POINTS),
      blur: z.number().check(z.gte(0), z.lte(30)),
      dim: z.number().check(z.gte(-60), z.lte(60)),
    }),
    pattern: z.enum(PATTERNS),
    patternOpacity: unit,
    grain: z.boolean(),
    frame: z.enum(FRAMES),
    textColor: z.enum(TEXT_COLORS),
    seed: z.number(),
  }),
  heading: z.object({
    font: z.enum(HEADING_FONT_IDS),
    effect: z.enum(HEADING_EFFECTS),
    align: z.enum(ALIGNS),
  }),
  tiles: z.object({
    style: z.enum(TILE_STYLES),
    radius: z.enum(RADII),
    shadow: z.boolean(),
    labels: z.boolean(),
  }),
});

/** Kolory wypełnienia (do kontrastu, akcentu i średniego koloru). */
export function fillColors(fill: Fill): string[] {
  switch (fill.kind) {
    case 'solid':
      return [fill.color];
    case 'linear':
    case 'radial':
      return fill.colors;
    case 'mesh':
      return [fill.base, ...fill.blobs.map((blob) => blob.color)];
  }
}

/** Głębokie porównanie zwykłych obiektów JSON (kolejność kluczy bez znaczenia). */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((key) =>
    deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]),
  );
}
