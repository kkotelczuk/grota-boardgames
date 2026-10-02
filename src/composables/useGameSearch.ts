import { computed, type Ref } from 'vue';
import { refDebounced } from '@vueuse/core';
import { normalizeForSearch } from '@/lib/text';

/**
 * Fraza wyszukiwania z debounce. Pole tekstowe wiąże się z `query` (natychmiastowa reakcja UI),
 * a kosztowne filtrowanie listy zależy od `debouncedQuery`.
 */
export function useGameSearch(query: Ref<string>, { delay = 150 } = {}) {
  // [Vue] refDebounced zwraca readonly ref, który „dogania” źródło po `delay` ms ciszy.
  const debouncedQuery = refDebounced(query, delay);
  const normalized = computed(() => normalizeForSearch(debouncedQuery.value));

  return {
    debouncedQuery,
    /** `true`, gdy użytkownik pisze, a lista jeszcze nie została przefiltrowana. */
    isPending: computed(() => query.value !== debouncedQuery.value),
    hasQuery: computed(() => normalized.value.length > 0),
  };
}
