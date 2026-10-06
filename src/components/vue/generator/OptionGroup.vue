<script setup lang="ts" generic="T extends string | null">
import { useId } from 'vue';

/**
 * Wybór jednej opcji: natywne radio w <fieldset> (klawiatura i czytnik ekranu za darmo).
 * Dwa warianty: `chips` (tekst, jak filtry na liście gier) i `tiles` (miniatura + podpis;
 * zawartość miniatury przez slot `#preview`).
 *
 * [Vue] Komponent generyczny: `T` wyprowadzany z `options` i `v-model`, więc np. do „Ramki”
 * nie da się przekazać wartości wzoru – błąd kompilacji w rodzicu. `T` może zawierać `null`
 * (motywy: żaden nie jest zaznaczony, gdy projekt zmieniono ręcznie).
 */
const {
  legend,
  options,
  variant = 'chips',
  hideLegend = false,
} = defineProps<{
  legend: string;
  options: readonly { value: T; label: string }[];
  variant?: 'chips' | 'tiles';
  hideLegend?: boolean;
}>();

defineSlots<{ preview?(props: { value: T; checked: boolean }): unknown }>();

const model = defineModel<T>({ required: true });
const name = useId();
</script>

<template>
  <fieldset class="min-w-0">
    <legend class="mb-2 text-sm font-semibold text-ink" :class="{ 'sr-only': hideLegend }">
      {{ legend }}
    </legend>
    <div v-if="variant === 'chips'" class="flex flex-wrap gap-2">
      <label
        v-for="option in options"
        :key="option.value ?? ''"
        class="chip cursor-pointer focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-(--focus)"
      >
        <input v-model="model" type="radio" :name="name" :value="option.value" class="sr-only" />
        {{ option.label }}
      </label>
    </div>
    <div v-else class="grid grid-cols-[repeat(auto-fill,minmax(5.25rem,1fr))] gap-2">
      <label
        v-for="option in options"
        :key="option.value ?? ''"
        class="relative grid min-h-11 cursor-pointer content-start justify-items-center gap-1.5 rounded-xl border border-line bg-surface p-1.5 text-center text-xs leading-tight font-semibold transition-colors focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-(--focus) hover:border-ink has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:shadow-[inset_0_0_0_1px_var(--accent)]"
      >
        <input v-model="model" type="radio" :name="name" :value="option.value" class="sr-only" />
        <slot name="preview" :value="option.value" :checked="model === option.value" />
        <span>{{ option.label }}</span>
      </label>
    </div>
  </fieldset>
</template>
