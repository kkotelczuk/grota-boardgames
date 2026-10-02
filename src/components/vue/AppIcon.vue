<script setup lang="ts">
/**
 * Ikony inline SVG (styl Lucide, stroke = currentColor). Dekoracyjne – zawsze aria-hidden;
 * znaczenie niesie tekst obok albo aria-label na przycisku.
 */
export type IconName =
  | 'players'
  | 'clock'
  | 'weight'
  | 'star'
  | 'heart'
  | 'search'
  | 'filter'
  | 'close'
  | 'chevron-down'
  | 'sun'
  | 'moon'
  | 'age'
  | 'layers'
  | 'arrow-right';

const { name, size = 20 } = defineProps<{ name: IconName; size?: number }>();

const paths: Record<IconName, string> = {
  players:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20M12 6v6l4 2',
  weight: 'M12 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6M6.5 9h11l3 12h-17z',
  star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z',
  heart:
    'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7z',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16M21 21l-4.35-4.35',
  filter: 'M4 6h16M7 12h10M10 18h4',
  close: 'M18 6 6 18M6 6l12 12',
  'chevron-down': 'm6 9 6 6 6-6',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41',
  moon: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9',
  age: 'M12 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6M5 22v-5l-1-1v-4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4l-1 1v5',
  layers: 'm12 2 10 5-10 5L2 7zM2 17l10 5 10-5M2 12l10 5 10-5',
  'arrow-right': 'M5 12h14M12 5l7 7-7 7',
};
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
    class="shrink-0"
  >
    <path :d="paths[name]" />
  </svg>
</template>
