<script setup lang="ts">
import { computed, useTemplateRef, watch } from 'vue';
import type { SelectedItem } from '@/lib/generator/types';
import { CANVAS } from '@/lib/generator/layout';
import { loadFonts, loadImage, posterFileName, renderPoster } from '@/lib/generator/render';
import { useI18n } from '../i18n';

const { heading, items, logoUrl } = defineProps<{
  heading: string;
  items: readonly SelectedItem[];
  logoUrl: string;
}>();
const { t } = useI18n();

const canvas = useTemplateRef<HTMLCanvasElement>('canvas');
const canDownload = computed(() => items.length > 0);

/*
 * Render jest asynchroniczny (fonty, obrazki). Gdy w trakcie ładowania zmieni się wybór,
 * starszy render nie może nadpisać nowszego – rysujemy tylko, jeśli po `await` nadal jesteśmy
 * najnowszym wywołaniem.
 */
let renderId = 0;

async function render() {
  const id = ++renderId;
  const snapshot = { heading, items: [...items] };
  const [logo, covers] = await Promise.all([
    loadImage(logoUrl),
    Promise.all(snapshot.items.map((item) => (item.cover ? loadImage(item.cover) : null))),
    loadFonts(),
  ]);
  const ctx = canvas.value?.getContext('2d');
  if (id !== renderId || !ctx) return;
  const images = new Map(snapshot.items.map((item, i) => [item.key, covers[i] ?? null]));
  renderPoster(ctx, { ...snapshot, logo, images });
}

// [Vue] Getter na propsach (destrukturyzacja propsów jest reaktywna tylko w getterach).
// flush: 'post' – pierwszy render po zamontowaniu, gdy <canvas> już istnieje.
watch(() => [heading, items], render, { deep: true, immediate: true, flush: 'post' });

function download() {
  canvas.value?.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = posterFileName();
    link.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}
</script>

<template>
  <section aria-labelledby="generator-preview">
    <h2 id="generator-preview" class="font-display text-2xl font-semibold">
      {{ t.generator.previewHeading }}
    </h2>
    <canvas
      ref="canvas"
      :width="CANVAS"
      :height="CANVAS"
      role="img"
      :aria-label="t.generator.previewAlt"
      class="mt-3 aspect-square h-auto w-full max-w-[540px] rounded-card border border-line shadow-card"
    />
    <button type="button" class="btn btn-primary mt-4" :disabled="!canDownload" @click="download">
      {{ t.generator.download }}
    </button>
  </section>
</template>
