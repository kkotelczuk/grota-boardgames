/**
 * Fonty napisu na grafice. Ładowane tylko na stronie generatora (FontFace API), a nie
 * w global.css – reszta serwisu nie płaci za ~300 KB krojów ozdobnych.
 *
 * Polskie znaki sprawdzone 2026-10-06 (cmap latin + latin-ext). Odrzucone: Rye i Ewert
 * (brak ą/ę/ś/ź/ż), Pacifico i Dancing Script (błędny glif „ł”).
 */
import type { HeadingFontId } from './design';
import fascinateLatin from '@fontsource/fascinate-inline/files/fascinate-inline-latin-400-normal.woff2?url';
import fascinateLatinExt from '@fontsource/fascinate-inline/files/fascinate-inline-latin-ext-400-normal.woff2?url';
import bricolageLatin from '@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2?url';
import bricolageLatinExt from '@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-ext-wght-normal.woff2?url';
import antonLatin from '@fontsource/anton/files/anton-latin-400-normal.woff2?url';
import antonLatinExt from '@fontsource/anton/files/anton-latin-ext-400-normal.woff2?url';
import eliteLatin from '@fontsource/special-elite/files/special-elite-latin-400-normal.woff2?url';
import eliteLatinExt from '@fontsource/special-elite/files/special-elite-latin-ext-400-normal.woff2?url';
import caveatLatin from '@fontsource-variable/caveat/files/caveat-latin-wght-normal.woff2?url';
import caveatLatinExt from '@fontsource-variable/caveat/files/caveat-latin-ext-wght-normal.woff2?url';
import lobsterLatin from '@fontsource/lobster/files/lobster-latin-400-normal.woff2?url';
import lobsterLatinExt from '@fontsource/lobster/files/lobster-latin-ext-400-normal.woff2?url';

/** Zakresy jak w CSS Fontsource – przeglądarka pobiera latin-ext dopiero przy polskich znakach. */
const LATIN =
  'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const LATIN_EXT =
  'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';

export interface HeadingFont {
  id: HeadingFontId;
  /** Nazwa rodziny w canvasie i CSS (prefiks `Gen` – bez konfliktu z fontem systemowym). */
  family: string;
  weight: number;
  /** Zakres osi wagi dla krojów zmiennych (deskryptor FontFace). */
  weightRange?: string;
  /** Mnożnik rozmiaru: kroje różnią się szerokością i wysokością małych liter. */
  scale: number;
  uppercase?: boolean;
  /** Brak = font ładowany globalnie przez global.css (Fraunces). */
  files?: { latin: string; latinExt: string };
  fallback: string;
}

export const HEADING_FONTS: Record<HeadingFontId, HeadingFont> = {
  grota: {
    id: 'grota',
    family: 'Gen Fascinate Inline',
    weight: 400,
    scale: 0.95,
    files: { latin: fascinateLatin, latinExt: fascinateLatinExt },
    fallback: 'Georgia, serif',
  },
  classic: {
    id: 'classic',
    family: 'Fraunces Variable',
    weight: 600,
    scale: 1,
    fallback: 'Georgia, serif',
  },
  modern: {
    id: 'modern',
    family: 'Gen Bricolage Grotesque',
    weight: 800,
    weightRange: '200 800',
    scale: 1,
    files: { latin: bricolageLatin, latinExt: bricolageLatinExt },
    fallback: 'system-ui, sans-serif',
  },
  strong: {
    id: 'strong',
    family: 'Gen Anton',
    weight: 400,
    scale: 1.25,
    uppercase: true,
    files: { latin: antonLatin, latinExt: antonLatinExt },
    fallback: 'Impact, sans-serif',
  },
  typewriter: {
    id: 'typewriter',
    family: 'Gen Special Elite',
    weight: 400,
    scale: 0.95,
    files: { latin: eliteLatin, latinExt: eliteLatinExt },
    fallback: '"Courier New", monospace',
  },
  handwritten: {
    id: 'handwritten',
    family: 'Gen Caveat',
    weight: 700,
    weightRange: '400 700',
    scale: 1.3,
    files: { latin: caveatLatin, latinExt: caveatLatinExt },
    fallback: 'cursive',
  },
  retro: {
    id: 'retro',
    family: 'Gen Lobster',
    weight: 400,
    scale: 1.05,
    files: { latin: lobsterLatin, latinExt: lobsterLatinExt },
    fallback: 'cursive',
  },
};

/** Podpisy pod okładkami. */
export const LABEL_FONT = {
  family: 'Inter Variable',
  weight: 600,
  fallback: 'system-ui, sans-serif',
};

/** Wartość `ctx.font` / CSS `font`. */
export const cssFont = (
  font: { family: string; weight: number; fallback: string },
  size: number,
): string => `${font.weight} ${size}px "${font.family}", ${font.fallback}`;

/** Wartość CSS `font-family` (np. podgląd fontu w panelu). */
export const cssFamily = (font: HeadingFont): string => `"${font.family}", ${font.fallback}`;

const SAMPLE = 'Aąęłóśźż';
const loading = new Map<string, Promise<void>>();

/**
 * Rejestruje i pobiera font (oba podzbiory). Canvas nie czeka na fonty sam – bez tego
 * narysowałby font zastępczy. Błąd sieci → po prostu font zastępczy, render się nie wywala.
 */
export function ensureFont(font: HeadingFont | typeof LABEL_FONT): Promise<void> {
  let promise = loading.get(font.family);
  if (!promise) {
    const files = 'files' in font ? font.files : undefined;
    if (files) {
      const descriptors = (unicodeRange: string) => ({
        weight: ('weightRange' in font && font.weightRange) || String(font.weight),
        unicodeRange,
      });
      const faces = [
        new FontFace(font.family, `url(${files.latin})`, descriptors(LATIN)),
        new FontFace(font.family, `url(${files.latinExt})`, descriptors(LATIN_EXT)),
      ];
      faces.forEach((face) => document.fonts.add(face));
      promise = Promise.all(faces.map((face) => face.load())).then(
        () => undefined,
        () => undefined,
      );
    } else {
      // Font z global.css: drugi argument wymusza pobranie podzbioru latin-ext (polskie znaki).
      promise = document.fonts.load(cssFont(font, 64), SAMPLE).then(
        () => undefined,
        () => undefined,
      );
    }
    loading.set(font.family, promise);
  }
  return promise;
}

export const ensureHeadingFont = (id: HeadingFontId): Promise<void> =>
  ensureFont(HEADING_FONTS[id]);

/** Wszystkie kroje naraz – dla miniatur w panelu (każda nazwa stylu swoim fontem). */
export const preloadHeadingFonts = (): Promise<void> =>
  Promise.all(Object.values(HEADING_FONTS).map(ensureFont)).then(() => undefined);
