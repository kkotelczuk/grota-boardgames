<script setup lang="ts">
import { computed, onMounted } from 'vue';
import {
  ALIGNS,
  HEADING_EFFECTS,
  HEADING_FONT_IDS,
  type HeadingDesign,
  type Tone,
} from '@/lib/generator/design';
import { HEADING_FONTS, cssFamily, preloadHeadingFonts } from '@/lib/generator/fonts';
import { useI18n } from '../i18n';
import OptionGroup from './OptionGroup.vue';

const { tone } = defineProps<{ tone: Tone | null }>();
const model = defineModel<HeadingDesign>({ required: true });
const { t } = useI18n();
const d = t.generator.design;

// Każda nazwa stylu jest pokazana swoim krojem – potrzebne wszystkie fonty.
onMounted(() => void preloadHeadingFonts());

/** [Vue] Zapisywalny computed jako v-model dla pola zagnieżdżonego: podmienia cały obiekt. */
const field = <K extends keyof HeadingDesign>(key: K) =>
  computed({
    get: () => model.value[key],
    set: (value: HeadingDesign[K]) => (model.value = { ...model.value, [key]: value }),
  });
const font = field('font');
const effect = field('effect');
const align = field('align');

const fontOptions = HEADING_FONT_IDS.map((value) => ({ value, label: t.generator.fonts[value] }));
const effectOptions = HEADING_EFFECTS.map((value) => ({ value, label: d.effect[value] }));
const alignOptions = ALIGNS.map((value) => ({ value, label: d.align[value] }));
</script>

<template>
  <div class="grid gap-6">
    <OptionGroup v-model="font" :legend="d.font" :options="fontOptions" variant="tiles">
      <template #preview="{ value }">
        <span
          class="grid h-14 w-full place-items-center overflow-hidden rounded-lg bg-paper text-2xl leading-none text-ink"
          :class="{ uppercase: HEADING_FONTS[value].uppercase }"
          :style="{
            fontFamily: cssFamily(HEADING_FONTS[value]),
            fontWeight: HEADING_FONTS[value].weight,
          }"
          aria-hidden="true"
        >
          Aa
        </span>
      </template>
    </OptionGroup>

    <div>
      <OptionGroup v-model="effect" :legend="d.effect.label" :options="effectOptions" />
      <p v-if="effect === 'neon' && tone === 'light'" class="mt-2 text-sm text-muted" role="status">
        {{ d.neonHint }}
      </p>
    </div>

    <OptionGroup v-model="align" :legend="d.align.label" :options="alignOptions" />
  </div>
</template>
