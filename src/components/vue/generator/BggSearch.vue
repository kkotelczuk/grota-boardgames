<script setup lang="ts">
import { onBeforeUnmount, ref, useId, watch } from 'vue';
import { GENERATOR_BGG_TOKEN_KEY } from '@/config/generator';
import {
  BggError,
  bggCoverUrl,
  searchBgg,
  type BggErrorKind,
  type BggGame,
} from '@/lib/generator/bgg';
import type { GeneratorGame, SelectedItem } from '@/lib/generator/types';
import { useI18n } from '../i18n';

const { query, catalog, selectedKeys, disabled } = defineProps<{
  /** Fraza z wyszukiwarki (po debounce). */
  query: string;
  /** Kolekcja Groty po id – id gier z kolekcji to id z BGG, więc rozpoznajemy duplikaty. */
  catalog: ReadonlyMap<string, GeneratorGame>;
  selectedKeys: ReadonlySet<string>;
  disabled: boolean;
}>();
const emit = defineEmits<{ add: [item: SelectedItem] }>();
const { t } = useI18n();

// ---------- Token (localStorage; storage może być zablokowany – wtedy żyje do odświeżenia) ----------

function readToken(): string {
  try {
    return localStorage.getItem(GENERATOR_BGG_TOKEN_KEY) ?? '';
  } catch {
    return '';
  }
}
function writeToken(value: string) {
  try {
    if (value) localStorage.setItem(GENERATOR_BGG_TOKEN_KEY, value);
    else localStorage.removeItem(GENERATOR_BGG_TOKEN_KEY);
  } catch {
    /* brak storage – token zostaje tylko w pamięci */
  }
}

const token = ref(readToken());
const tokenDraft = ref('');
const tokenId = useId();

function saveToken() {
  const value = tokenDraft.value.trim();
  if (!value) return;
  token.value = value;
  writeToken(value);
  tokenDraft.value = '';
  error.value = null;
}

function forgetToken() {
  token.value = '';
  writeToken('');
}

// ---------- Wyszukiwanie ----------

/*
 * [Vue] Stan jako jedna unia zamiast kilku flag (`loading`, `error`, `results`) – w szablonie
 * nie da się trafić na niemożliwą kombinację typu „ładuje i jednocześnie ma błąd”.
 */
type State = { status: 'idle' } | { status: 'loading' } | { status: 'done'; results: BggGame[] };
const state = ref<State>({ status: 'idle' });
const error = ref<BggErrorKind | null>(null);
let controller: AbortController | null = null;

function cancel() {
  controller?.abort();
  controller = null;
}

// Nowa fraza = stare wyniki są nieaktualne. BGG odpytujemy dopiero na kliknięcie (limity API).
watch(
  () => query,
  () => {
    cancel();
    state.value = { status: 'idle' };
    error.value = null;
  },
);
onBeforeUnmount(cancel);

async function search() {
  const phrase = query.trim();
  if (!phrase || !token.value) return;
  cancel();
  const current = (controller = new AbortController());
  state.value = { status: 'loading' };
  error.value = null;
  try {
    const results = await searchBgg(phrase, token.value, { signal: current.signal });
    if (current.signal.aborted) return;
    state.value = { status: 'done', results };
  } catch (err) {
    if (current.signal.aborted) return;
    state.value = { status: 'idle' };
    error.value = err instanceof BggError ? err.kind : 'network';
    if (error.value === 'unauthorized') forgetToken();
  }
}

const isAdded = (game: BggGame) => selectedKeys.has(game.id) || selectedKeys.has(`bgg:${game.id}`);

function add(game: BggGame) {
  // Gra jest w kolekcji – bierzemy jej polski tytuł i okładkę z naszej domeny.
  const own = catalog.get(game.id);
  emit(
    'add',
    own
      ? { key: own.id, source: 'catalog', title: own.title, cover: own.cover }
      : {
          key: `bgg:${game.id}`,
          source: 'bgg',
          title: game.name,
          cover: game.image ? bggCoverUrl(game.image) : null,
        },
  );
}
</script>

<template>
  <div class="mt-3">
    <form
      v-if="!token"
      class="grid gap-2 rounded-card border border-line bg-surface p-4"
      @submit.prevent="saveToken"
    >
      <label :for="tokenId" class="block text-sm font-semibold">{{
        t.generator.bgg.tokenLabel
      }}</label>
      <p class="text-sm text-muted">
        {{ t.generator.bgg.tokenHint }}
        <a
          href="https://boardgamegeek.com/using_the_xml_api"
          target="_blank"
          rel="noopener noreferrer"
          class="underline"
          >{{ t.generator.bgg.tokenHelp }}</a
        >
      </p>
      <div class="flex flex-wrap gap-2">
        <input
          :id="tokenId"
          v-model="tokenDraft"
          type="password"
          autocomplete="off"
          class="h-11 min-w-0 flex-1 rounded-full border border-line-strong bg-paper px-4 text-base text-ink focus:border-accent focus-visible:outline-offset-0"
        />
        <button type="submit" class="btn btn-primary" :disabled="!tokenDraft.trim()">
          {{ t.generator.bgg.tokenSave }}
        </button>
      </div>
    </form>

    <div v-else class="flex flex-wrap items-center gap-x-4 gap-y-2">
      <button
        type="button"
        class="btn btn-ghost"
        :disabled="state.status === 'loading'"
        @click="search"
      >
        {{ t.generator.bgg.search(query.trim()) }}
      </button>
      <button type="button" class="text-sm text-muted underline" @click="forgetToken">
        {{ t.generator.bgg.tokenChange }}
      </button>
    </div>

    <p v-if="error" class="mt-3 px-4 text-sm font-semibold" role="alert">
      {{ t.generator.bgg.errors[error] }}
    </p>

    <!-- Region aktualizowany na żywo: czytnik ekranu dostaje „szukam…”, a potem wynik. -->
    <div role="status">
      <p v-if="state.status === 'loading'" class="mt-3 px-4 text-sm text-muted">
        {{ t.generator.bgg.loading }}
      </p>
      <p
        v-else-if="state.status === 'done' && !state.results.length"
        class="mt-3 px-4 text-sm text-muted"
      >
        {{ t.generator.bgg.noResults }}
      </p>
    </div>

    <section
      v-if="state.status === 'done' && state.results.length"
      class="mt-3"
      :aria-label="t.generator.bgg.heading"
    >
      <h3 class="px-4 text-sm font-semibold text-muted">{{ t.generator.bgg.heading }}</h3>
      <ul class="mt-1 grid gap-1" role="list">
        <li v-for="game in state.results" :key="game.id">
          <button
            type="button"
            class="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-sunken disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent"
            :disabled="disabled || isAdded(game)"
            @click="add(game)"
          >
            <!-- Miniatura prosto z BGG – w <img> CORS nie przeszkadza (to nie canvas). -->
            <img
              v-if="game.thumbnail"
              :src="game.thumbnail"
              alt=""
              width="40"
              height="40"
              loading="lazy"
              referrerpolicy="no-referrer"
              class="size-10 shrink-0 rounded-md object-cover"
            />
            <span v-else class="size-10 shrink-0 rounded-md bg-sunken" aria-hidden="true" />
            <span class="min-w-0">
              <span class="font-semibold">{{ game.name }}</span>
              <template v-if="game.year">
                {{ ' ' }}<span class="ml-1 text-sm text-muted">({{ game.year }})</span>
              </template>
            </span>
            <span v-if="isAdded(game)" class="ml-auto shrink-0 text-sm text-muted">
              {{ t.generator.alreadyAdded }}
            </span>
            <span v-else-if="catalog.has(game.id)" class="ml-auto shrink-0 text-sm text-muted">
              {{ t.generator.bgg.inCollection }}
            </span>
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>
