<script setup lang="ts">
import { computed, ref, useId, useTemplateRef } from 'vue';
import type { GeneratorGame, SelectedItem } from '@/lib/generator/types';
import { matchesQuery } from '@/lib/filters';
import { useGameSearch } from '@/composables/useGameSearch';
import SearchBox from '../SearchBox.vue';
import { useI18n } from '../i18n';

const MAX_RESULTS = 8;
const MAX_NAME = 80;

const { games, selectedKeys, disabled } = defineProps<{
  games: readonly GeneratorGame[];
  /** Klucze już wybranych gier – takie wyniki są widoczne, ale nieaktywne. */
  selectedKeys: ReadonlySet<string>;
  /** Osiągnięto limit – dodawanie zablokowane. */
  disabled: boolean;
}>();
const emit = defineEmits<{ add: [item: SelectedItem] }>();
const { t } = useI18n();

// ---------- Gry z kolekcji ----------

const query = ref('');
const { debouncedQuery, isPending } = useGameSearch(query);
const searchBox = useTemplateRef<InstanceType<typeof SearchBox>>('searchBox');

const results = computed(() => {
  const phrase = debouncedQuery.value.trim();
  if (!phrase) return [];
  // Pętla zamiast filter().slice() – przy krótkiej frazie nie przechodzimy całej kolekcji.
  const found: GeneratorGame[] = [];
  for (const game of games) {
    if (!matchesQuery(game, phrase)) continue;
    found.push(game);
    if (found.length === MAX_RESULTS) break;
  }
  return found;
});
const showNoResults = computed(
  () => !!debouncedQuery.value.trim() && !isPending.value && !results.value.length,
);

function addGame(game: GeneratorGame) {
  emit('add', { key: game.id, source: 'catalog', title: game.title, cover: game.cover });
  query.value = '';
  searchBox.value?.focus();
}

// ---------- Gra spoza listy ----------

const nameId = useId();
const fileId = useId();
const form = useTemplateRef<HTMLFormElement>('form');
const customName = ref('');
const customFile = ref<File | null>(null);
const canAddCustom = computed(() => !disabled && !!customName.value.trim() && !!customFile.value);

function onFileChange(event: Event) {
  customFile.value = (event.target as HTMLInputElement).files?.[0] ?? null;
}

function addCustom() {
  if (!canAddCustom.value || !customFile.value) return;
  emit('add', {
    key: crypto.randomUUID(),
    source: 'custom',
    title: customName.value.trim(),
    // blob: URL – zwalnia go rodzic (przy usunięciu gry i przy odmontowaniu).
    cover: URL.createObjectURL(customFile.value),
  });
  // reset() czyści też <input type="file">, którego nie da się powiązać przez v-model.
  form.value?.reset();
  customName.value = '';
  customFile.value = null;
}
</script>

<template>
  <div>
    <SearchBox ref="searchBox" v-model="query" :label="t.generator.searchLabel" />

    <ul v-if="results.length" class="mt-3 grid gap-1" role="list">
      <li v-for="game in results" :key="game.id">
        <button
          type="button"
          class="flex w-full items-baseline gap-2 rounded-xl px-4 py-2.5 text-left hover:bg-sunken disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent"
          :disabled="disabled || selectedKeys.has(game.id)"
          @click="addGame(game)"
        >
          <span class="min-w-0">
            <span class="font-semibold">{{ game.title }}</span>
            <!-- Jawna spacja: bez niej czytnik ekranu dostaje „SabotażystaSaboteur”. -->
            <template v-if="game.subtitle">
              {{ ' ' }}<span class="ml-1 text-sm text-muted">{{ game.subtitle }}</span>
            </template>
          </span>
          <span v-if="selectedKeys.has(game.id)" class="ml-auto shrink-0 text-sm text-muted">
            {{ t.generator.alreadyAdded }}
          </span>
        </button>
      </li>
    </ul>
    <p v-else-if="showNoResults" class="mt-3 px-4 text-sm text-muted" role="status">
      {{ t.generator.noResults }}
    </p>

    <details class="mt-4 rounded-card border border-line bg-surface">
      <summary class="cursor-pointer px-4 py-3 font-semibold">
        {{ t.generator.customToggle }}
      </summary>
      <form ref="form" class="grid gap-3 px-4 pb-4" @submit.prevent="addCustom">
        <div>
          <label :for="nameId" class="block text-sm font-semibold">{{
            t.generator.customName
          }}</label>
          <input
            :id="nameId"
            v-model="customName"
            type="text"
            :maxlength="MAX_NAME"
            autocomplete="off"
            class="mt-1 h-11 w-full rounded-full border border-line-strong bg-paper px-4 text-base text-ink focus:border-accent focus-visible:outline-offset-0"
          />
        </div>
        <div>
          <label :for="fileId" class="block text-sm font-semibold">
            {{ t.generator.customImage }}
          </label>
          <input
            :id="fileId"
            type="file"
            accept="image/*"
            class="mt-1 block w-full text-sm file:mr-3 file:rounded-full file:border file:border-line-strong file:bg-paper file:px-4 file:py-2 file:font-semibold file:text-ink"
            @change="onFileChange"
          />
        </div>
        <div>
          <button type="submit" class="btn btn-primary" :disabled="!canAddCustom">
            {{ t.generator.customAdd }}
          </button>
        </div>
      </form>
    </details>
  </div>
</template>
