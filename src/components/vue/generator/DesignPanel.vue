<script setup lang="ts">
import { computed } from 'vue';
import type {
  BackgroundDesign,
  HeadingDesign,
  PosterDesign,
  TilesDesign,
} from '@/lib/generator/design';
import { estimateTone } from '@/lib/generator/presets';
import {
  THEME_IDS,
  THEMES,
  defaultDesign,
  matchingTheme,
  themeDesign,
  type ThemeId,
} from '@/lib/generator/themes';
import { useTabs } from '@/composables/useTabs';
import { useI18n } from '../i18n';
import BackgroundControls from './BackgroundControls.vue';
import DesignThumb from './DesignThumb.vue';
import HeadingControls from './HeadingControls.vue';
import OptionGroup from './OptionGroup.vue';
import TileControls from './TileControls.vue';

const { hasImage, imageError } = defineProps<{ hasImage: boolean; imageError: boolean }>();
const emit = defineEmits<{ image: [file: File | null] }>();
const design = defineModel<PosterDesign>({ required: true });
const { t } = useI18n();
const d = t.generator.design;

// ---------- Motywy ----------

/**
 * Motyw nie jest zapisany w projekcie – zaznaczony jest ten, któremu projekt jest równy.
 * Po dowolnej zmianie zaznaczenie znika samo, bez pilnowania flag.
 */
const theme = computed<ThemeId | null>({
  get: () => matchingTheme(design.value),
  set: (id) => {
    if (id) design.value = themeDesign(id);
  },
});
const themeOptions = THEME_IDS.map((value) => ({ value, label: t.generator.themes[value] }));

function reset() {
  design.value = defaultDesign();
  if (hasImage) emit('image', null);
}

// ---------- Części projektu ----------

/*
 * [Vue] `v-model="design.background"` w szablonie zapisałby pole obiektu rodzica bezpośrednio
 * (mutacja propsa „bokiem”). Zapisywalne computed podmieniają cały projekt → `update:modelValue`.
 */
const background = computed({
  get: () => design.value.background,
  set: (value: BackgroundDesign) => (design.value = { ...design.value, background: value }),
});
const heading = computed({
  get: () => design.value.heading,
  set: (value: HeadingDesign) => (design.value = { ...design.value, heading: value }),
});
const tiles = computed({
  get: () => design.value.tiles,
  set: (value: TilesDesign) => (design.value = { ...design.value, tiles: value }),
});
const tone = computed(() => estimateTone(design.value.background));

const TABS = ['background', 'heading', 'tiles'] as const;
const tabs = useTabs(TABS, 'background');
</script>

<template>
  <section aria-labelledby="generator-design" class="grid gap-6">
    <div class="flex flex-wrap items-baseline justify-between gap-3">
      <h2 id="generator-design" class="font-display text-2xl font-semibold">{{ d.heading }}</h2>
      <button type="button" class="btn btn-ghost" @click="reset">{{ d.reset }}</button>
    </div>

    <OptionGroup v-model="theme" :legend="d.themes" :options="themeOptions" variant="tiles">
      <template #preview="{ value }">
        <DesignThumb
          v-if="value"
          :design="THEMES[value]"
          :heading="d.sampleHeading"
          :count="4"
          :size="64"
        />
      </template>
    </OptionGroup>

    <div>
      <div
        role="tablist"
        :aria-label="d.heading"
        class="inline-flex gap-1 rounded-full border border-line bg-sunken p-1"
      >
        <button
          v-for="id in TABS"
          :key="id"
          v-bind="tabs.tab(id)"
          class="min-h-11 rounded-full px-4 text-sm font-semibold text-muted transition-colors hover:text-ink aria-selected:bg-surface aria-selected:text-ink aria-selected:shadow-card"
        >
          {{ d.tabs[id] }}
        </button>
      </div>

      <!-- v-show (nie v-if): aria-controls zakładek musi wskazywać istniejące elementy. -->
      <div
        v-show="tabs.active.value === 'background'"
        v-bind="tabs.panel('background')"
        class="mt-5"
      >
        <BackgroundControls
          v-model="background"
          :has-image="hasImage"
          :image-error="imageError"
          @image="emit('image', $event)"
        />
      </div>
      <div v-show="tabs.active.value === 'heading'" v-bind="tabs.panel('heading')" class="mt-5">
        <HeadingControls v-model="heading" :tone="tone" />
      </div>
      <div v-show="tabs.active.value === 'tiles'" v-bind="tabs.panel('tiles')" class="mt-5">
        <TileControls v-model="tiles" :design="design" />
      </div>
    </div>
  </section>
</template>
