<script setup lang="ts">
import { computed } from 'vue';
import type { GameIndexItem } from '@/lib/game-index';
import type { Locale } from '@/lib/languages';
import { useFavorites } from '@/composables/useFavorites';
import FavoriteButton from './FavoriteButton.vue';
import GameCard from './GameCard.vue';
import { provideI18n } from './i18n';

const { games, locale, browseHref } = defineProps<{
  games: GameIndexItem[];
  locale: Locale;
  browseHref: string;
}>();

const { t } = provideI18n(locale);
const { favorites, ready } = useFavorites();

const collator = new Intl.Collator(locale);
const items = computed(() =>
  games.filter((g) => favorites.value.has(g.id)).sort((a, b) => collator.compare(a.title, b.title)),
);
</script>

<template>
  <!--
    [Vue] Ta lista istnieje tylko w przeglądarce (localStorage). Na serwerze `ready === false`,
    więc HTML zawiera stan „wczytywanie”, a nie fałszywy pusty stan, który by mignął.
  -->
  <p v-if="!ready" class="text-muted" role="status">{{ t.favorites.loading }}</p>

  <div
    v-else-if="!items.length"
    class="rounded-(--radius-card) border border-dashed border-line-strong px-6 py-12 text-center"
  >
    <p class="font-display text-2xl font-semibold">{{ t.favorites.emptyTitle }}</p>
    <p class="mx-auto mt-2 max-w-prose text-muted">{{ t.favorites.emptyText }}</p>
    <a :href="browseHref" class="btn btn-primary mt-6">{{ t.favorites.emptyCta }}</a>
  </div>

  <template v-else>
    <p role="status" class="text-sm text-muted">{{ t.favorites.counter(items.length) }}</p>
    <TransitionGroup
      tag="ul"
      name="fav"
      role="list"
      class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 xl:grid-cols-4"
    >
      <li v-for="game in items" :key="game.id">
        <GameCard :game="game">
          <template #actions>
            <FavoriteButton :id="game.id" :title="game.title" />
          </template>
        </GameCard>
      </li>
    </TransitionGroup>
  </template>
</template>

<style scoped>
.fav-leave-active {
  transition:
    opacity 200ms,
    transform 200ms var(--ease-out-soft);
}
.fav-leave-to {
  opacity: 0;
  transform: scale(0.96);
}
.fav-move {
  transition: transform 250ms var(--ease-out-soft);
}
</style>
