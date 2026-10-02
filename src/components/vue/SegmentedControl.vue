<script setup lang="ts" generic="T extends string | number">
import { useId } from 'vue';

/**
 * Wybór jednej wartości (albo żadnej, gdy `nullable`). Natywne radio – dostępność
 * i obsługa strzałkami za darmo; wygląd chipów przez `.chip:has(input:checked)`.
 */
const {
  legend,
  options,
  nullable = false,
  nullLabel = '',
} = defineProps<{
  legend: string;
  options: { value: T; label: string }[];
  nullable?: boolean;
  nullLabel?: string;
}>();

const model = defineModel<T | null>({ required: true });
const name = useId();
</script>

<template>
  <fieldset class="min-w-0">
    <legend class="mb-2 text-sm font-semibold text-ink">{{ legend }}</legend>
    <div class="flex flex-wrap gap-2">
      <label
        v-if="nullable"
        class="chip cursor-pointer focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-(--focus)"
      >
        <input v-model="model" type="radio" :name="name" :value="null" class="sr-only" />
        {{ nullLabel }}
      </label>
      <label
        v-for="option in options"
        :key="option.value"
        class="chip cursor-pointer focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-(--focus)"
      >
        <input v-model="model" type="radio" :name="name" :value="option.value" class="sr-only" />
        {{ option.label }}
      </label>
    </div>
  </fieldset>
</template>
