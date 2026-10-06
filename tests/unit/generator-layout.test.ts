import { describe, expect, it } from 'vitest';
import { GRID, TILE_FRAMES, computeLayout, tileFrameFor } from '@/lib/generator/layout';
import { TILE_STYLES } from '@/lib/generator/design';
import { shuffle } from '@/lib/generator/shuffle';

describe('computeLayout', () => {
  it('chooses the grid with the largest covers', () => {
    const grids = [1, 2, 4, 5, 10, 25].map((n) => {
      const { cols, rows } = computeLayout(n);
      return `${cols}×${rows}`;
    });
    // Obszar siatki jest szerszy niż wyższy – przy wielu grach więcej kolumn niż wierszy.
    expect(grids).toEqual(['1×1', '2×1', '2×2', '3×2', '5×2', '7×4']);
  });

  it('25 games get much larger covers than a square 5×5 grid would give (69 px)', () => {
    expect(computeLayout(25).tile).toBeGreaterThanOrEqual(100);
  });

  it('returns no cells for an empty selection', () => {
    expect(computeLayout(0).cells).toEqual([]);
  });

  it.each([1, 2, 3, 4, 5, 7, 10, 13, 18, 25])('%i tiles + labels fit inside the grid area', (n) => {
    const { cells, tile, labelHeight } = computeLayout(n);
    expect(cells).toHaveLength(n);
    for (const { x, y } of cells) {
      expect(x).toBeGreaterThanOrEqual(GRID.x);
      expect(y).toBeGreaterThanOrEqual(GRID.y);
      expect(x + tile).toBeLessThanOrEqual(GRID.x + GRID.width);
      expect(y + tile + labelHeight).toBeLessThanOrEqual(GRID.y + GRID.height);
    }
  });

  it('centres an incomplete last row horizontally', () => {
    const { cells, tile, cols } = computeLayout(5); // 3×2 → ostatni rząd: 2 kafelki
    expect(cols).toBe(3);
    const last = cells.slice(3);
    const left = last[0]!.x - GRID.x;
    const right = GRID.x + GRID.width - (last[1]!.x + tile);
    expect(Math.abs(left - right)).toBeLessThanOrEqual(1);
  });
});

describe('computeLayout – tile styles', () => {
  it('classic is the v1 layout (regression)', () => {
    for (const n of [1, 2, 4, 5, 10, 25]) {
      expect(computeLayout(n, TILE_FRAMES.classic)).toEqual(computeLayout(n));
    }
    expect(computeLayout(25, TILE_FRAMES.classic).pad).toBe(0);
  });

  it.each(TILE_STYLES.flatMap((style) => [true, false].map((labels) => [style, labels] as const)))(
    '%s (labels: %s): every card fits inside the grid area',
    (style, labels) => {
      const frame = tileFrameFor(style, labels);
      for (let n = 1; n <= 25; n++) {
        const { cells, card, tile } = computeLayout(n, frame);
        const allowance = Math.floor(tile * frame.rotationAllowance) / 2;
        expect(cells).toHaveLength(n);
        for (const { x, y } of cells) {
          expect(x - allowance).toBeGreaterThanOrEqual(GRID.x);
          expect(y - allowance).toBeGreaterThanOrEqual(GRID.y);
          expect(x + card.width + allowance).toBeLessThanOrEqual(GRID.x + GRID.width);
          expect(y + card.height + allowance).toBeLessThanOrEqual(GRID.y + GRID.height);
        }
      }
    },
  );

  it('hiding game names gives bigger covers', () => {
    for (const style of TILE_STYLES) {
      if (style === 'overlay') continue; // podpis na okładce i tak nie zajmuje miejsca
      expect(computeLayout(6, tileFrameFor(style, false)).tile).toBeGreaterThan(
        computeLayout(6, tileFrameFor(style, true)).tile,
      );
    }
  });

  it('overlay labels take no space, cards add padding', () => {
    expect(computeLayout(6, TILE_FRAMES.overlay).labelHeight).toBe(0);
    const card = computeLayout(6, TILE_FRAMES.card);
    expect(card.pad).toBeGreaterThan(0);
    expect(card.card.width).toBe(card.tile + 2 * card.pad);
  });
});

describe('shuffle', () => {
  it('does not mutate the input and keeps all elements', () => {
    const input = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8]);
    const result = shuffle(input);
    expect(result).not.toBe(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect([...result].sort((a, b) => a - b)).toEqual([...input]);
  });
});
