<script setup lang="ts" generic="T extends string | number">
import { computed, ref, useId } from 'vue';
import { normalizeForSearch } from '@/lib/text';
import { useI18n } from './i18n';

/*
 * [Vue] Komponent generyczny: `T` wyprowadzany z przekazanych `options` i `v-model`,
 * więc <ChipGroup v-model="state.time" :options="timeOptions"> jest w pełni typowany
 * (TimeBucket[]), a pomyłka typu wartości to błąd kompilacji w rodzicu.
 */
export interface ChipOption<V> {
  value: V;
  label: string;
  count?: number;
}

const {
  legend,
  options,
  limit = Infinity,
  searchable = false,
} = defineProps<{
  legend: string;
  options: ChipOption<T>[];
  /** Ile opcji pokazać przed „Pokaż więcej”. */
  limit?: number;
  /** Pole do zawężania długiej listy (kategorie, mechaniki). */
  searchable?: boolean;
}>();

const selected = defineModel<T[]>({ required: true });
const { t } = useI18n();
const searchId = useId();

const expanded = ref(false);
const filter = ref('');

const visible = computed(() => {
  const needle = normalizeForSearch(filter.value);
  const matching = needle
    ? options.filter((o) => normalizeForSearch(o.label).includes(needle))
    : options;
  if (expanded.value || needle) return matching;
  // Zaznaczone zawsze widoczne, nawet jeśli są „pod zwinięciem”.
  const head = matching.slice(0, limit);
  const selectedTail = matching.slice(limit).filter((o) => selected.value.includes(o.value));
  return [...head, ...selectedTail];
});

function toggle(value: T) {
  // [Vue] Nowa tablica zamiast push/splice – czytelny przepływ danych przez v-model.
  selected.value = selected.value.includes(value)
    ? selected.value.filter((v) => v !== value)
    : [...selected.value, value];
}
</script>

<template>
  <fieldset class="min-w-0">
    <legend class="mb-2 text-sm font-semibold text-ink">{{ legend }}</legend>
    <template v-if="searchable && options.length > limit">
      <label :for="searchId" class="sr-only">{{ legend }}: {{ t.list.filter.searchTerms }}</label>
      <input
        :id="searchId"
        v-model="filter"
        type="search"
        :placeholder="t.list.filter.searchTerms"
        class="mb-2 h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm focus:border-accent"
      />
    </template>
    <div class="flex flex-wrap gap-2">
      <button
        v-for="option in visible"
        :key="option.value"
        type="button"
        class="chip"
        :aria-pressed="selected.includes(option.value)"
        @click="toggle(option.value)"
      >
        {{ option.label }}
        <span v-if="option.count != null" class="text-xs opacity-70">{{ option.count }}</span>
      </button>
    </div>
    <button
      v-if="!filter && options.length > limit"
      type="button"
      class="mt-2 min-h-11 text-sm font-semibold text-accent underline-offset-4 hover:underline"
      :aria-expanded="expanded"
      @click="expanded = !expanded"
    >
      {{
        expanded ? t.list.filter.showLess : `${t.list.filter.showMore} (${options.length - limit})`
      }}
    </button>
  </fieldset>
</template>
