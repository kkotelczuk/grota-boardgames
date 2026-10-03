<script setup lang="ts">
import { computed, ref, useId } from 'vue';
import { formatRange, type GameIndexItem } from '@/lib/game-index';
import AppIcon from './AppIcon.vue';
import { useI18n } from './i18n';

defineSlots<{
  /** Akcje w rogu karty (np. serduszko). Scoped: rodzic dostaje dane karty. */
  actions(props: { game: GameIndexItem }): unknown;
}>();

const { game, expansions = [] } = defineProps<{
  game: GameIndexItem;
  /** Dodatki z kolekcji – rozwiązane przez rodzica (karta nie zna całej listy). */
  expansions?: GameIndexItem[];
}>();

const { t, locale } = useI18n();
const expansionsId = useId();
const showExpansions = ref(false);

const players = computed(() => formatRange(game.minPlayers, game.maxPlayers));
const time = computed(() => formatRange(game.minPlayTime, game.maxPlayTime));
const rating = computed(() =>
  game.rating == null
    ? null
    : game.rating.toLocaleString(locale, { maximumFractionDigits: 1, minimumFractionDigits: 1 }),
);
const weight = computed(() =>
  game.weight == null
    ? null
    : game.weight.toLocaleString(locale, { maximumFractionDigits: 1, minimumFractionDigits: 1 }),
);
/** „PL”, „EN + PL”, „PL · EN” (gdy egzemplarze w kilku językach). */
const languageBadge = computed(() => {
  const langs = game.languages.join(' · ');
  return game.hasPolishRules && !game.languages.includes('PL') ? `${langs} + PL` : langs;
});
const languageTitle = computed(() =>
  game.hasPolishRules && !game.languages.includes('PL')
    ? t.list.filter.polishRules
    : t.list.filter.language,
);
</script>

<template>
  <article
    class="group relative flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card transition-[box-shadow,transform] duration-200 ease-out-soft focus-within:shadow-lift hover:-translate-y-0.5 hover:shadow-lift max-sm:grid max-sm:grid-cols-[6.5rem_1fr]"
  >
    <div class="relative bg-sunken max-sm:row-span-2">
      <!-- Okładka nie ma własnego linku – klikalna jest cała karta (stretched link w tytule). -->
      <div class="h-full">
        <img
          v-if="game.cover"
          :src="game.cover.src"
          :srcset="game.cover.srcset"
          sizes="(min-width: 1280px) 240px, (min-width: 640px) 30vw, 104px"
          :width="game.cover.width"
          :height="game.cover.height"
          alt=""
          loading="lazy"
          decoding="async"
          class="aspect-square h-full w-full object-contain p-2 transition-transform duration-300 group-hover:scale-[1.03] max-sm:p-1.5"
          :style="{ viewTransitionName: `cover-${game.id}` }"
        />
        <div
          v-else
          class="grid aspect-square place-items-center p-3 text-center text-xs text-muted"
        >
          {{ t.card.noImage }}
        </div>
      </div>
    </div>
    <!-- Jeden slot akcji: na desktopie nad okładką, na mobile w prawym górnym rogu treści. -->
    <div class="absolute top-1.5 right-1.5 z-10">
      <slot name="actions" :game="game" />
    </div>

    <div class="flex min-w-0 flex-1 flex-col gap-2 p-3 sm:p-4">
      <h3 class="font-display text-lg leading-snug font-semibold max-sm:pr-10">
        <!--
          „Stretched link”: ::after linku rozciąga się na całą kartę (article ma `relative`),
          więc kliknięcie w dowolne miejsce otwiera grę, a w karcie jest tylko JEDEN link
          (czytnik ekranu nie słyszy duplikatów). Interaktywne elementy mają `relative z-10`,
          żeby leżały nad tą warstwą. Focus rysujemy na ::after – obrys całej karty, do środka
          (ujemny offset), bo `overflow-hidden` na article przyciąłby obrys rysowany na zewnątrz.
        -->
        <a
          :href="game.href"
          class="decoration-accent decoration-2 underline-offset-4 group-hover:underline after:absolute after:inset-0 after:rounded-card after:content-[''] focus-visible:outline-none focus-visible:after:outline-3 focus-visible:after:-outline-offset-3 focus-visible:after:outline-(--focus)"
        >
          {{ game.title }}
        </a>
      </h3>
      <p v-if="game.subtitle" class="-mt-1.5 line-clamp-1 text-sm text-muted">
        {{ game.subtitle }}
      </p>

      <dl class="flex flex-wrap gap-x-3 gap-y-1 text-sm text-ink">
        <div v-if="players" class="flex items-center gap-1">
          <dt>
            <AppIcon name="players" :size="16" class="text-muted" /><span class="sr-only">{{
              t.game.players
            }}</span>
          </dt>
          <dd>{{ players }}</dd>
        </div>
        <div v-if="time" class="flex items-center gap-1">
          <dt>
            <AppIcon name="clock" :size="16" class="text-muted" /><span class="sr-only">{{
              t.game.playTime
            }}</span>
          </dt>
          <dd>{{ time }}&nbsp;{{ t.card.minutes }}</dd>
        </div>
        <div v-if="weight" class="flex items-center gap-1">
          <dt>
            <AppIcon name="weight" :size="16" class="text-muted" /><span class="sr-only">{{
              t.game.weight
            }}</span>
          </dt>
          <dd>{{ weight }}/5</dd>
        </div>
        <div v-else-if="game.minAge" class="flex items-center gap-1">
          <dt>
            <AppIcon name="age" :size="16" class="text-muted" /><span class="sr-only">{{
              t.game.age
            }}</span>
          </dt>
          <dd>{{ t.card.age(game.minAge) }}</dd>
        </div>
        <div v-if="rating" class="flex items-center gap-1">
          <dt>
            <AppIcon name="star" :size="16" class="text-muted" /><span class="sr-only">{{
              t.card.rating
            }}</span>
          </dt>
          <dd>{{ rating }}</dd>
        </div>
      </dl>

      <div class="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
        <span class="badge" :title="languageTitle">{{ languageBadge }}</span>
        <span v-if="game.kind === 'expansion'" class="badge bg-accent-soft">{{
          t.card.expansionBadge
        }}</span>
        <span v-if="game.copies > 1" class="badge">{{ t.card.copies(game.copies) }}</span>
        <button
          v-if="expansions.length"
          type="button"
          class="relative z-10 ml-auto inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-sm font-semibold text-accent hover:bg-accent-soft"
          :aria-expanded="showExpansions"
          :aria-controls="expansionsId"
          @click="showExpansions = !showExpansions"
        >
          <AppIcon name="layers" :size="16" />
          {{ t.card.expansions(expansions.length) }}
          <AppIcon
            name="chevron-down"
            :size="16"
            class="transition-transform"
            :class="{ 'rotate-180': showExpansions }"
          />
        </button>
      </div>

      <Transition name="expand">
        <ul
          v-if="expansions.length && showExpansions"
          :id="expansionsId"
          class="relative z-10 space-y-1 border-t border-line pt-2 text-sm"
        >
          <li v-for="expansion in expansions" :key="expansion.id">
            <a
              :href="expansion.href"
              class="flex min-h-11 items-center gap-2 rounded-md px-1 hover:bg-sunken"
            >
              <AppIcon name="arrow-right" :size="14" class="text-muted" />
              <span class="min-w-0 flex-1">{{ expansion.title }}</span>
            </a>
          </li>
        </ul>
      </Transition>
    </div>
  </article>
</template>

<style scoped>
.expand-enter-active,
.expand-leave-active {
  transition:
    opacity 200ms,
    transform 200ms var(--ease-out-soft);
}
.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
