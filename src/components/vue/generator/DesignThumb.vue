<script setup lang="ts">
import { onMounted, useTemplateRef, watch } from 'vue';
import type { PosterDesign } from '@/lib/generator/design';
import type { SelectedItem } from '@/lib/generator/types';
import { loadFontsFor, renderPoster } from '@/lib/generator/render';

/**
 * Miniatura projektu rysowana TYM SAMYM kodem co grafika (renderPoster pod skalą) – jedno
 * źródło prawdy, bez osobnej definicji gradientów w CSS. Okładki = szare placeholdery.
 */
const {
  design,
  heading = '',
  count = 0,
  size = 64,
} = defineProps<{
  design: PosterDesign;
  heading?: string;
  /** Liczba przykładowych kafelków. */
  count?: number;
  /** Rozmiar w px CSS (canvas ma 2× – ostro na ekranach retina). */
  size?: number;
}>();

const canvas = useTemplateRef<HTMLCanvasElement>('canvas');
let renderId = 0;

async function render() {
  const id = ++renderId;
  await loadFontsFor(design);
  const ctx = canvas.value?.getContext('2d');
  if (id !== renderId || !ctx) return;
  const items: SelectedItem[] = Array.from({ length: count }, (_, i) => ({
    key: `thumb-${i}`,
    source: 'catalog',
    title: '',
    cover: null,
  }));
  renderPoster(ctx, {
    heading,
    items,
    design,
    locale: 'pl',
    logos: null,
    images: new Map(),
    backgroundImage: null,
  });
}

onMounted(render);
// [Vue] Getter zamiast `design` wprost: zdestrukturyzowany prop jest reaktywny tylko w getterze.
watch(() => [design, heading, count], render);
</script>

<template>
  <canvas
    ref="canvas"
    :width="size * 2"
    :height="size * 2"
    aria-hidden="true"
    class="block rounded-lg border border-line"
    :style="{ width: `${size}px`, height: `${size}px` }"
  />
</template>
