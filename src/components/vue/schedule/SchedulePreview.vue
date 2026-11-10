<script setup lang="ts">
import { onBeforeUnmount, useTemplateRef, watch } from 'vue';
import { ensureFont } from '@/lib/generator/fonts';
import { loadImage } from '@/lib/generator/render';
import { STAMP_URL, iconUrl } from '@/lib/schedule/assets';
import { HEIGHT, WIDTH } from '@/lib/schedule/layout';
import type { WeekPlan } from '@/lib/schedule/plan';
import { renderSchedule, scheduleFileName } from '@/lib/schedule/render';
import { THEMES, themeFonts } from '@/lib/schedule/themes';

const { plan } = defineProps<{ plan: WeekPlan }>();

const canvas = useTemplateRef<HTMLCanvasElement>('canvas');

/*
 * Render jest asynchroniczny (fonty, obrazki). Jeśli w trakcie ładowania rozkład się zmieni,
 * starszy render nie może nadpisać nowszego – rysujemy tylko wtedy, gdy po `await` nadal
 * jesteśmy najnowszym wywołaniem.
 */
let renderId = 0;

async function render() {
  const id = ++renderId;
  // Kopia stanu sprzed `await` – rysujemy dokładnie to, dla czego ładowaliśmy obrazki.
  const snapshot: WeekPlan = { ...plan, days: plan.days.map((day) => ({ ...day })) };
  const theme = THEMES[snapshot.theme];
  const [background, active, inactive, stamp, days] = await Promise.all([
    loadImage(theme.background),
    loadImage(theme.active.src),
    loadImage(theme.inactive.src),
    loadImage(STAMP_URL),
    Promise.all(
      snapshot.days.map(async (day) => {
        // Zapisany adres okładki może przestać istnieć (np. po nowym wdrożeniu strony zmienia
        // się hash w nazwie pliku) – wtedy wracamy do ikony zamiast zostawiać pustą kartę.
        const custom = day.image ? await loadImage(day.image.src) : null;
        return custom ?? loadImage(iconUrl(day.icon));
      }),
    ),
    ...themeFonts(theme).map(ensureFont),
  ]);
  const ctx = canvas.value?.getContext('2d');
  if (id !== renderId || !ctx) return;
  renderSchedule(ctx, snapshot, theme, { background, active, inactive, stamp, days });
}

// Wpisywanie podpisu zmienia stan przy każdym znaku – rysujemy najwyżej raz na klatkę.
let frame = 0;
function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(() => void render());
}
onBeforeUnmount(() => cancelAnimationFrame(frame));

/*
 * [Vue] Destrukturyzowany prop jest reaktywny tylko wewnątrz gettera, stąd `() => plan`.
 * `deep` – bo rodzic zmienia pojedyncze dni w tablicy; `flush: 'post'` – pierwszy render
 * ma się wykonać po zamontowaniu, gdy <canvas> już istnieje.
 */
watch(() => plan, schedule, { deep: true, immediate: true, flush: 'post' });

function download() {
  canvas.value?.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = scheduleFileName(plan);
    link.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}
</script>

<template>
  <section aria-labelledby="schedule-preview">
    <h2 id="schedule-preview" class="font-display text-2xl font-semibold">Podgląd</h2>
    <canvas
      ref="canvas"
      :width="WIDTH"
      :height="HEIGHT"
      role="img"
      aria-label="Podgląd grafiki z rozkładem jazdy"
      class="mt-3 aspect-video h-auto w-full rounded-card border border-line shadow-card"
    />
    <button type="button" class="btn btn-primary mt-4" @click="download">Pobierz PNG</button>
  </section>
</template>
