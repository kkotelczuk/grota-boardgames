import { computed, onMounted, shallowRef } from 'vue';

export const FAVORITES_STORAGE_KEY = 'grota:favorites';

/*
 * [Vue] Stan współdzielony między WYSPAMI Astro.
 * Każda wyspa to osobna aplikacja Vue (osobne `createApp`), więc provide/inject ani Pinia
 * zainstalowana w jednej wyspie nie są widoczne w drugiej. Wszystkie wyspy na stronie ładują jednak
 * TEN SAM moduł ES (Vite wydziela go do wspólnego chunka), więc ref utworzony na poziomie modułu
 * jest singletonem: serduszko na karcie i licznik w headerze widzą ten sam stan.
 * Alternatywy: nanostores (gdy wyspy są w różnych frameworkach), Pinia z jednym wspólnym store'em.
 */
const favorites = shallowRef<ReadonlySet<string>>(new Set());
const ready = shallowRef(false);
let listening = false;

function read(): Set<string> {
  try {
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(
      Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [],
    );
  } catch {
    // Uszkodzony JSON albo zablokowany storage (tryb prywatny) – zaczynamy od pustej listy.
    return new Set();
  }
}

function write(next: Set<string>) {
  // [Vue] shallowRef + podmiana całego Seta: zmiana jest jednym, jawnym przypisaniem
  // (zamiast głębokiej reaktywności na kolekcji, której i tak nie mutujemy w miejscu).
  favorites.value = next;
  try {
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...next]));
  } catch {
    /* brak miejsca / zablokowany storage – stan w pamięci i tak działa do końca sesji */
  }
}

function hydrateOnce() {
  if (ready.value) return;
  favorites.value = read();
  ready.value = true;
  if (!listening) {
    listening = true;
    // Synchronizacja między kartami przeglądarki.
    window.addEventListener('storage', (event) => {
      if (event.key === FAVORITES_STORAGE_KEY) favorites.value = read();
    });
  }
}

const EMPTY: ReadonlySet<string> = new Set();

export function useFavorites() {
  /*
   * [Vue] SSR i hydracja: na serwerze nie ma localStorage, więc HTML zawsze renderuje stan
   * „brak ulubionych”. Odczyt robimy dopiero w onMounted.
   *
   * Pułapka: stan jest współdzielony, a wyspy hydratują się w różnym czasie (client:load vs
   * client:idle). Jeśli licznik w headerze wczyta ulubione PRZED hydracją serduszka na stronie gry,
   * serduszko w pierwszym renderze klienta byłoby „aktywne”, a w HTML-u nie – hydration mismatch
   * (w produkcji Vue NIE poprawia niezgodnych atrybutów, tylko ostrzega w dev).
   * Dlatego każda instancja widzi ulubione dopiero po SWOIM zamontowaniu (`mounted`).
   */
  const mounted = shallowRef(false);
  onMounted(() => {
    hydrateOnce();
    mounted.value = true;
  });

  const visible = computed(() => (mounted.value ? favorites.value : EMPTY));
  const isFavorite = (id: string) => visible.value.has(id);

  function toggle(id: string) {
    const next = new Set(favorites.value);
    if (!next.delete(id)) next.add(id);
    write(next);
    return next.has(id);
  }

  return {
    favorites: visible,
    /** `false` do momentu odczytu localStorage – pozwala pokazać stan ładowania zamiast „pustej listy”. */
    ready: computed(() => mounted.value && ready.value),
    count: computed(() => visible.value.size),
    isFavorite,
    toggle,
  };
}

/** Tylko do testów: reset stanu modułu. */
export function __resetFavoritesForTests() {
  favorites.value = new Set();
  ready.value = false;
}
