/**
 * Geometria grafiki 1080×1080 – czyste funkcje bez canvasa (testowalne w Node/jsdom).
 * Wszystkie liczby w pikselach canvasa.
 */
import type { TileStyle } from './design';

export const CANVAS = 1080;
export const PADDING = { x: 56, top: 56, bottom: 40 } as const;
/** Pas na napis – zarezerwowany także wtedy, gdy napis jest pusty (układ się nie przesuwa). */
export const HEADER = { x: PADDING.x, y: PADDING.top, width: CANVAS - 2 * PADDING.x, height: 140 };
export const HEADING_FONT = { max: 60, min: 40, step: 2, lineHeight: 1.15, maxLines: 2 } as const;
/** Logo w prawym dolnym rogu; szerokość wynika z proporcji obrazka (1871:1770 → ~101 px). */
export const LOGO = { height: 96, right: CANVAS - PADDING.x, y: CANVAS - PADDING.bottom - 96 };
export const GRID = {
  x: PADDING.x,
  y: HEADER.y + HEADER.height + 32,
  width: CANVAS - 2 * PADDING.x,
  height: LOGO.y - 24 - (HEADER.y + HEADER.height + 32),
} as const;
export const GAP = 24;
export const LABEL = {
  minFont: 16,
  maxFont: 30,
  ratio: 0.085,
  lineHeight: 1.25,
  lines: 2,
} as const;

/** Ramki są rysowane tylko w tym pasie przy krawędzi – reszta układu się nie przesuwa. */
export const FRAME_BAND = 32;

/**
 * Geometria karty dla stylu kafelków. Ułamki liczone od boku okładki.
 * - `pad`: margines karty wokół okładki (classic/overlay: 0 – okładka = karta),
 * - `label`: gdzie jest podpis – pod okładką na tle, w karcie, na okładce albo brak,
 * - `rotationAllowance`: zapas na obrócone karty (polaroid), żeby rogi nie wyszły poza siatkę.
 */
export interface TileFrame {
  pad: number;
  padBottom: number;
  label: 'below' | 'inside' | 'overlay' | 'none';
  rotationAllowance: number;
}

export const TILE_FRAMES: Record<TileStyle, TileFrame> = {
  classic: { pad: 0, padBottom: 0, label: 'below', rotationAllowance: 0 },
  card: { pad: 0.06, padBottom: 0.06, label: 'inside', rotationAllowance: 0 },
  glass: { pad: 0.06, padBottom: 0.06, label: 'inside', rotationAllowance: 0 },
  polaroid: { pad: 0.05, padBottom: 0.05, label: 'inside', rotationAllowance: 0.05 },
  overlay: { pad: 0, padBottom: 0, label: 'overlay', rotationAllowance: 0 },
};

/** Ramka dla stylu; wyłączone nazwy gier → brak pasa na podpis (większe okładki). */
export function tileFrameFor(style: TileStyle, labels: boolean): TileFrame {
  const frame = TILE_FRAMES[style];
  return labels ? frame : { ...frame, label: 'none' };
}

export interface PosterLayout {
  cols: number;
  rows: number;
  /** Bok kwadratowej okładki. */
  tile: number;
  /** Wysokość pasa na nazwę gry (2 linie + odstęp); 0, gdy podpis nie zajmuje miejsca. */
  labelHeight: number;
  labelFontSize: number;
  /** Margines okładki w karcie (px): z boków i z góry / pod podpisem. */
  pad: number;
  padBottom: number;
  card: { width: number; height: number };
  /** Lewy górny róg karty każdej gry, w kolejności wyboru (okładka: + `pad`). */
  cells: { x: number; y: number }[];
}

const clamp = (min: number, value: number, max: number) => Math.min(max, Math.max(min, value));

const labelFontFor = (tile: number) =>
  clamp(LABEL.minFont, Math.round(tile * LABEL.ratio), LABEL.maxFont);
const labelHeightFor = (fontSize: number) =>
  Math.round(fontSize * LABEL.lineHeight * LABEL.lines) + 10;
const takesSpace = (frame: TileFrame) => frame.label === 'below' || frame.label === 'inside';

/** Największa okładka, przy której siatka cols×rows kart mieści się w obszarze GRID. */
function tileFor(cols: number, rows: number, labelHeight: number, frame: TileFrame): number {
  const band = takesSpace(frame) ? labelHeight : 0;
  const widthFactor = 1 + 2 * frame.pad + frame.rotationAllowance;
  const heightFactor = 1 + frame.pad + frame.padBottom + frame.rotationAllowance;
  const byWidth = (GRID.width - GAP * (cols - 1)) / cols / widthFactor;
  const byHeight = ((GRID.height - GAP * (rows - 1)) / rows - band) / heightFactor;
  return Math.floor(Math.min(byWidth, byHeight));
}

/**
 * Rozmiar okładki dla siatki cols×rows. labelHeight zależy od tile, więc liczymy dwa razy:
 * najpierw z największym fontem podpisu, potem z faktycznym. Font zostaje z pierwszego
 * przebiegu (≤ docelowego), więc podpis na pewno mieści się w zarezerwowanym pasie.
 */
function sizeFor(cols: number, rows: number, frame: TileFrame) {
  const first = tileFor(cols, rows, labelHeightFor(LABEL.maxFont), frame);
  const labelFontSize = labelFontFor(first);
  const labelHeight = labelHeightFor(labelFontSize);
  return { tile: tileFor(cols, rows, labelHeight, frame), labelFontSize, labelHeight };
}

/**
 * Wybór liczby kolumn: ta, przy której okładki są największe. Obszar siatki jest szerszy niż
 * wyższy (968×692), a pod każdą okładką jest podpis – „kwadratowa” siatka √n×√n marnowałaby
 * szerokość (np. 25 gier: 5×5 daje kafelki 69 px, 7×4 – 105 px). Remis → mniej pustych
 * miejsc w ostatnim rzędzie, potem mniej kolumn.
 */
function chooseGrid(count: number, frame: TileFrame) {
  let best: { cols: number; rows: number; tile: number; empty: number } | null = null;
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);
    const { tile } = sizeFor(cols, rows, frame);
    const empty = cols * rows - count;
    if (!best || tile > best.tile || (tile === best.tile && empty < best.empty)) {
      best = { cols, rows, tile, empty };
    }
  }
  return best!;
}

export function computeLayout(count: number, frame: TileFrame = TILE_FRAMES.classic): PosterLayout {
  if (count <= 0) {
    return {
      cols: 0,
      rows: 0,
      tile: 0,
      labelHeight: 0,
      labelFontSize: 0,
      pad: 0,
      padBottom: 0,
      card: { width: 0, height: 0 },
      cells: [],
    };
  }
  const { cols, rows } = chooseGrid(count, frame);
  const { tile, labelFontSize, labelHeight: fullLabelHeight } = sizeFor(cols, rows, frame);
  const labelHeight = takesSpace(frame) ? fullLabelHeight : 0;

  // Marginesy w dół – zaokrąglenie w górę mogłoby wypchnąć kartę poza siatkę.
  const pad = Math.floor(tile * frame.pad);
  const padBottom = Math.floor(tile * frame.padBottom);
  const allowance = Math.floor(tile * frame.rotationAllowance);
  const card = { width: tile + 2 * pad, height: pad + tile + labelHeight + padBottom };
  const cellWidth = card.width + allowance;
  const cellHeight = card.height + allowance;

  const totalHeight = rows * cellHeight + GAP * (rows - 1);
  const top = GRID.y + (GRID.height - totalHeight) / 2 + allowance / 2;

  const cells: { x: number; y: number }[] = [];
  for (let row = 0; row < rows; row++) {
    // Ostatni, niepełny rząd też wyśrodkowany.
    const inRow = row === rows - 1 ? count - cols * (rows - 1) : cols;
    const rowWidth = inRow * cellWidth + GAP * (inRow - 1);
    const left = GRID.x + (GRID.width - rowWidth) / 2 + allowance / 2;
    for (let col = 0; col < inRow; col++) {
      cells.push({
        x: Math.round(left + col * (cellWidth + GAP)),
        y: Math.round(top + row * (cellHeight + GAP)),
      });
    }
  }
  return { cols, rows, tile, labelHeight, labelFontSize, pad, padBottom, card, cells };
}
