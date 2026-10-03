<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef } from 'vue';
import { onKeyStroke, useMediaQuery } from '@vueuse/core';
import type { FilterOptions, GameIndexItem } from '@/lib/game-index';
import { SORT_KEYS, stateFromQuery, stateToQuery, type KindFilter } from '@/lib/filters';
import type { Locale } from '@/lib/languages';
import { useFavorites } from '@/composables/useFavorites';
import { useGameFilters } from '@/composables/useGameFilters';
import { useGameSearch } from '@/composables/useGameSearch';
import { useProgressiveLimit } from '@/composables/useProgressiveLimit';
import { useUrlQueryState } from '@/composables/useUrlQueryState';
import AppIcon from './AppIcon.vue';
import FavoriteButton from './FavoriteButton.vue';
import FilterDrawer from './FilterDrawer.vue';
import FilterPanel from './FilterPanel.vue';
import SearchBox from './SearchBox.vue';
import SelectField from './SelectField.vue';
import GameCard from './GameCard.vue';
import { provideI18n } from './i18n';

/*
 * [Vue] Granica wyspy: Astro renderuje ten komponent na serwerze (SSR → pierwsze karty listy
 * w HTML; resztę dokłada klient), a potem hydratuje go w przeglądarce (`client:load`).
 * Props przechodzą przez serializację Astro (format JSON-podobny: obsługuje Map/Set/Date,
 * ale nie funkcje), dlatego to odchudzony indeks (bez opisów) i tylko dane.
 */
const { games, options, locale } = defineProps<{
  games: GameIndexItem[];
  options: FilterOptions;
  locale: Locale;
}>();

const { t } = provideI18n(locale);
const { favorites } = useFavorites();

const query = ref('');
const { debouncedQuery, isPending } = useGameSearch(query);
const { state, results, activeCount, reset } = useGameFilters(() => games, {
  locale,
  favorites,
  query: debouncedQuery,
});

/*
 * Pole wyszukiwania pisze jednocześnie do `query` (źródło debounce → filtrowanie listy)
 * i do `state.q` (URL). [Vue] Zapisywalny computed jako v-model dla dwóch celów naraz.
 */
const searchModel = computed({
  get: () => query.value,
  set: (value: string) => {
    query.value = value;
    state.value.q = value;
  },
});

useUrlQueryState(state, {
  parse: (params) => {
    const parsed = stateFromQuery(params);
    query.value = parsed.q;
    return parsed;
  },
  serialize: stateToQuery,
});

// [Vue] Zapisywalny computed jako adapter: w stanie `kind: 'all'`, a kontrolka operuje na `null`.
const kindModel = computed<Exclude<KindFilter, 'all'> | null>({
  get: () => (state.value.kind === 'all' ? null : state.value.kind),
  set: (value) => (state.value.kind = value ?? 'all'),
});

/*
 * [Vue] Stabilne referencje propsów = brak zbędnych re-renderów kart. Gdyby szablon wołał
 * `game.expansionIds.map(...)` przy każdym renderze, każda karta dostawałaby NOWĄ tablicę
 * i Vue musiałby ją zaktualizować (252 karty przy każdym znaku w wyszukiwarce).
 * Mapę liczymy raz (computed) – karta bez dodatków dostaje tę samą pustą tablicę.
 */
const NO_EXPANSIONS: GameIndexItem[] = [];
const expansionsById = computed(() => {
  const byId = new Map(games.map((g) => [g.id, g]));
  return new Map(
    games
      .filter((g) => g.expansionIds.length)
      .map((g) => [g.id, g.expansionIds.flatMap((id) => byId.get(id) ?? [])]),
  );
});
const expansionsOf = (game: GameIndexItem) => expansionsById.value.get(game.id) ?? NO_EXPANSIONS;

// ---------- Stopniowe renderowanie listy ----------
/*
 * Serwer renderuje (a klient hydratuje) tylko pierwsze karty; resztę dokładamy porcjami
 * w wolnych chwilach przeglądarki – zamiast jednego długiego taska hydracji 252 kart.
 * Bez JS pozostałe gry są linkami w <noscript> (HomeView.astro). Patrz useProgressiveLimit.
 * Limit tylko rośnie: zmiana filtrów nie odmontowuje już wyrenderowanych kart.
 */
const limit = useProgressiveLimit(() => games.length);
const visibleResults = computed(() =>
  results.value.length > limit.value ? results.value.slice(0, limit.value) : results.value,
);

// ---------- Komunikat dla czytników ekranu po kliknięciu serduszka ----------
const announcement = ref('');
function announceFavorite(_id: string, isFavorite: boolean) {
  announcement.value = isFavorite ? t.favorites.added : t.favorites.removed;
}

// ---------- Skrót klawiszowy „/” → wyszukiwarka ----------
// [Vue] useTemplateRef na KOMPONENCIE daje dostęp do tego, co wystawił przez defineExpose().
const searchBox = useTemplateRef<InstanceType<typeof SearchBox>>('searchBox');
onKeyStroke('/', (event) => {
  const target = event.target as HTMLElement | null;
  if (target?.closest('input, textarea, select, [contenteditable]')) return;
  event.preventDefault();
  searchBox.value?.focus();
});
/** Liczba pozycji widocznych bez filtrów (gry bazowe + samodzielne dodatki). */
const totalTopLevel = computed(
  () => games.filter((g) => g.kind === 'base' || !g.baseGameIds.length).length,
);

const sortOptions = SORT_KEYS.map((value) => ({ value, label: t.list.sort[value] }));

// ---------- Aktywne filtry jako usuwalne chipy ----------
interface ActiveChip {
  key: string;
  label: string;
  remove: () => void;
}
const termLabel = (list: FilterOptions['categories'], id: number) =>
  list.find((o) => o.id === id)?.label ?? String(id);
const languageLabel = (code: string) =>
  options.languages.find((l) => l.code === code)?.label ?? code;

const chips = computed<ActiveChip[]>(() => {
  const s = state.value;
  const f = t.list.filter;
  const without = <V,>(values: V[], value: V) => values.filter((v) => v !== value);
  return [
    ...(s.players != null
      ? [
          {
            key: 'players',
            label: `${f.players}: ${f.playersValue(s.players)}`,
            remove: () => (s.players = null),
          },
        ]
      : []),
    ...s.time.map((v) => ({
      key: `time-${v}`,
      label: f.timeOptions[v],
      remove: () => (s.time = without(s.time, v)),
    })),
    ...s.weight.map((v) => ({
      key: `weight-${v}`,
      label: `${f.weight}: ${f.weightOptions[v]}`,
      remove: () => (s.weight = without(s.weight, v)),
    })),
    ...(s.age != null
      ? [{ key: 'age', label: `${f.age}: ${f.ageValue(s.age)}`, remove: () => (s.age = null) }]
      : []),
    ...s.languages.map((v) => ({
      key: `lang-${v}`,
      label: languageLabel(v),
      remove: () => (s.languages = without(s.languages, v)),
    })),
    ...(s.polishRules
      ? [{ key: 'plrules', label: f.polishRules, remove: () => (s.polishRules = false) }]
      : []),
    ...s.categories.map((v) => ({
      key: `cat-${v}`,
      label: termLabel(options.categories, v),
      remove: () => (s.categories = without(s.categories, v)),
    })),
    ...s.mechanics.map((v) => ({
      key: `mech-${v}`,
      label: termLabel(options.mechanics, v),
      remove: () => (s.mechanics = without(s.mechanics, v)),
    })),
    ...(s.kind !== 'all'
      ? [{ key: 'kind', label: f.kindOptions[s.kind], remove: () => (s.kind = 'all') }]
      : []),
    ...(s.favoritesOnly
      ? [{ key: 'fav', label: f.favoritesOnly, remove: () => (s.favoritesOnly = false) }]
      : []),
  ];
});

// ---------- Desktop (sidebar) vs mobile (drawer) ----------
/*
 * [Vue] useMediaQuery na kliencie zna wynik od razu, na serwerze – nie. Żeby pierwszy render
 * klienta był identyczny z HTML-em z SSR, warunki zależne od media query włączamy dopiero
 * po zamontowaniu (`hydrated`). Do tego czasu układ ustala samo CSS (`hidden lg:block`).
 */
const hydrated = ref(false);
onMounted(() => (hydrated.value = true));
const isDesktop = useMediaQuery('(min-width: 1024px)');
const drawerOpen = ref(false);

function clearAll() {
  reset();
}

function clearEverything() {
  reset({ keepQuery: false });
  query.value = '';
}
</script>

<template>
  <div class="lg:grid lg:grid-cols-[17rem_1fr] lg:gap-8">
    <!-- Sidebar z filtrami (desktop) -->
    <aside v-if="!hydrated || isDesktop" class="hidden lg:block" :aria-label="t.list.filters">
      <div class="sticky top-4 max-h-[calc(100dvh-2rem)] overflow-y-auto pr-2 pb-8">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="font-display text-xl font-semibold">{{ t.list.filters }}</h2>
          <button
            v-if="activeCount"
            type="button"
            class="min-h-11 text-sm font-semibold text-accent hover:underline"
            @click="clearAll"
          >
            {{ t.list.clearFilters }}
          </button>
        </div>
        <FilterPanel
          v-model:players="state.players"
          v-model:time="state.time"
          v-model:weight="state.weight"
          v-model:age="state.age"
          v-model:languages="state.languages"
          v-model:polish-rules="state.polishRules"
          v-model:categories="state.categories"
          v-model:mechanics="state.mechanics"
          v-model:kind="kindModel"
          v-model:favorites-only="state.favoritesOnly"
          :options="options"
        />
      </div>
    </aside>

    <div class="min-w-0">
      <!-- Sticky pasek: wyszukiwarka + (mobile) przycisk filtrów -->
      <div
        class="sticky top-0 z-20 -mx-4 bg-paper/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:bg-transparent lg:px-0 lg:pt-0 lg:backdrop-blur-none"
      >
        <div class="flex gap-2">
          <div class="min-w-0 flex-1">
            <SearchBox ref="searchBox" v-model="searchModel" />
          </div>
          <button
            type="button"
            class="btn btn-ghost relative shrink-0 lg:hidden"
            :aria-label="
              activeCount ? `${t.list.showFilters} (${activeCount})` : t.list.showFilters
            "
            @click="drawerOpen = true"
          >
            <AppIcon name="filter" />
            <span class="max-[380px]:sr-only">{{ t.list.filters }}</span>
            <span
              v-if="activeCount"
              class="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-accent text-[0.6875rem] font-bold text-accent-ink"
              aria-hidden="true"
              >{{ activeCount }}</span
            >
          </button>
        </div>
      </div>

      <div class="mt-2 flex flex-wrap items-center justify-between gap-3 lg:mt-4">
        <!-- [a11y] Licznik wyników ogłaszany przez czytniki ekranu po każdej zmianie. -->
        <p
          role="status"
          aria-live="polite"
          class="text-sm text-muted"
          :class="{ 'opacity-60': isPending }"
        >
          <strong class="font-semibold text-ink">{{
            t.list.resultsOf(results.length, totalTopLevel)
          }}</strong>
        </p>
        <SelectField v-model="state.sort" :label="t.list.sortLabel" :options="sortOptions" />
        <p class="sr-only" aria-live="polite">{{ announcement }}</p>
      </div>

      <div
        v-if="chips.length"
        class="mt-3 flex flex-wrap items-center gap-2"
        :aria-label="t.list.activeFilters"
        role="group"
      >
        <!-- [Vue] TransitionGroup animuje pojawianie się/znikanie chipów (lista z kluczami). -->
        <TransitionGroup name="chip">
          <button
            v-for="chip in chips"
            :key="chip.key"
            type="button"
            class="chip gap-1 border-accent bg-accent-soft text-ink"
            :aria-label="t.list.removeFilter(chip.label)"
            @click="chip.remove()"
          >
            {{ chip.label }}
            <AppIcon name="close" :size="14" />
          </button>
        </TransitionGroup>
        <button
          type="button"
          class="min-h-11 px-2 text-sm font-semibold text-accent hover:underline"
          @click="clearAll"
        >
          {{ t.list.clearFilters }}
        </button>
      </div>

      <ul
        v-if="results.length"
        class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 xl:grid-cols-4"
        role="list"
      >
        <li v-for="(game, index) in visibleResults" :key="game.id" class="card-slot">
          <!--
            [Vue] Scoped slot: treść slotu używa propsów slotu (`card`), a nie zmiennej `game` z v-for.
            Slot odwołujący się do zmiennych z v-for kompilator oznacza jako dynamiczny i wymusza
            re-render karty przy każdym renderze rodzica.
          -->
          <!-- Pierwszy ekran (mobile ~4 karty, desktop ~6) ładujemy od razu, bez lazy-load. -->
          <GameCard
            :game="game"
            :expansions="expansionsOf(game)"
            :priority="index < 2 ? 'high' : index < 6 ? 'eager' : 'lazy'"
          >
            <template #actions="{ game: card }">
              <FavoriteButton :id="card.id" :title="card.title" @toggle="announceFavorite" />
            </template>
          </GameCard>
        </li>
      </ul>

      <div
        v-else
        class="mt-10 rounded-card border border-dashed border-line-strong px-6 py-12 text-center"
      >
        <p class="font-display text-2xl font-semibold">{{ t.list.emptyTitle }}</p>
        <p class="mt-2 text-muted">{{ t.list.emptyText }}</p>
        <button type="button" class="btn btn-primary mt-6" @click="clearEverything">
          {{ t.list.clearFilters }}
        </button>
      </div>
    </div>

    <FilterDrawer v-if="hydrated && !isDesktop" v-model:open="drawerOpen" :title="t.list.filters">
      <FilterPanel
        v-model:players="state.players"
        v-model:time="state.time"
        v-model:weight="state.weight"
        v-model:age="state.age"
        v-model:languages="state.languages"
        v-model:polish-rules="state.polishRules"
        v-model:categories="state.categories"
        v-model:mechanics="state.mechanics"
        v-model:kind="kindModel"
        v-model:favorites-only="state.favoritesOnly"
        :options="options"
      />
      <template #footer>
        <div class="flex gap-3">
          <button
            type="button"
            class="btn btn-ghost flex-1 disabled:opacity-50"
            :disabled="!activeCount"
            @click="clearAll"
          >
            {{ t.list.clearShort }}
          </button>
          <button type="button" class="btn btn-primary flex-[2]" @click="drawerOpen = false">
            {{ t.list.applyFilters(results.length) }}
          </button>
        </div>
      </template>
    </FilterDrawer>
  </div>
</template>

<style scoped>
.chip-enter-active,
.chip-leave-active {
  transition:
    opacity 160ms,
    transform 160ms var(--ease-out-soft);
}
.chip-enter-from,
.chip-leave-to {
  opacity: 0;
  transform: scale(0.9);
}
</style>
