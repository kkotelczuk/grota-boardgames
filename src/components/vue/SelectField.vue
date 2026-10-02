<script setup lang="ts" generic="T extends string">
import { useId } from 'vue';
import AppIcon from './AppIcon.vue';

const { label, options } = defineProps<{
  label: string;
  options: { value: T; label: string }[];
}>();

const model = defineModel<T>({ required: true });
const id = useId();
</script>

<template>
  <div class="flex items-center gap-2">
    <label :for="id" class="text-sm whitespace-nowrap text-muted">{{ label }}</label>
    <div class="relative">
      <select
        :id="id"
        v-model="model"
        class="h-11 appearance-none rounded-full border border-line-strong bg-surface pr-10 pl-4 text-sm font-semibold text-ink focus:border-accent"
      >
        <option v-for="option in options" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
      <AppIcon
        name="chevron-down"
        :size="16"
        class="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-muted"
      />
    </div>
  </div>
</template>
