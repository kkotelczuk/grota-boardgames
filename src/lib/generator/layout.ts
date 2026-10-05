/**
 * Geometria grafiki 1080×1080 – czyste funkcje bez canvasa (testowalne w Node/jsdom).
 * Wszystkie liczby w pikselach canvasa.
 */
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

export interface PosterLayout {
  cols: number;
  rows: number;
  /** Bok kwadratowej okładki. */
  tile: number;
  /** Wysokość pasa na nazwę gry pod okładką (2 linie + odstęp). */
  labelHeight: number;
  labelFontSize: number;
  /** Lewy górny róg okładki każdej gry, w kolejności wyboru. */
  cells: { x: number; y: number }[];
}

const clamp = (min: number, value: number, max: number) => Math.min(max, Math.max(min, value));

const labelFontFor = (tile: number) =>
  clamp(LABEL.minFont, Math.round(tile * LABEL.ratio), LABEL.maxFont);
const labelHeightFor = (fontSize: number) =>
  Math.round(fontSize * LABEL.lineHeight * LABEL.lines) + 10;

/** Największy kwadrat, jaki mieści się w siatce cols×rows przy danej wysokości podpisu. */
function tileFor(cols: number, rows: number, labelHeight: number): number {
  const byWidth = (GRID.width - GAP * (cols - 1)) / cols;
  const byHeight = (GRID.height - GAP * (rows - 1)) / rows - labelHeight;
  return Math.floor(Math.min(byWidth, byHeight));
}

/**
 * Rozmiar kafelka dla siatki cols×rows. labelHeight zależy od tile, więc liczymy dwa razy:
 * najpierw z największym fontem podpisu, potem z faktycznym. Font zostaje z pierwszego
 * przebiegu (≤ docelowego), więc podpis na pewno mieści się w zarezerwowanym pasie.
 */
function sizeFor(cols: number, rows: number) {
  const first = tileFor(cols, rows, labelHeightFor(LABEL.maxFont));
  const labelFontSize = labelFontFor(first);
  const labelHeight = labelHeightFor(labelFontSize);
  return { tile: tileFor(cols, rows, labelHeight), labelFontSize, labelHeight };
}

/**
 * Wybór liczby kolumn: ta, przy której okładki są największe. Obszar siatki jest szerszy niż
 * wyższy (968×692), a pod każdą okładką jest podpis – „kwadratowa” siatka √n×√n marnowałaby
 * szerokość (np. 25 gier: 5×5 daje kafelki 69 px, 7×4 – 105 px). Remis → mniej pustych
 * miejsc w ostatnim rzędzie, potem mniej kolumn.
 */
function chooseGrid(count: number) {
  let best: { cols: number; rows: number; tile: number; empty: number } | null = null;
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);
    const { tile } = sizeFor(cols, rows);
    const empty = cols * rows - count;
    if (!best || tile > best.tile || (tile === best.tile && empty < best.empty)) {
      best = { cols, rows, tile, empty };
    }
  }
  return best!;
}

export function computeLayout(count: number): PosterLayout {
  if (count <= 0) {
    return { cols: 0, rows: 0, tile: 0, labelHeight: 0, labelFontSize: 0, cells: [] };
  }
  const { cols, rows } = chooseGrid(count);
  const { tile, labelFontSize, labelHeight } = sizeFor(cols, rows);

  const cellHeight = tile + labelHeight;
  const totalHeight = rows * cellHeight + GAP * (rows - 1);
  const top = GRID.y + (GRID.height - totalHeight) / 2;

  const cells: { x: number; y: number }[] = [];
  for (let row = 0; row < rows; row++) {
    // Ostatni, niepełny rząd też wyśrodkowany.
    const inRow = row === rows - 1 ? count - cols * (rows - 1) : cols;
    const rowWidth = inRow * tile + GAP * (inRow - 1);
    const left = GRID.x + (GRID.width - rowWidth) / 2;
    for (let col = 0; col < inRow; col++) {
      cells.push({
        x: Math.round(left + col * (tile + GAP)),
        y: Math.round(top + row * (cellHeight + GAP)),
      });
    }
  }
  return { cols, rows, tile, labelHeight, labelFontSize, cells };
}
