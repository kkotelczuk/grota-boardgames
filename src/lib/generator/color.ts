/**
 * Kolory: kontrast WCAG, OKLCH → sRGB, losowanie harmonijnych teł. Czyste funkcje – testowalne.
 */
import { INK, LIGHT, fillColors, type Fill, type Tone } from './design';
import { between, pick } from './random';

type Rgb = [number, number, number];

export function hexToRgb(hex: string): Rgb {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

export function rgbToHex([r, g, b]: Rgb): string {
  const part = (n: number) =>
    Math.round(Math.min(255, Math.max(0, n)))
      .toString(16)
      .padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`;
}

/** Względna luminancja (WCAG 2.x). */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as Rgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (high + 0.05) / (low + 0.05);
}

/** Tekst (atrament albo jasny) o wyższym kontraście z danym tłem. */
export const pickTextColor = (background: string): string =>
  contrast(INK, background) >= contrast(LIGHT, background) ? INK : LIGHT;

export const textColorFor = (tone: Tone): string => (tone === 'light' ? INK : LIGHT);

/** Średnia kolorów w sRGB – przybliżenie „średniego” tła gradientu. */
export function averageColor(colors: readonly string[]): string {
  const sum = colors
    .map(hexToRgb)
    .reduce<Rgb>((acc, [r, g, b]) => [acc[0] + r, acc[1] + g, acc[2] + b], [0, 0, 0]);
  return rgbToHex(sum.map((c) => c / colors.length) as Rgb);
}

/** Ton wypełnienia: ten tekst (atrament/jasny), który ma lepszy kontrast ze średnim kolorem. */
export const toneOfFill = (fill: Fill): Tone =>
  pickTextColor(averageColor(fillColors(fill))) === INK ? 'light' : 'dark';

/** Najbardziej nasycony kolor (największa rozpiętość kanałów RGB). */
export function mostSaturated(colors: readonly string[]): string {
  const spread = (hex: string) => {
    const rgb = hexToRgb(hex);
    return Math.max(...rgb) - Math.min(...rgb);
  };
  return colors.reduce((best, color) => (spread(color) > spread(best) ? color : best));
}

// ---------- OKLCH ----------

/** OKLCH (L 0–1, C ~0–0.37, h w stopniach) → hex sRGB, kanały przycięte do gamutu. */
export function oklchToHex(l: number, c: number, h: number): string {
  const rad = (h * Math.PI) / 180;
  const a = c * Math.cos(rad);
  const b = c * Math.sin(rad);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear: Rgb = [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
  const encode = (x: number) => {
    const v = Math.min(1, Math.max(0, x));
    return 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
  };
  return rgbToHex(linear.map(encode) as Rgb);
}

// ---------- Losowanie tła ----------

/** Minimalny kontrast tekstu z każdym kolorem tła (duży napis – WCAG 1.4.3 dla dużego tekstu). */
export const MIN_STOP_CONTRAST = 3;

const SCHEMES: readonly (readonly number[])[] = [
  [0, 30, 60], // analogiczny
  [0, 180, 30], // dopełniający (+ sąsiad, żeby był trzeci kolor)
  [0, 120, 240], // triada
];

/**
 * Harmonijne tło w OKLCH: odcień bazowy + schemat, jasność wg tonu. Kolor, który nie ma
 * ≥ 3:1 z tekstem tonu, przesuwamy po L w stronę bezpieczną, aż przejdzie.
 */
export function randomFill(rng: () => number): Fill {
  const tone: Tone = rng() < 0.5 ? 'light' : 'dark';
  const text = textColorFor(tone);
  const hue = between(rng, 0, 360);
  const scheme = pick(rng, SCHEMES);
  const kind = pick(rng, ['linear', 'radial', 'mesh'] as const);
  const count = kind === 'mesh' ? 4 : rng() < 0.5 ? 2 : 3;

  const colors = Array.from({ length: count }, (_, i) => {
    let l = tone === 'light' ? between(rng, 0.86, 0.95) : between(rng, 0.22, 0.38);
    const c = tone === 'light' ? between(rng, 0.04, 0.09) : between(rng, 0.07, 0.14);
    const h = (hue + scheme[i % scheme.length]! + between(rng, -8, 8) + 360) % 360;
    let color = oklchToHex(l, c, h);
    for (let step = 0; step < 50 && contrast(text, color) < MIN_STOP_CONTRAST; step++) {
      l += tone === 'light' ? 0.02 : -0.02;
      color = oklchToHex(l, c, h);
    }
    return color;
  });

  if (kind === 'mesh') {
    const [base, ...rest] = colors as [string, ...string[]];
    return { kind, base, blobs: rest.map((color) => randomBlob(rng, color)) };
  }
  if (kind === 'linear') return { kind, colors, angle: Math.floor(rng() * 24) * 15 };
  return { kind, colors };
}

export function randomBlob(rng: () => number, color: string) {
  const round2 = (n: number) => Math.round(n * 100) / 100;
  return {
    x: round2(between(rng, 0, 1)),
    y: round2(between(rng, 0, 1)),
    r: round2(between(rng, 0.5, 0.8)),
    color,
  };
}

/**
 * Zmiana typu wypełnienia z zachowaniem kolorów (generator własnego tła): z jednego koloru
 * do gradientu dokładamy jaśniejszy odcień, z gradientu do mesh – kolory stają się plamami.
 */
export function changeFillKind(fill: Fill, kind: Fill['kind'], rng: () => number): Fill {
  const colors = fillColors(fill);
  const first = colors[0]!;
  const atLeastTwo = colors.length >= 2 ? colors : [first, averageColor([first, '#ffffff'])];
  switch (kind) {
    case 'solid':
      return { kind, color: first };
    case 'linear':
      return {
        kind,
        colors: atLeastTwo.slice(0, 4),
        angle: fill.kind === 'linear' ? fill.angle : 135,
      };
    case 'radial':
      return { kind, colors: atLeastTwo.slice(0, 4) };
    case 'mesh': {
      const [base, ...rest] = atLeastTwo as [string, ...string[]];
      return { kind, base, blobs: rest.slice(0, 3).map((color) => randomBlob(rng, color)) };
    }
  }
}
