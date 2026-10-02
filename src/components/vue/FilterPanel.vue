<script setup lang="ts">
import { computed } from 'vue';
import {
  AGE_OPTIONS,
  PLAYER_OPTIONS,
  TIME_BUCKETS,
  WEIGHT_BUCKETS,
  type FilterOptions,
  type TimeBucket,
  type WeightBucket,
} from '@/lib/game-index';
import type { KindFilter } from '@/lib/filters';
import ChipGroup from './ChipGroup.vue';
import SegmentedControl from './SegmentedControl.vue';
import { useI18n } from './i18n';

const { options } = defineProps<{ options: FilterOptions }>();

/*
 * [Vue] Wiele nazwanych v-model na jednym komponencie: rodzic pisze
 * `v-model:players="state.players" v-model:time="state.time" …`. Każdy defineModel to osobna
 * para prop + emit `update:<nazwa>`. Panel nie zna całego obiektu FilterState – tylko swoje pola.
 */
const players = defineModel<number | null>('players', { required: true });
const time = defineModel<TimeBucket[]>('time', { required: true });
const weight = defineModel<WeightBucket[]>('weight', { required: true });
const age = defineModel<number | null>('age', { required: true });
const languages = defineModel<string[]>('languages', { required: true });
const polishRules = defineModel<boolean>('polishRules', { required: true });
const categories = defineModel<number[]>('categories', { required: true });
const mechanics = defineModel<number[]>('mechanics', { required: true });
const kind = defineModel<Exclude<KindFilter, 'all'> | null>('kind', { required: true });
const favoritesOnly = defineModel<boolean>('favoritesOnly', { required: true });

const { t } = useI18n();

const playerOptions = PLAYER_OPTIONS.map((n) => ({
  value: n,
  label: t.list.filter.playersValue(n),
}));
const timeOptions = TIME_BUCKETS.map((value) => ({
  value,
  label: t.list.filter.timeOptions[value],
}));
const weightOptions = WEIGHT_BUCKETS.map((value) => ({
  value,
  label: t.list.filter.weightOptions[value],
}));
const kindOptions = (['base', 'expansion'] as const).map((value) => ({
  value,
  label: t.list.filter.kindOptions[value],
}));

const ageOptions = AGE_OPTIONS.map((value) => ({ value, label: t.list.filter.ageValue(value) }));
const languageOptions = computed(() =>
  options.languages.map((l) => ({ value: l.code, label: l.label, count: l.count })),
);
const categoryOptions = computed(() =>
  options.categories.map((c) => ({ value: c.id, label: c.label, count: c.count })),
);
const mechanicOptions = computed(() =>
  options.mechanics.map((m) => ({ value: m.id, label: m.label, count: m.count })),
);
</script>

<template>
  <div class="space-y-6">
    <SegmentedControl
      v-model="players"
      :legend="t.list.filter.players"
      :options="playerOptions"
      nullable
      :null-label="t.list.filter.playersAny"
    />
    <ChipGroup v-model="time" :legend="t.list.filter.time" :options="timeOptions" />
    <ChipGroup v-model="weight" :legend="t.list.filter.weight" :options="weightOptions" />
    <SegmentedControl
      v-model="age"
      :legend="t.list.filter.ageOptions"
      :options="ageOptions"
      nullable
      :null-label="t.list.filter.playersAny"
    />

    <div class="space-y-3">
      <ChipGroup v-model="languages" :legend="t.list.filter.language" :options="languageOptions" />
      <!-- Etykieta obejmuje checkbox: cały wiersz (≥ 44 px) jest celem dotykowym. -->
      <label class="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
        <input v-model="polishRules" type="checkbox" class="size-5 rounded accent-accent" />
        {{ t.list.filter.polishRules }}
      </label>
    </div>

    <ChipGroup
      v-model="categories"
      :legend="t.list.filter.categories"
      :options="categoryOptions"
      :limit="12"
      searchable
    />
    <ChipGroup
      v-model="mechanics"
      :legend="t.list.filter.mechanics"
      :options="mechanicOptions"
      :limit="12"
      searchable
    />

    <SegmentedControl
      v-model="kind"
      :legend="t.list.filter.kind"
      :options="kindOptions"
      nullable
      :null-label="t.list.filter.kindOptions.all"
    />

    <label class="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold">
      <input v-model="favoritesOnly" type="checkbox" class="size-5 rounded accent-accent" />
      {{ t.list.filter.favoritesOnly }}
    </label>
  </div>
</template>
