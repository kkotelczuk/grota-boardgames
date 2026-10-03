import { computed, ref, toValue, type MaybeRefOrGetter, type Ref } from 'vue';
import type { GameIndexItem } from '@/lib/game-index';
import {
  activeFilterCount,
  createCollator,
  defaultFilterState,
  filterGames,
  sortGames,
  type FilterState,
} from '@/lib/filters';
import type { Locale } from '@/lib/languages';

export interface UseGameFiltersOptions {
  locale: Locale;
  favorites: Readonly<Ref<ReadonlySet<string>>>;
  /** Fraza używana do filtrowania (zwykle zdebouncowana) – domyślnie `state.q`. */
  query?: Readonly<Ref<string>>;
}

/**
 * Stan filtrów + wyniki. Cała logika jest w czystych funkcjach (src/lib/filters.ts),
 * composable dokłada reaktywność: `ref` na stan i `computed` na pochodne.
 */
export function useGameFilters(
  items: MaybeRefOrGetter<readonly GameIndexItem[]>,
  options: UseGameFiltersOptions,
) {
  const state = ref<FilterState>(defaultFilterState());
  // [Vue] Collator jest drogi w tworzeniu – jeden na instancję, nie w każdym porównaniu.
  const collator = createCollator(options.locale);

  // [Vue] computed, nie watch: wyniki są czystą pochodną stanu, cache'owaną do zmiany zależności.
  const effectiveState = computed<FilterState>(() =>
    options.query ? { ...state.value, q: options.query.value } : state.value,
  );
  const results = computed(() =>
    sortGames(
      filterGames(toValue(items), effectiveState.value, options.favorites.value),
      state.value.sort,
      collator,
    ),
  );
  const activeCount = computed(() => activeFilterCount(state.value));

  function reset({ keepQuery = true } = {}) {
    state.value = {
      ...defaultFilterState(),
      q: keepQuery ? state.value.q : '',
      sort: state.value.sort,
    };
  }

  return { state, results, activeCount, reset };
}
