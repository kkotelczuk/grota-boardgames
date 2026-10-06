<script setup lang="ts">
import { computed, useId } from 'vue';
import {
  RADII,
  TILE_STYLES,
  type PosterDesign,
  type TileStyle,
  type TilesDesign,
} from '@/lib/generator/design';
import { useI18n } from '../i18n';
import DesignThumb from './DesignThumb.vue';
import OptionGroup from './OptionGroup.vue';

/** `design` – cały projekt, żeby miniatury stylów pokazywały kafelki na bieżącym tle. */
const { design } = defineProps<{ design: PosterDesign }>();
const model = defineModel<TilesDesign>({ required: true });
const { t } = useI18n();
const d = t.generator.design;

const field = <K extends keyof TilesDesign>(key: K) =>
  computed({
    get: () => model.value[key],
    set: (value: TilesDesign[K]) => (model.value = { ...model.value, [key]: value }),
  });
const style = field('style');
const radius = field('radius');
const shadow = field('shadow');
const labels = field('labels');

const styleOptions = TILE_STYLES.map((value) => ({ value, label: d.tileStyle[value] }));
const radiusOptions = RADII.map((value) => ({ value, label: d.radius[value] }));
const thumb = (value: TileStyle): PosterDesign => ({
  ...design,
  tiles: { ...model.value, style: value },
});
const ids = { shadow: useId(), labels: useId() };
</script>

<template>
  <div class="grid gap-6">
    <OptionGroup
      v-model="style"
      :legend="d.tileStyle.label"
      :options="styleOptions"
      variant="tiles"
    >
      <template #preview="{ value }">
        <DesignThumb :design="thumb(value)" :count="2" :size="64" />
      </template>
    </OptionGroup>

    <OptionGroup v-model="radius" :legend="d.radius.label" :options="radiusOptions" />

    <div class="flex flex-wrap gap-x-6">
      <label :for="ids.shadow" class="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
        <input :id="ids.shadow" v-model="shadow" type="checkbox" class="size-5 accent-(--accent)" />
        {{ d.shadow }}
      </label>
      <label :for="ids.labels" class="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
        <input :id="ids.labels" v-model="labels" type="checkbox" class="size-5 accent-(--accent)" />
        {{ d.labels }}
      </label>
    </div>
  </div>
</template>
