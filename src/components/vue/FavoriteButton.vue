<script setup lang="ts">
import { computed } from 'vue';
import type { Locale } from '@/lib/languages';
import { useFavorites } from '@/composables/useFavorites';
import AppIcon from './AppIcon.vue';
import { useI18n } from './i18n';

/*
 * [Vue] Destrukturyzacja propsów (Vue 3.5) zachowuje reaktywność – kompilator zamienia `id`
 * na `props.id`. Wartości domyślne piszemy jak zwykłe domyślne w JS, bez withDefaults().
 */
const {
  id,
  title,
  locale,
  variant = 'overlay',
} = defineProps<{
  id: string;
  title: string;
  /** Potrzebne tylko, gdy przycisk jest samodzielną wyspą (bez provideI18n wyżej w drzewie). */
  locale?: Locale;
  variant?: 'overlay' | 'full';
}>();

const emit = defineEmits<{ toggle: [id: string, isFavorite: boolean] }>();

const { t } = useI18n(locale);
const { isFavorite, toggle } = useFavorites();

const active = computed(() => isFavorite(id));
const label = computed(() => `${active.value ? t.favorites.remove : t.favorites.add}: ${title}`);

function onClick() {
  emit('toggle', id, toggle(id));
}
</script>

<template>
  <button
    type="button"
    :aria-pressed="active"
    :aria-label="variant === 'overlay' ? label : undefined"
    :title="variant === 'overlay' ? label : undefined"
    :class="[
      'fav',
      variant === 'overlay' ? 'icon-btn bg-surface/90 shadow-sm backdrop-blur' : 'btn btn-ghost',
    ]"
    @click="onClick"
  >
    <AppIcon name="heart" :size="variant === 'overlay' ? 22 : 20" class="fav-icon" />
    <span v-if="variant === 'full'">{{ active ? t.favorites.remove : t.favorites.add }}</span>
  </button>
</template>

<style scoped>
.fav {
  color: var(--ink);
}
.fav[aria-pressed='true'] {
  color: var(--heart);
}
.fav[aria-pressed='true'] :deep(.fav-icon) {
  fill: currentColor;
  animation: pop 320ms var(--ease-out-soft);
}
@keyframes pop {
  40% {
    transform: scale(1.25);
  }
}
</style>
