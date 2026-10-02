<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useMutationObserver } from '@vueuse/core';
import type { Locale } from '@/lib/languages';
import AppIcon from './AppIcon.vue';
import { useI18n } from './i18n';

const { locale } = defineProps<{ locale: Locale }>();
const { t } = useI18n(locale);

type Theme = 'light' | 'dark';
const THEME_KEY = 'grota:theme';

/*
 * [Vue] Motyw ustawia już inline script w <head> (zanim cokolwiek się wyrenderuje – brak mignięcia).
 * Komponent tylko czyta stan z <html data-theme> po zamontowaniu; na serwerze go nie zna,
 * więc do tego czasu `theme` jest `null` i ikona jest neutralna (brak hydration mismatch).
 */
const theme = ref<Theme | null>(null);

const readTheme = (): Theme =>
  document.documentElement.dataset['theme'] === 'dark' ? 'dark' : 'light';

onMounted(() => {
  theme.value = readTheme();
});

// Skrypt w <head> zmienia data-theme także przy zmianie motywu systemowego – nasłuchujemy atrybutu,
// żeby ikona nie rozjechała się z faktycznym motywem. (useMutationObserver sprząta po odmontowaniu.)
useMutationObserver(
  () => (typeof document === 'undefined' ? null : document.documentElement),
  () => (theme.value = readTheme()),
  { attributes: true, attributeFilter: ['data-theme'] },
);

const nextLabel = computed(() => (theme.value === 'dark' ? t.theme.light : t.theme.dark));

function toggle() {
  const next: Theme = theme.value === 'dark' ? 'light' : 'dark';
  theme.value = next;
  document.documentElement.dataset['theme'] = next;
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    /* storage niedostępny – motyw działa do odświeżenia */
  }
}
</script>

<template>
  <button
    type="button"
    class="icon-btn"
    :aria-label="theme ? nextLabel : t.theme.toggle"
    :title="theme ? nextLabel : t.theme.toggle"
    @click="toggle"
  >
    <!-- Bez JS (theme === null) pokazujemy księżyc w jasnym i słońce w ciemnym motywie przez CSS. -->
    <AppIcon v-if="theme === 'dark'" name="sun" />
    <AppIcon v-else-if="theme === 'light'" name="moon" />
    <template v-else>
      <AppIcon name="moon" class="dark:hidden" />
      <AppIcon name="sun" class="hidden dark:block" />
    </template>
  </button>
</template>
