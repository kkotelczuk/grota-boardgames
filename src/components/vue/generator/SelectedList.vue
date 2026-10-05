<script setup lang="ts">
import type { SelectedItem } from '@/lib/generator/types';
import AppIcon from '../AppIcon.vue';
import { useI18n } from '../i18n';

const { items, max } = defineProps<{ items: readonly SelectedItem[]; max: number }>();
const emit = defineEmits<{ remove: [key: string]; shuffle: []; clear: [] }>();
const { t } = useI18n();
</script>

<template>
  <section aria-labelledby="generator-selected">
    <div class="flex items-baseline justify-between gap-4">
      <h2 id="generator-selected" class="font-display text-2xl font-semibold">
        {{ t.generator.selectedHeading }}
      </h2>
      <span class="text-sm text-muted tabular-nums">
        {{ t.generator.selectedCount(items.length, max) }}
      </span>
    </div>

    <p v-if="!items.length" class="mt-3 text-muted">{{ t.generator.emptySelection }}</p>

    <template v-else>
      <!-- Kolejność listy = kolejność na grafice. -->
      <ol class="mt-3 grid gap-2">
        <li
          v-for="item in items"
          :key="item.key"
          class="flex items-center gap-3 rounded-xl border border-line bg-surface py-1 pr-1 pl-2"
        >
          <img
            v-if="item.cover"
            :src="item.cover"
            alt=""
            width="40"
            height="40"
            class="size-10 shrink-0 rounded-md object-cover"
          />
          <span v-else class="size-10 shrink-0 rounded-md bg-sunken" aria-hidden="true" />
          <span class="min-w-0 flex-1 truncate font-semibold">{{ item.title }}</span>
          <button
            type="button"
            class="icon-btn text-muted"
            :aria-label="t.generator.remove(item.title)"
            @click="emit('remove', item.key)"
          >
            <AppIcon name="close" :size="18" />
          </button>
        </li>
      </ol>

      <div class="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          class="btn btn-ghost"
          :disabled="items.length < 2"
          @click="emit('shuffle')"
        >
          {{ t.generator.shuffle }}
        </button>
        <button type="button" class="btn btn-ghost" @click="emit('clear')">
          {{ t.generator.clear }}
        </button>
      </div>
    </template>
  </section>
</template>
