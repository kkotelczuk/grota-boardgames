/**
 * Czysta logika filtrów, sortowania i serializacji do URL – bez Vue, łatwa do testowania.
 * Composables (src/composables) tylko opakowują ją w reaktywność.
 */
import {
  timeBucket,
  weightBucket,
  TIME_BUCKETS,
  WEIGHT_BUCKETS,
  type GameIndexItem,
  type TimeBucket,
  type WeightBucket,
} from './game-index.ts';
import { normalizeForSearch } from './text.ts';

export type KindFilter = 'all' | 'base' | 'expansion';
export type SortKey = 'title' | 'rating' | 'rank' | 'year' | 'time' | 'weight';
export const SORT_KEYS: SortKey[] = ['title', 'rating', 'rank', 'year', 'time', 'weight'];

export interface FilterState {
  q: string;
  players: number | null;
  time: TimeBucket[];
  weight: WeightBucket[];
  age: number | null;
  languages: string[];
  polishRules: boolean;
  categories: number[];
  mechanics: number[];
  kind: KindFilter;
  favoritesOnly: boolean;
  sort: SortKey;
}

export const defaultFilterState = (): FilterState => ({
  q: '',
  players: null,
  time: [],
  weight: [],
  age: null,
  languages: [],
  polishRules: false,
  categories: [],
  mechanics: [],
  kind: 'all',
  favoritesOnly: false,
  sort: 'title',
});

/** Liczba aktywnych filtrów (bez frazy i sortowania) – do badge'a na przycisku „Filtry”. */
export function activeFilterCount(state: FilterState): number {
  return (
    Number(state.players != null) +
    state.time.length +
    state.weight.length +
    Number(state.age != null) +
    state.languages.length +
    Number(state.polishRules) +
    state.categories.length +
    state.mechanics.length +
    Number(state.kind !== 'all') +
    Number(state.favoritesOnly)
  );
}

// ---------- Wyszukiwanie ----------

/** Każde słowo frazy musi wystąpić w którymś z tytułów („race galaxy” znajdzie „Race for the Galaxy”). */
export function matchesQuery(item: Pick<GameIndexItem, 'search'>, query: string): boolean {
  const tokens = normalizeForSearch(query).split(' ').filter(Boolean);
  return tokens.every((token) => item.search.includes(token));
}

// ---------- Filtrowanie ----------

export function matchesFilters(
  item: GameIndexItem,
  state: FilterState,
  favorites: ReadonlySet<string>,
): boolean {
  const { players, age } = state;
  if (players != null) {
    if (item.minPlayers == null || item.maxPlayers == null) return false;
    // 8 = „8+”: gra musi obsługiwać co najmniej 8 osób.
    const fits =
      players >= 8
        ? item.maxPlayers >= 8
        : item.minPlayers <= players && players <= item.maxPlayers;
    if (!fits) return false;
  }
  if (state.time.length) {
    const bucket = timeBucket(item);
    if (!bucket || !state.time.includes(bucket)) return false;
  }
  if (state.weight.length) {
    const bucket = weightBucket(item.weight);
    if (!bucket || !state.weight.includes(bucket)) return false;
  }
  if (age != null && (item.minAge == null || item.minAge > age)) return false;
  if (state.languages.length && !item.languages.some((l) => state.languages.includes(l)))
    return false;
  if (state.polishRules && !item.hasPolishRules) return false;
  // W obrębie grupy: OR („dowolna z zaznaczonych kategorii”), między grupami: AND.
  if (state.categories.length && !item.categories.some((c) => state.categories.includes(c)))
    return false;
  if (state.mechanics.length && !item.mechanics.some((m) => state.mechanics.includes(m)))
    return false;
  if (state.favoritesOnly && !favorites.has(item.id)) return false;
  return true;
}

/**
 * Które pozycje są widoczne na liście najwyższego poziomu:
 * - `all`: gry bazowe + dodatki bez bazy w kolekcji + dodatki pasujące do wpisanej frazy,
 * - `base` / `expansion`: tylko dany typ.
 * Dodatki z bazą w kolekcji są domyślnie schowane pod kartą gry bazowej („+N dodatków”).
 */
export function isTopLevel(item: GameIndexItem, state: FilterState, hasQuery: boolean): boolean {
  if (state.kind === 'base') return item.kind === 'base';
  if (state.kind === 'expansion') return item.kind === 'expansion';
  return item.kind === 'base' || item.baseGameIds.length === 0 || hasQuery;
}

export function filterGames(
  items: readonly GameIndexItem[],
  state: FilterState,
  favorites: ReadonlySet<string>,
): GameIndexItem[] {
  const hasQuery = state.q.trim().length > 0;
  return items.filter(
    (item) =>
      isTopLevel(item, state, hasQuery) &&
      (!hasQuery || matchesQuery(item, state.q)) &&
      matchesFilters(item, state, favorites),
  );
}

// ---------- Sortowanie ----------

const nullsLast = (a: number | null, b: number | null, direction: 1 | -1) => {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return (a - b) * direction;
};

export function sortGames(
  items: GameIndexItem[],
  sort: SortKey,
  collator: Intl.Collator,
): GameIndexItem[] {
  const byTitle = (a: GameIndexItem, b: GameIndexItem) => collator.compare(a.title, b.title);
  const compare: Record<SortKey, (a: GameIndexItem, b: GameIndexItem) => number> = {
    title: byTitle,
    rating: (a, b) => nullsLast(a.rating, b.rating, -1) || byTitle(a, b),
    rank: (a, b) => nullsLast(a.rank, b.rank, 1) || byTitle(a, b),
    year: (a, b) => nullsLast(a.year, b.year, -1) || byTitle(a, b),
    time: (a, b) =>
      nullsLast(a.maxPlayTime ?? a.minPlayTime, b.maxPlayTime ?? b.minPlayTime, 1) || byTitle(a, b),
    weight: (a, b) => nullsLast(a.weight, b.weight, 1) || byTitle(a, b),
  };
  return [...items].sort(compare[sort]);
}

// ---------- URL ----------

const list = (value: string | null) => (value ? value.split(',').filter(Boolean) : []);
const numbers = (value: string | null) => list(value).map(Number).filter(Number.isFinite);
const oneOf = <T extends string>(value: string | null, allowed: readonly T[]): T | null =>
  allowed.includes(value as T) ? (value as T) : null;
const int = (value: string | null) => {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Odporny parser: śmieci w URL-u są ignorowane, nigdy nie wywalają strony. */
export function stateFromQuery(params: URLSearchParams): FilterState {
  const state = defaultFilterState();
  state.q = params.get('q') ?? '';
  state.players = int(params.get('players'));
  state.time = list(params.get('time')).filter((v): v is TimeBucket =>
    TIME_BUCKETS.includes(v as TimeBucket),
  );
  state.weight = list(params.get('weight')).filter((v): v is WeightBucket =>
    WEIGHT_BUCKETS.includes(v as WeightBucket),
  );
  state.age = int(params.get('age'));
  state.languages = list(params.get('lang')).map((v) => v.toUpperCase());
  state.polishRules = params.get('plrules') === '1';
  state.categories = numbers(params.get('cat'));
  state.mechanics = numbers(params.get('mech'));
  state.kind = oneOf(params.get('kind'), ['base', 'expansion'] as const) ?? 'all';
  state.favoritesOnly = params.get('fav') === '1';
  state.sort = oneOf(params.get('sort'), SORT_KEYS) ?? 'title';
  return state;
}

/** Tylko wartości różne od domyślnych – krótkie, czytelne linki. */
export function stateToQuery(state: FilterState): URLSearchParams {
  const params = new URLSearchParams();
  const set = (key: string, value: string | number | null | undefined) => {
    if (value != null && value !== '') params.set(key, String(value));
  };
  set('q', state.q.trim());
  set('players', state.players);
  set('time', state.time.join(','));
  set('weight', state.weight.join(','));
  set('age', state.age);
  set('lang', state.languages.join(','));
  if (state.polishRules) set('plrules', 1);
  set('cat', state.categories.join(','));
  set('mech', state.mechanics.join(','));
  if (state.kind !== 'all') set('kind', state.kind);
  if (state.favoritesOnly) set('fav', 1);
  if (state.sort !== 'title') set('sort', state.sort);
  return params;
}
