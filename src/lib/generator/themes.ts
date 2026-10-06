/**
 * Motywy – gotowe projekty ustawiane jednym kliknięciem. Nazwy w i18n (`t.generator.themes[id]`).
 * Motyw nie jest zapisywany w projekcie: „zaznaczony” jest ten, któremu projekt jest równy
 * (`matchingTheme`) – po dowolnej zmianie zaznaczenie samo znika.
 */
import { deepEqual, type BackgroundDesign, type PosterDesign } from './design';
import { presetById } from './presets';

export const THEME_IDS = ['grota', 'felt', 'aurora', 'pastel', 'photos', 'neon', 'poster'] as const;
export type ThemeId = (typeof THEME_IDS)[number];

const background = (
  presetId: string,
  extra: Partial<Omit<BackgroundDesign, 'presetId' | 'source'>> = {},
): BackgroundDesign => ({
  source: 'preset',
  presetId,
  custom: structuredClone(presetById(presetId).fill),
  image: { focus: 'center', blur: 0, dim: 0 },
  pattern: 'none',
  patternOpacity: 0.4,
  grain: false,
  frame: 'none',
  textColor: 'auto',
  seed: 20261006,
  ...extra,
});

export const THEMES: Record<ThemeId, PosterDesign> = {
  grota: {
    background: background('paper-glow', { grain: true, frame: 'double' }),
    heading: { font: 'grota', effect: 'none', align: 'left' },
    tiles: { style: 'card', radius: 'm', shadow: true, labels: true },
  },
  felt: {
    background: background('felt-table', { grain: true, frame: 'corners' }),
    heading: { font: 'classic', effect: 'shadow', align: 'center' },
    tiles: { style: 'classic', radius: 'm', shadow: true, labels: true },
  },
  aurora: {
    background: background('aurora', { grain: true }),
    heading: { font: 'modern', effect: 'none', align: 'left' },
    tiles: { style: 'glass', radius: 'l', shadow: true, labels: true },
  },
  pastel: {
    background: background('pastel-mesh', { grain: true, frame: 'rounded' }),
    heading: { font: 'modern', effect: 'none', align: 'center' },
    tiles: { style: 'glass', radius: 'l', shadow: true, labels: true },
  },
  photos: {
    background: background('paper', { pattern: 'dots', patternOpacity: 0.4, grain: true }),
    heading: { font: 'handwritten', effect: 'none', align: 'center' },
    tiles: { style: 'polaroid', radius: 's', shadow: true, labels: true },
  },
  neon: {
    background: background('night', { pattern: 'grid', patternOpacity: 0.3 }),
    heading: { font: 'retro', effect: 'neon', align: 'center' },
    tiles: { style: 'overlay', radius: 'm', shadow: true, labels: true },
  },
  poster: {
    background: background('mustard', { pattern: 'diagonal', patternOpacity: 0.3, frame: 'mat' }),
    heading: { font: 'strong', effect: 'highlight', align: 'left' },
    tiles: { style: 'card', radius: 's', shadow: true, labels: true },
  },
};

export const DEFAULT_THEME_ID: ThemeId = 'grota';

/** Świeża kopia motywu – projekt jest potem modyfikowany, motyw musi zostać nietknięty. */
export const themeDesign = (id: ThemeId): PosterDesign => structuredClone(THEMES[id]);

export const defaultDesign = (): PosterDesign => themeDesign(DEFAULT_THEME_ID);

export function matchingTheme(design: PosterDesign): ThemeId | null {
  return THEME_IDS.find((id) => deepEqual(THEMES[id], design)) ?? null;
}
