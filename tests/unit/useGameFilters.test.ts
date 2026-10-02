import { describe, expect, it } from 'vitest';
import { nextTick, ref } from 'vue';
import { useGameFilters } from '@/composables/useGameFilters';
import { makeGame } from './fixtures';

const items = [
  makeGame({ id: 'a', title: 'Alpha', maxPlayers: 2 }),
  makeGame({ id: 'b', title: 'Beta', maxPlayers: 6 }),
  makeGame({ id: 'c', title: 'Gamma', maxPlayers: 6 }),
];

function setup(favs: string[] = []) {
  const favorites = ref<ReadonlySet<string>>(new Set(favs));
  return { favorites, ...useGameFilters(items, { locale: 'pl', favorites }) };
}

describe('useGameFilters', () => {
  it('returns all games sorted by title initially', () => {
    expect(setup().results.value.map((g) => g.id)).toEqual(['a', 'b', 'c']);
  });

  it('results update reactively with state', async () => {
    const { state, results, activeCount } = setup();
    state.value.players = 5;
    await nextTick();
    expect(results.value.map((g) => g.id)).toEqual(['b', 'c']);
    expect(activeCount.value).toBe(1);
    state.value.q = 'gam';
    expect(results.value.map((g) => g.id)).toEqual(['c']);
  });

  it('favoritesOnly uses the passed favorites ref', () => {
    const { state, results, favorites } = setup(['b']);
    state.value.favoritesOnly = true;
    expect(results.value.map((g) => g.id)).toEqual(['b']);
    favorites.value = new Set(['a', 'c']);
    expect(results.value.map((g) => g.id)).toEqual(['a', 'c']);
  });

  it('uses the optional query ref instead of state.q', () => {
    const favorites = ref<ReadonlySet<string>>(new Set());
    const query = ref('beta');
    const { results } = useGameFilters(items, { locale: 'pl', favorites, query });
    expect(results.value.map((g) => g.id)).toEqual(['b']);
  });

  it('reset keeps query and sort by default', () => {
    const { state, reset } = setup();
    state.value.q = 'x';
    state.value.sort = 'year';
    state.value.players = 3;
    state.value.favoritesOnly = true;
    reset();
    expect(state.value.q).toBe('x');
    expect(state.value.sort).toBe('year');
    expect(state.value.players).toBeNull();
    expect(state.value.favoritesOnly).toBe(false);
  });

  it('reset({ keepQuery: false }) clears the query', () => {
    const { state, reset } = setup();
    state.value.q = 'x';
    state.value.sort = 'rating';
    reset({ keepQuery: false });
    expect(state.value.q).toBe('');
    expect(state.value.sort).toBe('rating');
  });
});
