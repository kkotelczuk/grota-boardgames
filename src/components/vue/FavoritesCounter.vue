<script setup lang="ts">
import { computed } from 'vue';
import type { Locale } from '@/lib/languages';
import { useFavorites } from '@/composables/useFavorites';
import AppIcon from './AppIcon.vue';
import { useI18n } from './i18n';

const { href, locale } = defineProps<{ href: string; locale: Locale }>();

const { t } = useI18n(locale);
// [Vue] Ten sam singleton co w FavoriteButton na karcie – patrz useFavorites.ts.
const { count } = useFavorites();
const label = computed(() =>
  count.value ? `${t.nav.favorites} – ${t.favorites.counter(count.value)}` : t.nav.favorites,
);
</script>

<template>
  <a :href="href" class="icon-btn relative" :aria-label="label" :title="label">
    <AppIcon name="heart" :size="22" />
    <Transition name="badge">
      <span
        v-if="count > 0"
        :key="count"
        class="absolute -top-0.5 -right-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-heart px-1 text-[0.6875rem] leading-none font-bold text-white dark:text-black"
        aria-hidden="true"
      >
        {{ count }}
      </span>
    </Transition>
  </a>
</template>

<style scoped>
.badge-enter-active {
  transition: transform 220ms var(--ease-out-soft);
}
.badge-enter-from {
  transform: scale(0.4);
}
</style>
