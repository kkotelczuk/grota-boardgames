<script setup lang="ts">
import { ref, useId, useTemplateRef } from 'vue';
import { GENERATOR_ACCESS_KEY, GENERATOR_PASSWORD } from '@/config/generator';
import { useI18n } from '../i18n';

/*
 * Hasło jest jawne w bundlu JS – świadomie: to ochrona tylko przed botami i przypadkowymi
 * gośćmi, a nie zabezpieczenie danych (strona nie ma logowania ani backendu).
 */
const emit = defineEmits<{ unlock: [] }>();
const { t } = useI18n();

const inputId = useId();
const errorId = useId();
const input = useTemplateRef<HTMLInputElement>('input');
const value = ref('');
const error = ref(false);

function submit() {
  if (value.value.trim() === GENERATOR_PASSWORD) {
    try {
      localStorage.setItem(GENERATOR_ACCESS_KEY, '1');
    } catch {
      /* storage zablokowany – wpuszczamy na tę wizytę */
    }
    emit('unlock');
    return;
  }
  error.value = true;
  value.value = '';
  input.value?.focus();
}
</script>

<template>
  <form class="max-w-sm" novalidate @submit.prevent="submit">
    <label :for="inputId" class="block text-sm font-semibold">{{
      t.generator.passwordLabel
    }}</label>
    <div class="mt-2 flex gap-2">
      <input
        :id="inputId"
        ref="input"
        v-model="value"
        type="password"
        autocomplete="off"
        required
        :aria-invalid="error || undefined"
        :aria-describedby="error ? errorId : undefined"
        class="h-11 min-w-0 flex-1 rounded-full border border-line-strong bg-surface px-4 text-base text-ink focus:border-accent focus-visible:outline-offset-0"
      />
      <button type="submit" class="btn btn-primary">{{ t.generator.passwordSubmit }}</button>
    </div>
    <p v-if="error" :id="errorId" role="alert" class="mt-2 text-sm font-semibold text-heart">
      {{ t.generator.passwordError }}
    </p>
  </form>
</template>
