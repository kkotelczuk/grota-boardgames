/**
 * Odchudzony model gry dla wysp Vue (lista, ulubione). Bez opisów – trafia do HTML jako
 * zserializowane propsy, więc każdy bajt się liczy. Moduł jest „client-safe” (bez node:fs, astro:*).
 */
export interface CoverImage {
  /** Fallback WebP (`<img>`). */
  src: string;
  srcset: string;
  /** AVIF (`<source>`) – ~2× mniejszy od WebP przy tej samej szerokości. */
  avifSrcset: string;
  width: number;
  height: number;
  /** Średni kolor okładki (`#rrggbb`) – placeholder, zanim obraz dojdzie z sieci. */
  color: string;
}

export interface GameIndexItem {
  id: string;
  href: string;
  kind: 'base' | 'expansion';
  /** Tytuł główny w bieżącym języku (PL: wydanie polskie, EN: BGG). */
  title: string;
  /** Tytuł drugorzędny (PL: oryginał, EN: polskie wydanie) albo `null`, gdy taki sam. */
  subtitle: string | null;
  /** Znormalizowane tytuły + nazwy alternatywne – do wyszukiwania bez polskich znaków. */
  search: string;
  minPlayers: number | null;
  maxPlayers: number | null;
  bestPlayers: number[];
  minPlayTime: number | null;
  maxPlayTime: number | null;
  minAge: number | null;
  weight: number | null;
  rating: number | null;
  rank: number | null;
  year: number | null;
  languages: string[];
  hasPolishRules: boolean;
  copies: number;
  categories: number[];
  mechanics: number[];
  baseGameIds: string[];
  expansionIds: string[];
  cover: CoverImage | null;
}

export interface TermOption {
  id: number;
  label: string;
  count: number;
}

export interface FilterOptions {
  languages: { code: string; label: string; count: number }[];
  categories: TermOption[];
  mechanics: TermOption[];
}

export const PLAYER_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
/** Wiek najmłodszego gracza – gra pasuje, gdy jej minimalny wiek ≤ wybranej wartości. */
export const AGE_OPTIONS = [4, 6, 8, 10, 12, 14] as const;

export type TimeBucket = 'short' | 'medium' | 'long' | 'epic';
export const TIME_BUCKETS: TimeBucket[] = ['short', 'medium', 'long', 'epic'];

/** Typowy czas partii = górna granica (BGG podaje często przedział). */
export function timeBucket(
  game: Pick<GameIndexItem, 'minPlayTime' | 'maxPlayTime'>,
): TimeBucket | null {
  const time = game.maxPlayTime ?? game.minPlayTime;
  if (time == null) return null;
  if (time <= 30) return 'short';
  if (time <= 60) return 'medium';
  if (time <= 120) return 'long';
  return 'epic';
}

export type WeightBucket = 'light' | 'medium' | 'heavy';
export const WEIGHT_BUCKETS: WeightBucket[] = ['light', 'medium', 'heavy'];

export function weightBucket(weight: number | null): WeightBucket | null {
  if (weight == null) return null;
  if (weight < 2) return 'light';
  if (weight <= 3) return 'medium';
  return 'heavy';
}

/** „2–4”, „2”, `null` gdy brak danych. */
export function formatRange(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null;
  if (min == null || max == null || min === max) return String(min ?? max);
  return `${min}–${max}`;
}

/** Zwija listę liczb w zakresy: [2,3,4,6] → „2–4, 6”. */
export function formatNumberList(values: number[]): string {
  const sorted = [...new Set(values)].sort((a, b) => a - b);
  const parts: string[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const start = sorted[i]!;
    let end = start;
    while (sorted[i + 1] === end + 1) end = sorted[++i]!;
    parts.push(end > start ? `${start}–${end}` : String(start));
  }
  return parts.join(', ');
}
