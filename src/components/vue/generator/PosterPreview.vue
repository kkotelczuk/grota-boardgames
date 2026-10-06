<script setup lang="ts">
import { computed, onBeforeUnmount, useTemplateRef, watch } from 'vue';
import type { PosterDesign } from '@/lib/generator/design';
import type { SelectedItem } from '@/lib/generator/types';
import { CANVAS } from '@/lib/generator/layout';
import {
  loadFontsFor,
  loadImage,
  posterFileName,
  renderPoster,
  type BackgroundImage,
} from '@/lib/generator/render';
import { useI18n } from '../i18n';

/*
 * [Vue] Prop nazywa się `design`, nie `style`: `style` (i `class`) to atrybuty przelotowe –
 * Vue doklejałby je do elementu głównego komponentu zamiast przekazać jako dane.
 */
const { heading, items, design, logoUrls, backgroundImage } = defineProps<{
  heading: string;
  items: readonly SelectedItem[];
  design: PosterDesign;
  logoUrls: { dark: string; light: string };
  backgroundImage: BackgroundImage | null;
}>();
const { t, locale } = useI18n();

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
  const snapshot = { heading, items: [...items], design, backgroundImage };
  const [logoDark, logoLight, covers] = await Promise.all([
    loadImage(logoUrls.dark),
    loadImage(logoUrls.light),
    Promise.all(snapshot.items.map((item) => (item.cover ? loadImage(item.cover) : null))),
    loadFontsFor(snapshot.design),
  ]);
  const ctx = canvas.value?.getContext('2d');
  if (id !== renderId || !ctx) return;
  const images = new Map(snapshot.items.map((item, i) => [item.key, covers[i] ?? null]));
  renderPoster(ctx, {
    ...snapshot,
    locale,
    logos: { dark: logoDark, light: logoLight },
    images,
  });
}

/*
 * Przeciąganie suwaka (kąt, rozmycie) zmienia projekt kilkadziesiąt razy na sekundę –
 * rysujemy najwyżej raz na klatkę.
 */
let frame = 0;
function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(() => void render());
}
onBeforeUnmount(() => cancelAnimationFrame(frame));

// [Vue] Getter na propsach (destrukturyzacja propsów jest reaktywna tylko w getterach).
// flush: 'post' – pierwszy render po zamontowaniu, gdy <canvas> już istnieje.
watch(() => [heading, items, design, backgroundImage], schedule, {
  deep: true,
  immediate: true,
  flush: 'post',
});

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
