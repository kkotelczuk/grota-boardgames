<script setup lang="ts">
import { useId, useTemplateRef } from 'vue';
import AppIcon from './AppIcon.vue';
import { useI18n } from './i18n';

// [Vue] defineModel = prop `modelValue` + emit `update:modelValue` w jednym, zapisywalnym refie.
const query = defineModel<string>({ required: true });
const { t } = useI18n();

// [Vue] useId() – stabilne id identyczne na serwerze i kliencie (zwykły licznik dałby mismatch).
const inputId = useId();
// [Vue] useTemplateRef (3.5) – ref do elementu po nazwie z atrybutu `ref`, typowany przez kompilator.
const input = useTemplateRef<HTMLInputElement>('input');

function clear() {
  query.value = '';
  input.value?.focus();
}

defineExpose({ focus: () => input.value?.focus() });
</script>

<template>
  <div class="relative">
    <label :for="inputId" class="sr-only">{{ t.list.searchLabel }}</label>
    <AppIcon
      name="search"
      class="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted"
    />
    <input
      :id="inputId"
      ref="input"
      v-model="query"
      type="search"
      inputmode="search"
      enterkeyhint="search"
      autocomplete="off"
      spellcheck="false"
      :placeholder="t.list.searchPlaceholder"
      class="h-12 w-full rounded-full border border-line-strong bg-surface pr-12 pl-11 text-base text-ink placeholder:text-muted focus:border-accent focus-visible:outline-offset-0 [&::-webkit-search-cancel-button]:hidden"
      @keydown.esc="query && (clear(), $event.stopPropagation())"
    />
    <button
      v-if="query"
      type="button"
      class="icon-btn absolute top-1/2 right-1 -translate-y-1/2 text-muted"
      :aria-label="t.list.clearSearch"
      @click="clear"
    >
      <AppIcon name="close" :size="18" />
    </button>
  </div>
</template>
