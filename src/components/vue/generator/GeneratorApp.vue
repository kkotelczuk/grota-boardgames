<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId } from 'vue';
import type { Locale } from '@/lib/languages';
import type { GeneratorGame, SelectedItem } from '@/lib/generator/types';
import { GENERATOR_ACCESS_KEY, GENERATOR_MAX_GAMES } from '@/config/generator';
import { shuffle } from '@/lib/generator/shuffle';
import { provideI18n } from '../i18n';
import GamePicker from './GamePicker.vue';
import PasswordGate from './PasswordGate.vue';
import PosterPreview from './PosterPreview.vue';
import SelectedList from './SelectedList.vue';

const { locale, games, logoUrl } = defineProps<{
  locale: Locale;
  games: GeneratorGame[];
  logoUrl: string;
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
</script>

<template>
  <PasswordGate v-if="!unlocked" class="mt-6" @unlock="unlocked = true" />

  <div v-else class="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,540px)] lg:items-start">
    <div class="grid gap-8">
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

    <!-- Na mobile podgląd ląduje pod listą (kolejność w DOM), na desktopie przyklejony z prawej. -->
    <PosterPreview
      class="lg:sticky lg:top-24"
      :heading="heading"
      :items="selected"
      :logo-url="logoUrl"
    />
  </div>
</template>
