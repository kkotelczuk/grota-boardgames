<script setup lang="ts">
import { computed, ref, useId, useTemplateRef, watch } from 'vue';
import {
  FILL_KINDS,
  FOCUS_POINTS,
  FRAMES,
  PATTERNS,
  TEXT_COLORS,
  type BackgroundDesign,
  type Fill,
  type FillKind,
  type PosterDesign,
} from '@/lib/generator/design';
import { changeFillKind, randomBlob, randomFill } from '@/lib/generator/color';
import { BACKGROUND_PRESETS, presetById } from '@/lib/generator/presets';
import { mulberry32, randomSeed } from '@/lib/generator/random';
import { defaultDesign } from '@/lib/generator/themes';
import AppIcon from '../AppIcon.vue';
import { useI18n } from '../i18n';
import DesignThumb from './DesignThumb.vue';
import OptionGroup from './OptionGroup.vue';

const { hasImage, imageError } = defineProps<{ hasImage: boolean; imageError: boolean }>();
const emit = defineEmits<{ image: [file: File | null] }>();
const model = defineModel<BackgroundDesign>({ required: true });
const { t } = useI18n();
const d = t.generator.design;

/*
 * [Vue] Nigdy `model.value.pattern = …` – to zmieniłoby obiekt rodzica „bokiem”, bez
 * `update:modelValue`. Zawsze podmieniamy całość, a rodzic dostaje nowy obiekt.
 */
const patch = (part: Partial<BackgroundDesign>) => (model.value = { ...model.value, ...part });

// ---------- Rodzaj tła (zakładka lokalna – sam wybór zakładki jeszcze nic nie zmienia) ----------

type SourceTab = 'solid' | 'gradient' | 'custom' | 'image';
const initialTab = (): SourceTab => {
  if (model.value.source === 'image') return 'image';
  if (model.value.source === 'custom') return 'custom';
  return presetById(model.value.presetId).group;
};
const sourceTab = ref<SourceTab>(initialTab());
// Tło zmienione z zewnątrz (motyw, „Przywróć domyślny”, usunięcie zdjęcia) → zakładka nadąża.
watch(
  () => [model.value.source, model.value.presetId],
  () => (sourceTab.value = initialTab()),
);
const sourceOptions = (['solid', 'gradient', 'custom', 'image'] as const).map((value) => ({
  value,
  label: d.source[value],
}));

function onSourceTab(tab: SourceTab) {
  sourceTab.value = tab;
  // „Własne” startuje od kolorów bieżącego presetu – można je od razu modyfikować.
  if (tab === 'custom' && model.value.source !== 'custom') {
    const custom =
      model.value.source === 'preset'
        ? structuredClone(presetById(model.value.presetId).fill)
        : model.value.custom;
    patch({ source: 'custom', custom });
  }
  if (tab === 'image' && hasImage) patch({ source: 'image' });
}

// ---------- Presety ----------

const presets = computed(() =>
  BACKGROUND_PRESETS.filter((preset) => preset.group === sourceTab.value).map((preset) => ({
    value: preset.id,
    label: t.generator.backgrounds[preset.id] ?? preset.id,
  })),
);
const presetModel = computed<string | null>({
  get: () => (model.value.source === 'preset' ? model.value.presetId : null),
  set: (presetId) => presetId && patch({ source: 'preset', presetId }),
});
/** Miniatura: samo tło presetu (bez wzoru i ramki). */
const base = defaultDesign();
const presetThumb = (presetId: string): PosterDesign => ({
  ...base,
  background: {
    ...base.background,
    presetId,
    pattern: 'none',
    grain: false,
    frame: 'none',
  },
});

// ---------- Generator własnego tła ----------

const custom = computed(() => model.value.custom);
const setCustom = (fill: Fill) => patch({ custom: fill });
const kindOptions = FILL_KINDS.map((value) => ({ value, label: d.custom[value] }));
const kindModel = computed<FillKind>({
  get: () => custom.value.kind,
  set: (kind) => setCustom(changeFillKind(custom.value, kind, mulberry32(model.value.seed))),
});

/** Kolory wypełnienia jako jedna lista (mesh: baza + plamy). */
const colors = computed<string[]>(() => {
  const fill = custom.value;
  if (fill.kind === 'solid') return [fill.color];
  if (fill.kind === 'mesh') return [fill.base, ...fill.blobs.map((blob) => blob.color)];
  return fill.colors;
});
const maxColors = 4;
const minColors = computed(() => (custom.value.kind === 'solid' ? 1 : 2));

function setColors(next: string[]) {
  const fill = custom.value;
  if (fill.kind === 'solid') {
    setCustom({ ...fill, color: next[0]! });
  } else if (fill.kind === 'mesh') {
    const [baseColor, ...blobColors] = next as [string, ...string[]];
    const rng = mulberry32(randomSeed());
    const blobs = blobColors.map((color, i) =>
      fill.blobs[i] ? { ...fill.blobs[i], color } : randomBlob(rng, color),
    );
    setCustom({ ...fill, base: baseColor, blobs });
  } else {
    setCustom({ ...fill, colors: next });
  }
}
const setColor = (index: number, color: string) =>
  setColors(colors.value.map((c, i) => (i === index ? color : c)));
const addColor = () => setColors([...colors.value, colors.value.at(-1)!]);
const removeColor = (index: number) => setColors(colors.value.filter((_, i) => i !== index));
const colorLabel = (index: number) =>
  custom.value.kind === 'mesh' && index === 0 ? d.custom.base : d.custom.color(index + 1);

function randomize() {
  const seed = randomSeed();
  patch({ source: 'custom', custom: randomFill(mulberry32(seed)), seed });
}
function shuffleBlobs() {
  const fill = custom.value;
  if (fill.kind !== 'mesh') return;
  const rng = mulberry32(randomSeed());
  setCustom({ ...fill, blobs: fill.blobs.map((blob) => randomBlob(rng, blob.color)) });
}

// ---------- Zdjęcie ----------

const fileId = useId();
const fileInput = useTemplateRef<HTMLInputElement>('file');
function onFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) emit('image', file);
}
function removeImage() {
  if (fileInput.value) fileInput.value.value = '';
  emit('image', null);
}
const setImage = (part: Partial<BackgroundDesign['image']>) =>
  patch({ image: { ...model.value.image, ...part } });
const focusName = useId();

// ---------- Wspólne ----------

const patternOptions = PATTERNS.map((value) => ({ value, label: d.pattern[value] }));
const frameOptions = FRAMES.map((value) => ({ value, label: d.frame[value] }));
const textColorOptions = TEXT_COLORS.map((value) => ({ value, label: d.textColor[value] }));
const pattern = computed({ get: () => model.value.pattern, set: (pattern) => patch({ pattern }) });
const frame = computed({ get: () => model.value.frame, set: (frame) => patch({ frame }) });
const textColor = computed({
  get: () => model.value.textColor,
  set: (textColor) => patch({ textColor }),
});
const ids = { intensity: useId(), grain: useId(), angle: useId(), blur: useId(), dim: useId() };
</script>

<template>
  <div class="grid gap-6">
    <OptionGroup
      :model-value="sourceTab"
      :legend="d.source.label"
      :options="sourceOptions"
      @update:model-value="onSourceTab"
    />

    <!-- Presety: kolory / gradienty -->
    <OptionGroup
      v-if="sourceTab === 'solid' || sourceTab === 'gradient'"
      v-model="presetModel"
      :legend="d.presets"
      hide-legend
      :options="presets"
      variant="tiles"
    >
      <template #preview="{ value }">
        <DesignThumb v-if="value" :design="presetThumb(value)" :size="56" />
      </template>
    </OptionGroup>

    <!-- Generator własnego tła -->
    <div v-else-if="sourceTab === 'custom'" class="grid gap-5">
      <OptionGroup v-model="kindModel" :legend="d.custom.type" :options="kindOptions" />

      <fieldset class="min-w-0">
        <legend class="mb-2 text-sm font-semibold">{{ d.custom.colors }}</legend>
        <ul class="flex flex-wrap items-center gap-3">
          <li v-for="(color, i) in colors" :key="i" class="flex items-center gap-1">
            <label class="flex items-center gap-2 text-sm">
              <input
                type="color"
                :value="color"
                class="size-11 cursor-pointer rounded-lg border border-line-strong bg-surface p-1"
                @input="setColor(i, ($event.target as HTMLInputElement).value)"
              />
              <span>{{ colorLabel(i) }}</span>
            </label>
            <button
              v-if="colors.length > minColors && !(custom.kind === 'mesh' && i === 0)"
              type="button"
              class="icon-btn text-muted"
              :aria-label="d.custom.removeColor(i + 1)"
              @click="removeColor(i)"
            >
              <AppIcon name="close" :size="16" />
            </button>
          </li>
          <li v-if="custom.kind !== 'solid' && colors.length < maxColors">
            <button type="button" class="btn btn-ghost" @click="addColor">
              {{ d.custom.addColor }}
            </button>
          </li>
        </ul>
      </fieldset>

      <div v-if="custom.kind === 'linear'">
        <label :for="ids.angle" class="block text-sm font-semibold">
          {{ d.custom.angle }}: <output :for="ids.angle">{{ custom.angle }}°</output>
        </label>
        <input
          :id="ids.angle"
          type="range"
          min="0"
          max="345"
          step="15"
          :value="custom.angle"
          class="mt-2 w-full accent-(--accent)"
          @input="
            setCustom({ ...custom, angle: Number(($event.target as HTMLInputElement).value) })
          "
        />
      </div>

      <div class="flex flex-wrap gap-2">
        <button type="button" class="btn btn-primary" @click="randomize">
          {{ d.custom.random }}
        </button>
        <button
          v-if="custom.kind === 'mesh'"
          type="button"
          class="btn btn-ghost"
          @click="shuffleBlobs"
        >
          {{ d.custom.randomLayout }}
        </button>
      </div>
    </div>

    <!-- Zdjęcie -->
    <div v-else class="grid gap-5">
      <div>
        <label :for="fileId" class="block text-sm font-semibold">{{ d.image.file }}</label>
        <input
          :id="fileId"
          ref="file"
          type="file"
          accept="image/*"
          class="mt-2 block w-full text-sm file:mr-3 file:rounded-full file:border file:border-line-strong file:bg-paper file:px-4 file:py-2 file:font-semibold file:text-ink"
          @change="onFile"
        />
        <p v-if="imageError" class="mt-2 text-sm font-semibold text-heart" role="alert">
          {{ t.generator.imageError }}
        </p>
        <p v-else-if="!hasImage" class="mt-2 text-sm text-muted">{{ d.image.empty }}</p>
      </div>

      <template v-if="hasImage">
        <fieldset>
          <legend class="mb-2 text-sm font-semibold">{{ d.image.focus }}</legend>
          <div class="grid w-fit grid-cols-3 gap-1">
            <label
              v-for="point in FOCUS_POINTS"
              :key="point"
              class="grid size-11 cursor-pointer place-items-center rounded-lg border border-line bg-surface focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-(--focus) hover:border-ink has-[:checked]:border-accent has-[:checked]:bg-accent-soft"
            >
              <input
                type="radio"
                class="sr-only"
                :name="focusName"
                :value="point"
                :checked="model.image.focus === point"
                @change="setImage({ focus: point })"
              />
              <span class="sr-only">{{ d.image.focusPoints[point] }}</span>
              <span class="size-2.5 rounded-full bg-current" aria-hidden="true" />
            </label>
          </div>
        </fieldset>

        <div>
          <label :for="ids.blur" class="block text-sm font-semibold">
            {{ d.image.blur }}: <output :for="ids.blur">{{ model.image.blur }} px</output>
          </label>
          <input
            :id="ids.blur"
            type="range"
            min="0"
            max="30"
            step="1"
            :value="model.image.blur"
            class="mt-2 w-full accent-(--accent)"
            @input="setImage({ blur: Number(($event.target as HTMLInputElement).value) })"
          />
        </div>
        <div>
          <label :for="ids.dim" class="block text-sm font-semibold">
            {{ d.image.dim }}: <output :for="ids.dim">{{ model.image.dim }}%</output>
          </label>
          <input
            :id="ids.dim"
            type="range"
            min="-60"
            max="60"
            step="5"
            :value="model.image.dim"
            class="mt-2 w-full accent-(--accent)"
            @input="setImage({ dim: Number(($event.target as HTMLInputElement).value) })"
          />
        </div>
        <div>
          <button type="button" class="btn btn-ghost" @click="removeImage">
            {{ d.image.remove }}
          </button>
        </div>
      </template>
    </div>

    <hr class="border-line" />

    <div class="grid gap-3">
      <OptionGroup v-model="pattern" :legend="d.pattern.label" :options="patternOptions" />
      <div v-if="model.pattern !== 'none'">
        <label :for="ids.intensity" class="block text-sm font-semibold">
          {{ d.pattern.intensity }}
        </label>
        <input
          :id="ids.intensity"
          type="range"
          min="0"
          max="1"
          step="0.05"
          :value="model.patternOpacity"
          class="mt-2 w-full accent-(--accent)"
          @input="patch({ patternOpacity: Number(($event.target as HTMLInputElement).value) })"
        />
      </div>
    </div>

    <label :for="ids.grain" class="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
      <input
        :id="ids.grain"
        type="checkbox"
        :checked="model.grain"
        class="size-5 accent-(--accent)"
        @change="patch({ grain: ($event.target as HTMLInputElement).checked })"
      />
      {{ d.grain }}
    </label>

    <OptionGroup v-model="frame" :legend="d.frame.label" :options="frameOptions" />
    <OptionGroup v-model="textColor" :legend="d.textColor.label" :options="textColorOptions" />
  </div>
</template>
