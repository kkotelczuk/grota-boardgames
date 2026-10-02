import { onBeforeUnmount, onMounted, type Ref } from 'vue';
import { watchDebounced } from '@vueuse/core';

export interface QueryCodec<T> {
  parse: (params: URLSearchParams) => T;
  serialize: (value: T) => URLSearchParams;
}

/**
 * Dwukierunkowa synchronizacja stanu z query stringiem.
 *
 * - Odczyt URL-a dopiero w `onMounted` – patrz uwaga o hydracji niżej.
 * - Zapis przez `history.replaceState` (z debounce): pisanie w wyszukiwarce nie zaśmieca historii,
 *   a po wejściu w szczegóły gry i „wstecz” przeglądarka wraca na URL z filtrami.
 * - `popstate` (wstecz/dalej między wpisami z różnymi query) odtwarza stan.
 */
export function useUrlQueryState<T>(state: Ref<T>, codec: QueryCodec<T>, { debounce = 250 } = {}) {
  let applyingFromUrl = false;

  const readUrl = () => {
    applyingFromUrl = true;
    state.value = codec.parse(new URLSearchParams(window.location.search));
    // Zmiana stanu z URL-a nie powinna od razu zapisywać URL-a z powrotem.
    queueMicrotask(() => (applyingFromUrl = false));
  };

  const writeUrl = (value: T) => {
    if (applyingFromUrl) return;
    const query = codec.serialize(value).toString();
    const url = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
    if (url !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
      window.history.replaceState(window.history.state, '', url);
    }
  };

  /*
   * [Vue] Hydration mismatch: HTML z serwera powstał bez query (SSG nie zna `?players=4`).
   * Gdybyśmy czytali `location.search` w setup(), pierwszy render klienta różniłby się od HTML-a.
   * Dlatego: hydratacja ze stanem domyślnym → onMounted → stan z URL-a → zwykła aktualizacja DOM.
   */
  onMounted(() => {
    readUrl();
    window.addEventListener('popstate', readUrl);
  });
  onBeforeUnmount(() => window.removeEventListener('popstate', readUrl));

  // [Vue] `deep: true`, bo stan to obiekt z tablicami; watchDebounced z VueUse = watch + debounce.
  watchDebounced(state, writeUrl, { deep: true, debounce });
}
