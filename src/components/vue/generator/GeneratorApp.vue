<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef, useId, watch } from 'vue';
import type { Locale } from '@/lib/languages';
import type { GeneratorGame, SelectedItem } from '@/lib/generator/types';
import { GENERATOR_ACCESS_KEY, GENERATOR_MAX_GAMES } from '@/config/generator';
import { shuffle } from '@/lib/generator/shuffle';
import type { PosterDesign } from '@/lib/generator/design';
import { decodeBackgroundFile, type BackgroundImage } from '@/lib/generator/render/background';
import { loadDesign, saveDesign } from '@/lib/generator/storage';
import { provideI18n } from '../i18n';
import DesignPanel from './DesignPanel.vue';
import GamePicker from './GamePicker.vue';
import PasswordGate from './PasswordGate.vue';
import PosterPreview from './PosterPreview.vue';
import SelectedList from './SelectedList.vue';

const { locale, games, logoUrls } = defineProps<{
  locale: Locale;
  games: GeneratorGame[];
  logoUrls: { dark: string; light: string };
}>();
const { t } = provideI18n(locale);

// ---------- Bramka hasła ----------

function hasAccess(): boolean {
  try {
    return localStorage.getItem(GENERATOR_ACCESS_KEY) === '1';
  } catch {
    return false; // storage zablokowany – po prostu pytamy o hasło
  }
}
// [Vue] Odczyt localStorage wprost w setup jest bezpieczny tylko dlatego, że wyspa ma
// `client:only` – przy SSR serwer nie zna localStorage i HTML różniłby się od klienta.
const unlocked = ref(hasAccess());

// ---------- Wybór (nic nie zapisujemy między wizytami) ----------

const selected = ref<SelectedItem[]>([]);
const heading = ref(t.generator.defaultHeading);
const headingId = useId();

const isFull = computed(() => selected.value.length >= GENERATOR_MAX_GAMES);
const selectedKeys = computed(() => new Set(selected.value.map((item) => item.key)));

/** Obrazki z urządzenia żyją jako blob: URL – trzeba je zwolnić, gdy przestają być potrzebne. */
function release(item: SelectedItem) {
  if (item.source === 'custom') URL.revokeObjectURL(item.cover);
}

function add(item: SelectedItem) {
  if (isFull.value || selectedKeys.value.has(item.key)) {
    release(item);
    return;
  }
  selected.value.push(item);
}

function remove(key: string) {
  const item = selected.value.find((i) => i.key === key);
  if (item) release(item);
  selected.value = selected.value.filter((i) => i.key !== key);
}

function clear() {
  selected.value.forEach(release);
  selected.value = [];
}

onBeforeUnmount(() => selected.value.forEach(release));

// ---------- Wygląd (zapamiętywany; zdjęcie tła – nie) ----------

const design = ref<PosterDesign>(loadDesign());
// Panel zawsze podmienia cały obiekt projektu, więc wystarczy płytki watch (bez `deep`).
watch(design, saveDesign);

/*
 * [Vue] shallowRef: canvas ze zdjęciem to duży obiekt DOM – głęboka reaktywność (proxy na
 * każdym polu) nic by nie dała, a kosztowała. Zmieniamy go tylko przez podmianę `.value`.
 */
const backgroundImage = shallowRef<BackgroundImage | null>(null);
const imageError = ref(false);
let imageCounter = 0;

async function setBackgroundImage(file: File | null) {
  imageError.value = false;
  if (!file) {
    backgroundImage.value = null;
    if (design.value.background.source === 'image') {
      design.value = {
        ...design.value,
        background: { ...design.value.background, source: 'preset' },
      };
    }
    return;
  }
  try {
    const source = await decodeBackgroundFile(file);
    backgroundImage.value = { id: ++imageCounter, source };
    design.value = { ...design.value, background: { ...design.value.background, source: 'image' } };
  } catch {
    imageError.value = true;
  }
}
</script>

<template>
  <PasswordGate v-if="!unlocked" class="mt-6" @unlock="unlocked = true" />

  <!--
    Kolejność w DOM = kolejność na mobile: gry → podgląd → wygląd (przy zmianie wyglądu podgląd
    jest tuż nad kontrolkami). Na desktopie siatka przenosi podgląd do prawej kolumny na całą
    wysokość (row-span-2) i przykleja go – bez duplikowania komponentów.
  -->
  <div v-else class="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,540px)] lg:items-start">
    <div class="grid gap-8 lg:col-start-1 lg:row-start-1">
      <div>
        <label :for="headingId" class="block text-sm font-semibold">
          {{ t.generator.headingLabel }}
        </label>
        <input
          :id="headingId"
          v-model="heading"
          type="text"
          maxlength="80"
          autocomplete="off"
          class="mt-2 h-11 w-full rounded-full border border-line-strong bg-surface px-4 text-base text-ink focus:border-accent focus-visible:outline-offset-0"
        />
      </div>

      <div>
        <GamePicker :games="games" :selected-keys="selectedKeys" :disabled="isFull" @add="add" />
        <p v-if="isFull" class="mt-3 text-sm font-semibold" role="status">
          {{ t.generator.limitReached }}
        </p>
      </div>

      <SelectedList
        :items="selected"
        :max="GENERATOR_MAX_GAMES"
        @remove="remove"
        @shuffle="selected = shuffle(selected)"
        @clear="clear"
      />
    </div>

    <PosterPreview
      class="lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1"
      :heading="heading"
      :items="selected"
      :design="design"
      :logo-urls="logoUrls"
      :background-image="backgroundImage"
    />

    <DesignPanel
      v-model="design"
      class="lg:col-start-1 lg:row-start-2"
      :has-image="backgroundImage !== null"
      :image-error="imageError"
      @image="setBackgroundImage"
    />
  </div>
</template>
