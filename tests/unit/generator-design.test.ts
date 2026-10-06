import { describe, expect, it } from 'vitest';
import {
  MIN_STOP_CONTRAST,
  averageColor,
  changeFillKind,
  contrast,
  oklchToHex,
  pickTextColor,
  randomFill,
  textColorFor,
} from '@/lib/generator/color';
import { INK, LIGHT, designSchema, fillColors, type PosterDesign } from '@/lib/generator/design';
import { HEADING_FONTS } from '@/lib/generator/fonts';
import { BACKGROUND_PRESETS, estimateTone } from '@/lib/generator/presets';
import { mulberry32 } from '@/lib/generator/random';
import { parseDesign } from '@/lib/generator/storage';
import { THEMES, THEME_IDS, defaultDesign, matchingTheme } from '@/lib/generator/themes';
import { FRAME_DEPTH } from '@/lib/generator/render/frames';
import { FRAME_BAND, GRID, HEADER, LOGO, CANVAS } from '@/lib/generator/layout';
import { useTranslations } from '@/i18n';

const pl = useTranslations('pl');
const en = useTranslations('en');

describe('color', () => {
  it('computes WCAG contrast like docs/design.md (ink on paper = 15.58)', () => {
    expect(contrast('#1b1916', '#f6f1e7')).toBeCloseTo(15.58, 1);
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
  });

  it('converts OKLCH to sRGB hex', () => {
    expect(oklchToHex(1, 0, 0)).toBe('#ffffff');
    expect(oklchToHex(0, 0, 0)).toBe('#000000');
    // oklch(62.8% 0.2577 29.23) = czysty czerwony sRGB
    expect(oklchToHex(0.628, 0.2577, 29.23)).toBe('#ff0000');
  });

  it('picks the text colour with better contrast', () => {
    expect(pickTextColor('#f6f1e7')).toBe(INK);
    expect(pickTextColor('#1e5a44')).toBe(LIGHT);
  });

  it('keeps colours when switching the custom fill type', () => {
    const rng = mulberry32(1);
    const solid = { kind: 'solid', color: '#336699' } as const;
    const linear = changeFillKind(solid, 'linear', rng);
    expect(linear.kind).toBe('linear');
    expect(fillColors(linear)[0]).toBe('#336699');
    expect(fillColors(linear)).toHaveLength(2);
    const mesh = changeFillKind(linear, 'mesh', rng);
    expect(mesh).toMatchObject({ kind: 'mesh', base: '#336699' });
    expect(changeFillKind(mesh, 'solid', rng)).toEqual(solid);
  });
});

describe('randomFill', () => {
  it.each(Array.from({ length: 200 }, (_, i) => i + 1))(
    'seed %i: valid colours with readable text',
    (seed) => {
      const fill = randomFill(mulberry32(seed));
      const colors = fillColors(fill);
      expect(colors.length).toBeGreaterThanOrEqual(2);
      expect(colors.length).toBeLessThanOrEqual(4);
      colors.forEach((c) => expect(c).toMatch(/^#[0-9a-f]{6}$/));
      // Ton wynika z kolorów, więc sprawdzamy oba warianty – jeden musi przejść dla wszystkich.
      const readable = [INK, LIGHT].some((text) =>
        colors.every((c) => contrast(text, c) >= MIN_STOP_CONTRAST),
      );
      expect(readable).toBe(true);
    },
  );

  it('is deterministic for the same seed', () => {
    expect(randomFill(mulberry32(42))).toEqual(randomFill(mulberry32(42)));
  });
});

describe('background presets', () => {
  it.each(BACKGROUND_PRESETS.map((p) => [p.id, p] as const))('%s: readable text', (_, preset) => {
    const text = textColorFor(preset.tone);
    const colors = fillColors(preset.fill);
    for (const color of colors) expect(contrast(text, color)).toBeGreaterThanOrEqual(3);
    expect(contrast(text, averageColor(colors))).toBeGreaterThanOrEqual(4.5);
  });

  it('have unique ids and names in both languages', () => {
    const ids = BACKGROUND_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(pl.generator.backgrounds[id]).toBeTruthy();
      expect(en.generator.backgrounds[id]).toBeTruthy();
    }
  });
});

describe('frames', () => {
  it('stay inside the frame band, away from heading, grid and logo', () => {
    for (const depth of Object.values(FRAME_DEPTH)) expect(depth).toBeLessThanOrEqual(FRAME_BAND);
    const gap = 8;
    expect(HEADER.x).toBeGreaterThanOrEqual(FRAME_BAND + gap);
    expect(HEADER.y).toBeGreaterThanOrEqual(FRAME_BAND + gap);
    expect(GRID.x).toBeGreaterThanOrEqual(FRAME_BAND + gap);
    expect(CANVAS - (LOGO.y + LOGO.height)).toBeGreaterThanOrEqual(FRAME_BAND + gap);
    expect(CANVAS - LOGO.right).toBeGreaterThanOrEqual(FRAME_BAND + gap);
  });
});

describe('themes and storage', () => {
  it('every theme passes the storage schema and has a name', () => {
    for (const id of THEME_IDS) {
      expect(designSchema.safeParse(THEMES[id]).success).toBe(true);
      expect(pl.generator.themes[id]).toBeTruthy();
    }
  });

  it('the default design is the „Grota” theme', () => {
    expect(matchingTheme(defaultDesign())).toBe('grota');
  });

  it('a theme stops matching after any change', () => {
    const design = defaultDesign();
    const changed: PosterDesign = { ...design, tiles: { ...design.tiles, shadow: false } };
    expect(matchingTheme(changed)).toBeNull();
  });

  it('round-trips through JSON regardless of key order', () => {
    const design = THEMES.aurora;
    const reordered = JSON.stringify({
      tiles: design.tiles,
      heading: design.heading,
      background: design.background,
    });
    expect(matchingTheme(parseDesign(reordered))).toBe('aurora');
  });

  it('falls back to the default for broken or unknown data', () => {
    expect(parseDesign(null)).toEqual(defaultDesign());
    expect(parseDesign('{nie json')).toEqual(defaultDesign());
    expect(parseDesign(JSON.stringify({ background: 1 }))).toEqual(defaultDesign());
    const unknownPreset = structuredClone(THEMES.grota);
    unknownPreset.background.presetId = 'nie-ma-takiego';
    expect(parseDesign(JSON.stringify(unknownPreset))).toEqual(defaultDesign());
  });

  it('does not restore a photo background (the file is not stored)', () => {
    const design = structuredClone(THEMES.grota);
    design.background.source = 'image';
    expect(parseDesign(JSON.stringify(design)).background.source).toBe('preset');
  });

  it('estimates the background tone without drawing', () => {
    expect(estimateTone(THEMES.grota.background)).toBe('light');
    expect(estimateTone(THEMES.neon.background)).toBe('dark');
    expect(estimateTone({ ...THEMES.neon.background, textColor: 'dark' })).toBe('light');
    expect(estimateTone({ ...THEMES.neon.background, source: 'image' })).toBeNull();
  });
});

describe('heading fonts', () => {
  it('every font has a name and – unless global – both subsets', () => {
    for (const font of Object.values(HEADING_FONTS)) {
      expect(pl.generator.fonts[font.id]).toBeTruthy();
      expect(en.generator.fonts[font.id]).toBeTruthy();
      if (font.files) {
        expect(font.files.latin).toMatch(/latin-(400|wght)/);
        expect(font.files.latinExt).toMatch(/latin-ext/);
      }
    }
  });
});
