import { nextTick, onBeforeUnmount, onMounted, ref, toValue, type MaybeRefOrGetter } from 'vue';

/** Ile kart listy trafia do HTML-a z serwera i do hydracji (mobile: kilka ekranów). */
export const INITIAL_CARDS = 24;

/**
 * Limit renderowanych pozycji długiej listy. Serwer i pierwszy render klienta: `initial`
 * (to samo drzewo = poprawna hydracja). Po zamontowaniu limit rośnie porcjami po `chunk`
 * w wolnych chwilach przeglądarki (`requestIdleCallback`), aż obejmie `total`.
 *
 * Po co: hydracja 252 kart to jeden długi task (~650 ms przy CPU 4× wolniej), a HTML z pełną
 * listą waży ~1,7 MB. Porcje po kilkanaście kart mieszczą się w krótkich taskach.
 *
 * Wyjątek: powrót („wstecz”/„dalej”) i odświeżenie. Przeglądarka przywraca wtedy pozycję
 * przewinięcia jeszcze przed hydracją – na liście z samymi pierwszymi kartami, więc ucina ją
 * do ich wysokości. Dlatego renderujemy od razu całą listę i sami przewijamy na pozycję zapisaną
 * przy opuszczeniu strony (`pagehide` → sessionStorage). Przy powrocie z bfcache strona nie jest
 * wykonywana ponownie – DOM i przewinięcie wracają w całości, ten kod się nie uruchamia.
 */
export function useProgressiveLimit(
  total: MaybeRefOrGetter<number>,
  { initial = INITIAL_CARDS, chunk = 12 } = {},
) {
  const limit = ref(initial);
  let cancel = () => {};

  function schedule(callback: () => void) {
    // Safari nie ma requestIdleCallback – tam zwykły timeout (każda porcja i tak jest krótka).
    if (typeof requestIdleCallback === 'function') {
      // `timeout`: lista dorasta nawet wtedy, gdy przeglądarka długo nie ma wolnej chwili.
      const id = requestIdleCallback(callback, { timeout: 500 });
      cancel = () => cancelIdleCallback(id);
    } else {
      const id = setTimeout(callback, 16);
      cancel = () => clearTimeout(id);
    }
  }

  function grow() {
    limit.value = Math.min(limit.value + chunk, toValue(total));
    if (limit.value < toValue(total)) schedule(grow);
  }

  onMounted(() => {
    window.addEventListener('pagehide', saveScroll);
    if (restoresScrollPosition()) {
      limit.value = Math.max(limit.value, toValue(total));
      const saved = readSavedScroll();
      // Przewijamy tylko, gdy przeglądarka nie dała rady (ucięła pozycję) – nie walczymy z nią.
      if (saved != null) void nextTick(() => window.scrollY < saved && window.scrollTo(0, saved));
    } else if (limit.value < toValue(total)) {
      schedule(grow);
    }
  });
  onBeforeUnmount(() => {
    cancel();
    window.removeEventListener('pagehide', saveScroll);
  });

  return limit;
}

function restoresScrollPosition(): boolean {
  const [navigation] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
  return navigation?.type === 'back_forward' || navigation?.type === 'reload';
}

// Klucz z adresem: inna pozycja dla każdej kombinacji filtrów w URL-u (i dla każdego języka).
const scrollKey = () => `grota:scroll:${location.pathname}${location.search}`;

function saveScroll() {
  try {
    sessionStorage.setItem(scrollKey(), String(Math.round(window.scrollY)));
  } catch {
    // Prywatny tryb / zablokowany storage – bez przywracania pozycji.
  }
}

function readSavedScroll(): number | null {
  try {
    const value = Number(sessionStorage.getItem(scrollKey()));
    return value > 0 ? value : null;
  } catch {
    return null;
  }
}
