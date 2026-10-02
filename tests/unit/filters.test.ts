import { describe, expect, it } from 'vitest';
import {
  defaultFilterState,
  filterGames,
  matchesFilters,
  matchesQuery,
  sortGames,
  stateFromQuery,
  stateToQuery,
  type FilterState,
} from '@/lib/filters';
import { formatNumberList, formatRange, timeBucket, weightBucket } from '@/lib/game-index';
import { makeGame } from './fixtures';

const none = new Set<string>();
const st = (o: Partial<FilterState> = {}): FilterState => ({ ...defaultFilterState(), ...o });

describe('matchesQuery', () => {
  it('ignores diacritics and case', () => {
    const g = makeGame({ title: 'Złodziej' });
    expect(matchesQuery(g, 'zlodziej')).toBe(true);
    expect(matchesQuery(g, 'ZŁODZ')).toBe(true);
  });
  it('requires every token (AND, any order)', () => {
    const g = makeGame({ title: 'Race for the Galaxy' });
    expect(matchesQuery(g, 'galaxy race')).toBe(true);
    expect(matchesQuery(g, 'race mars')).toBe(false);
  });
  it('empty query matches everything', () => {
    expect(matchesQuery(makeGame(), '  ')).toBe(true);
  });
});

describe('matchesFilters', () => {
  it('players: within range', () => {
    const g = makeGame({ minPlayers: 2, maxPlayers: 4 });
    expect(matchesFilters(g, st({ players: 3 }), none)).toBe(true);
    expect(matchesFilters(g, st({ players: 5 }), none)).toBe(false);
    expect(matchesFilters(g, st({ players: 1 }), none)).toBe(false);
  });
  it('players: 8 means 8+', () => {
    expect(matchesFilters(makeGame({ minPlayers: 2, maxPlayers: 10 }), st({ players: 8 }), none)).toBe(true);
    expect(matchesFilters(makeGame({ minPlayers: 2, maxPlayers: 7 }), st({ players: 8 }), none)).toBe(false);
  });
  it('players: unknown counts are excluded', () => {
    expect(matchesFilters(makeGame({ minPlayers: null, maxPlayers: null }), st({ players: 2 }), none)).toBe(false);
  });
  it('time and weight buckets', () => {
    const g = makeGame({ maxPlayTime: 25, weight: 1.5 });
    expect(matchesFilters(g, st({ time: ['short'] }), none)).toBe(true);
    expect(matchesFilters(g, st({ time: ['long', 'epic'] }), none)).toBe(false);
    expect(matchesFilters(g, st({ weight: ['light', 'heavy'] }), none)).toBe(true);
    expect(matchesFilters(g, st({ weight: ['medium'] }), none)).toBe(false);
    const unknown = makeGame({ minPlayTime: null, maxPlayTime: null, weight: null });
    expect(matchesFilters(unknown, st({ time: ['short'] }), none)).toBe(false);
    expect(matchesFilters(unknown, st({ weight: ['light'] }), none)).toBe(false);
  });
  it('age: minAge <= selected', () => {
    expect(matchesFilters(makeGame({ minAge: 8 }), st({ age: 10 }), none)).toBe(true);
    expect(matchesFilters(makeGame({ minAge: 12 }), st({ age: 10 }), none)).toBe(false);
    expect(matchesFilters(makeGame({ minAge: null }), st({ age: 10 }), none)).toBe(false);
  });
  it('languages are OR', () => {
    const g = makeGame({ languages: ['EN'] });
    expect(matchesFilters(g, st({ languages: ['PL', 'EN'] }), none)).toBe(true);
    expect(matchesFilters(g, st({ languages: ['PL'] }), none)).toBe(false);
  });
  it('polishRules', () => {
    expect(matchesFilters(makeGame({ hasPolishRules: false }), st({ polishRules: true }), none)).toBe(false);
    expect(matchesFilters(makeGame({ hasPolishRules: true }), st({ polishRules: true }), none)).toBe(true);
  });
  it('categories/mechanics OR within group, AND between groups', () => {
    const g = makeGame({ categories: [1, 2], mechanics: [10] });
    expect(matchesFilters(g, st({ categories: [2, 9] }), none)).toBe(true);
    expect(matchesFilters(g, st({ categories: [9] }), none)).toBe(false);
    expect(matchesFilters(g, st({ categories: [1], mechanics: [11] }), none)).toBe(false);
    expect(matchesFilters(g, st({ categories: [1], mechanics: [10, 11] }), none)).toBe(true);
  });
  it('favoritesOnly', () => {
    const g = makeGame({ id: 'a' });
    expect(matchesFilters(g, st({ favoritesOnly: true }), new Set(['a']))).toBe(true);
    expect(matchesFilters(g, st({ favoritesOnly: true }), new Set(['b']))).toBe(false);
  });
});

describe('filterGames', () => {
  const base = makeGame({ id: 'base', title: 'Base', expansionIds: ['exp'] });
  const exp = makeGame({ id: 'exp', title: 'Extra Pack', kind: 'expansion', baseGameIds: ['base'] });
  const orphan = makeGame({ id: 'orph', title: 'Orphan', kind: 'expansion', baseGameIds: [] });
  const all = [base, exp, orphan];
  const ids = (r: { id: string }[]) => r.map((g) => g.id);

  it('hides expansions that have a base by default, keeps orphans', () => {
    expect(ids(filterGames(all, st(), none))).toEqual(['base', 'orph']);
  });
  it('shows matching expansions when a query is present', () => {
    expect(ids(filterGames(all, st({ q: 'extra' }), none))).toEqual(['exp']);
  });
  it('kind=expansion lists all expansions; kind=base only bases', () => {
    expect(ids(filterGames(all, st({ kind: 'expansion' }), none))).toEqual(['exp', 'orph']);
    expect(ids(filterGames(all, st({ kind: 'base' }), none))).toEqual(['base']);
  });
});

describe('sortGames', () => {
  const collator = new Intl.Collator('pl', { sensitivity: 'base', numeric: true });
  const titles = (r: { title: string }[]) => r.map((g) => g.title);

  it('uses Polish collation', () => {
    const items = ['Mrowisko', 'Łąka', 'Lis'].map((title) => makeGame({ title }));
    expect(titles(sortGames(items, 'title', collator))).toEqual(['Lis', 'Łąka', 'Mrowisko']);
  });
  it('puts nulls last for rating (desc) and rank (asc)', () => {
    const items = [
      makeGame({ title: 'N', rating: null, rank: null }),
      makeGame({ title: 'Low', rating: 5, rank: 50 }),
      makeGame({ title: 'High', rating: 9, rank: 5 }),
    ];
    expect(titles(sortGames(items, 'rating', collator))).toEqual(['High', 'Low', 'N']);
    expect(titles(sortGames(items, 'rank', collator))).toEqual(['High', 'Low', 'N']);
  });
  it('does not mutate input and tie-breaks by title', () => {
    const items = [makeGame({ title: 'B', year: 2000 }), makeGame({ title: 'A', year: 2000 })];
    const copy = [...items];
    expect(titles(sortGames(items, 'year', collator))).toEqual(['A', 'B']);
    expect(items).toEqual(copy);
  });
});

describe('URL state', () => {
  it('round-trips a full state', () => {
    const state = st({
      q: 'catan',
      players: 4,
      time: ['short', 'long'],
      weight: ['heavy'],
      age: 8,
      languages: ['EN', 'PL'],
      polishRules: true,
      categories: [1, 2],
      mechanics: [3],
      kind: 'expansion',
      favoritesOnly: true,
      sort: 'rating',
    });
    expect(stateFromQuery(stateToQuery(state))).toEqual(state);
  });
  it('default state serializes to an empty query', () => {
    expect(stateToQuery(defaultFilterState()).toString()).toBe('');
  });
  it('tolerates garbage', () => {
    const s = stateFromQuery(
      new URLSearchParams('players=abc&time=foo,short&sort=bogus&kind=x&age=-3&cat=1,x,2&lang=pl'),
    );
    expect(s.players).toBeNull();
    expect(s.time).toEqual(['short']);
    expect(s.sort).toBe('title');
    expect(s.kind).toBe('all');
    expect(s.age).toBeNull();
    expect(s.languages).toEqual(['PL']);
    expect(s.categories).toEqual([1, 2]);
  });
});

describe('game-index helpers', () => {
  it('timeBucket', () => {
    expect(timeBucket({ minPlayTime: null, maxPlayTime: null })).toBeNull();
    expect(timeBucket({ minPlayTime: 20, maxPlayTime: null })).toBe('short');
    expect(timeBucket({ minPlayTime: 10, maxPlayTime: 30 })).toBe('short');
    expect(timeBucket({ minPlayTime: 10, maxPlayTime: 31 })).toBe('medium');
    expect(timeBucket({ minPlayTime: 10, maxPlayTime: 60 })).toBe('medium');
    expect(timeBucket({ minPlayTime: 10, maxPlayTime: 120 })).toBe('long');
    expect(timeBucket({ minPlayTime: 10, maxPlayTime: 121 })).toBe('epic');
  });
  it('weightBucket', () => {
    expect(weightBucket(null)).toBeNull();
    expect(weightBucket(1.99)).toBe('light');
    expect(weightBucket(2)).toBe('medium');
    expect(weightBucket(3)).toBe('medium');
    expect(weightBucket(3.01)).toBe('heavy');
  });
  it('formatRange', () => {
    expect(formatRange(null, null)).toBeNull();
    expect(formatRange(2, 2)).toBe('2');
    expect(formatRange(2, 4)).toBe('2–4');
    expect(formatRange(null, 4)).toBe('4');
    expect(formatRange(3, null)).toBe('3');
  });
  it('formatNumberList', () => {
    expect(formatNumberList([2, 3, 4, 6])).toBe('2–4, 6');
    expect(formatNumberList([6, 2, 2, 3])).toBe('2–3, 6');
    expect(formatNumberList([])).toBe('');
    expect(formatNumberList([5])).toBe('5');
  });
});
