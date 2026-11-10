/**
 * Motywy rozkładu: tło + wygląd kart. Tła mają już wtopione napisy („Grota”, „Rozkład Jazdy”,
 * adres, logo) – generator dorysowuje tylko datę i karty.
 *
 * Wszystkie pozycje na karcie to ułamki jej szerokości/wysokości (zmierzone na grafikach kart),
 * więc karta może mieć dowolny rozmiar.
 */
import type { FontSpec } from '@/lib/generator/fonts';
import { backgroundUrl, cardUrl } from './assets';
import { SANS, SANS_BOLD, SERIF, SMALL_CAPS } from './fonts';
import type { RowLayout } from './layout';
import type { ThemeId } from './plan';

interface TextSpot {
  /** Środek napisu w pionie (ułamek wysokości karty). */
  cy: number;
  /** Rozmiar fontu i maks. szerokość (ułamki szerokości karty); za długi napis jest zmniejszany. */
  size: number;
  maxW: number;
  color: string;
}

interface Box {
  cy: number;
  maxW: number;
  maxH: number;
}

export interface Face {
  src: string;
  /** Wysokość / szerokość karty. */
  ratio: number;
  /**
   * Wycinek pliku [x, y, w, h] w px i promień narożnika (ułamek szerokości). Dla kart, których
   * tła nie dało się odróżnić od białego marginesu – zamiast przezroczystości przycinamy kształtem.
   */
  crop?: { rect: [number, number, number, number]; radius: number };
  opacity: number;
  name: TextSpot & { abbreviated: boolean };
  /** Brak = na tej karcie nie rysujemy danego elementu. */
  icon?: Box;
  image?: Box;
  caption?: TextSpot;
  hours?: TextSpot & { stacked: boolean };
}

export interface Theme {
  id: ThemeId;
  label: string;
  background: string;
  row: RowLayout;
  /** Data w nagłówku: lewa krawędź, środek w pionie, rozmiar; `prefix` dokleja się przed zakresem. */
  date: { x: number; cy: number; size: number; font: FontSpec; prefix: string; shadow: boolean };
  fonts: { name: FontSpec; hours: FontSpec };
  /** Miękki cień pod ikonami konturowymi (kolorowe ikony letnie go nie mają). */
  iconShadow: boolean;
  cardShadow: boolean;
  active: Face;
  inactive: Face;
}

const CARD_ROW: RowLayout = {
  left: 28,
  right: 1892,
  centerY: 482,
  gap: 6,
  inactiveWidth: 212,
  maxActiveWidth: 310,
  additionalRotation: (14 * Math.PI) / 180,
  additionalLift: 0.15,
  additionalShift: 0.07,
  uniform: false,
};

const INK = '#141218';

/** Karta „papierowa” (klasyczna/jesienna): linia pod nazwą dnia jest częścią grafiki. */
const paperFace = (name: string, width: number, height: number, nameCy: number): Face => ({
  src: cardUrl(name),
  ratio: height / width,
  opacity: 1,
  name: { cy: nameCy, size: 0.15, maxW: 0.8, color: INK, abbreviated: false },
  icon: { cy: 0.51, maxW: 0.66, maxH: 0.42 },
  image: { cy: 0.51, maxW: 0.72, maxH: 0.5 },
  caption: { cy: 0.775, size: 0.095, maxW: 0.82, color: INK },
  hours: { cy: 0.878, size: 0.132, maxW: 0.84, color: INK, stacked: false },
});

/** Karta z ozdobną ramką (wiosna/zima): treść musi ominąć kwiaty i sople w narożnikach. */
const framedFace = (name: string, width: number, height: number, ink: string): Face => ({
  src: cardUrl(name),
  ratio: height / width,
  opacity: 1,
  name: { cy: 0.135, size: 0.125, maxW: 0.7, color: ink, abbreviated: false },
  icon: { cy: 0.46, maxW: 0.6, maxH: 0.38 },
  image: { cy: 0.47, maxW: 0.62, maxH: 0.44 },
  caption: { cy: 0.7, size: 0.085, maxW: 0.68, color: ink },
  hours: { cy: 0.79, size: 0.115, maxW: 0.68, color: ink, stacked: false },
});

/** Karta dnia nieaktywnego: mniejsza, wyblakła, tylko skrót dnia. */
const fadedFace = (
  name: string,
  width: number,
  height: number,
  label: { cy: number; size: number },
  color: string,
): Face => ({
  src: cardUrl(name),
  ratio: height / width,
  opacity: 0.82,
  name: { ...label, maxW: 0.7, color, abbreviated: true },
});

/** Lato: wszystkie karty równe; nieaktywna ma czerwone pole zamiast godzin. */
const summerFace = (name: string, hours: boolean): Face => ({
  src: cardUrl(name),
  ratio: 327 / 144,
  crop: { rect: [8, 12, 144, 327], radius: 0.07 },
  opacity: 1,
  name: { cy: 0.066, size: 0.098, maxW: 0.9, color: '#ffffff', abbreviated: false },
  icon: { cy: 0.33, maxW: 0.74, maxH: 0.3 },
  image: { cy: 0.33, maxW: 0.84, maxH: 0.36 },
  caption: { cy: 0.535, size: 0.088, maxW: 0.9, color: '#0d1b3e' },
  ...(hours && { hours: { cy: 0.83, size: 0.158, maxW: 0.8, color: '#0d1b3e', stacked: true } }),
});

export const THEMES: Record<ThemeId, Theme> = {
  autumn: {
    id: 'autumn',
    label: 'Jesień',
    background: backgroundUrl('autumn'),
    row: CARD_ROW,
    date: { x: 1586, cy: 127, size: 52, font: SMALL_CAPS, prefix: '', shadow: true },
    fonts: { name: SERIF, hours: SERIF },
    iconShadow: true,
    cardShadow: true,
    active: paperFace('autumn', 310, 443, 0.131),
    inactive: fadedFace('inactive', 227, 321, { cy: 0.13, size: 0.19 }, '#8b8e80'),
  },
  winter: {
    id: 'winter',
    label: 'Zima',
    background: backgroundUrl('winter'),
    row: CARD_ROW,
    date: { x: 1586, cy: 127, size: 52, font: SMALL_CAPS, prefix: '', shadow: true },
    fonts: { name: SERIF, hours: SERIF },
    iconShadow: true,
    cardShadow: true,
    active: framedFace('winter', 322, 445, '#16264a'),
    inactive: fadedFace('winter-inactive', 249, 345, { cy: 0.24, size: 0.16 }, '#6f86ad'),
  },
  spring: {
    id: 'spring',
    label: 'Wiosna',
    background: backgroundUrl('spring'),
    row: CARD_ROW,
    date: { x: 1586, cy: 127, size: 52, font: SMALL_CAPS, prefix: '', shadow: true },
    fonts: { name: SERIF, hours: SERIF },
    iconShadow: true,
    cardShadow: true,
    active: framedFace('spring', 330, 457, '#1f2a14'),
    inactive: fadedFace('spring-inactive', 233, 323, { cy: 0.29, size: 0.16 }, '#7f8f78'),
  },
  summer: {
    id: 'summer',
    label: 'Lato',
    background: backgroundUrl('summer'),
    row: {
      left: 213,
      right: 1707,
      centerY: 603,
      gap: 4,
      inactiveWidth: 0,
      maxActiveWidth: 0,
      additionalRotation: (5 * Math.PI) / 180,
      additionalLift: 0.03,
      additionalShift: 0,
      uniform: true,
    },
    date: { x: 1004, cy: 317, size: 37, font: SANS_BOLD, prefix: '| ', shadow: false },
    fonts: { name: SANS, hours: SANS_BOLD },
    iconShadow: false,
    cardShadow: false,
    active: summerFace('summer', true),
    inactive: summerFace('summer-inactive', false),
  },
  classic: {
    id: 'classic',
    label: 'Klasyczny',
    background: backgroundUrl('classic'),
    row: CARD_ROW,
    date: { x: 1552, cy: 122, size: 52, font: SMALL_CAPS, prefix: '', shadow: true },
    fonts: { name: SERIF, hours: SERIF },
    iconShadow: true,
    cardShadow: true,
    active: paperFace('classic', 310, 431, 0.107),
    inactive: fadedFace('inactive', 227, 321, { cy: 0.13, size: 0.19 }, '#8b8e80'),
  },
};

/** Fonty potrzebne do narysowania motywu (canvas sam na nie nie czeka). */
export const themeFonts = (theme: Theme): FontSpec[] => [
  theme.date.font,
  theme.fonts.name,
  theme.fonts.hours,
];
