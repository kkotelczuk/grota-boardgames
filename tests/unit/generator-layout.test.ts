import { describe, expect, it } from 'vitest';
import { GRID, computeLayout } from '@/lib/generator/layout';
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

describe('shuffle', () => {
  it('does not mutate the input and keeps all elements', () => {
    const input = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8]);
    const result = shuffle(input);
    expect(result).not.toBe(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect([...result].sort((a, b) => a - b)).toEqual([...input]);
  });
});
