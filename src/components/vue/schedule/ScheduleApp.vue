<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue';
import type { GeneratorGame, SelectedItem } from '@/lib/generator/types';
import { iconsOf } from '@/lib/schedule/icons';
import { toStorableImage } from '@/lib/schedule/image';
import {
  DAY_NAMES,
  ICON_SET,
  THEME_IDS,
  addDays,
  mondayOf,
  nextWeek,
  weekRange,
  withIcons,
  withTheme,
  type DayPlan,
  type ThemeId,
  type WeekPlan,
} from '@/lib/schedule/plan';
import { loadPlan, savePlan } from '@/lib/schedule/storage';
import { THEMES } from '@/lib/schedule/themes';
import GamePicker from '../generator/GamePicker.vue';
import { provideI18n } from '../i18n';
import DayEditor from './DayEditor.vue';
import SchedulePreview from './SchedulePreview.vue';

const { games } = defineProps<{ games: GeneratorGame[] }>();
// Wyszukiwarka gier (GamePicker) pochodzi z generatora grafik i bierze napisy ze słownika.
provideI18n('pl');

// ---------- Stan: jeden rozkład, zawsze zapisany w przeglądarce ----------

/*
 * [Vue] Odczyt localStorage wprost w setup jest bezpieczny tylko dlatego, że wyspa ma
 * `client:only` – przy SSR serwer nie zna localStorage i HTML różniłby się od klienta.
 */
const plan = ref<WeekPlan>(loadPlan());
const saveFailed = ref(false);
/*
 * [Vue] `deep: true`, bo zmiany bywają zagnieżdżone (`plan.days[i] = …`). Cała logika zmian
 * (nowy tydzień, motyw, losowanie) to czyste funkcje w `lib/schedule/plan.ts` – komponent
 * tylko podmienia stan, dzięki czemu reguły da się testować bez montowania czegokolwiek.
 */
watch(plan, (value) => (saveFailed.value = !savePlan(value)), { deep: true });

const icons = computed(() => iconsOf(ICON_SET[plan.value.theme]));
const range = computed(() => weekRange(plan.value.monday));
const dayDate = (index: number) => weekRange(addDays(plan.value.monday, index)).slice(0, 5);

function setWeek(event: Event) {
  // Rozkład zawsze zaczyna się od poniedziałku: dowolny wybrany dzień wskazuje swój tydzień.
  const monday = mondayOf((event.target as HTMLInputElement).value);
  if (monday) plan.value = { ...plan.value, monday };
}

function setTheme(theme: ThemeId) {
  plan.value = withTheme(plan.value, theme);
}

function startNewWeek() {
  if (
    !confirm('Zacząć nowy rozkład? Godziny, obrazki, podpisy i pieczątki zostaną wyczyszczone.')
  ) {
    return;
  }
  plan.value = nextWeek(plan.value);
}

// ---------- Własny obrazek dnia (kolekcja, BGG albo plik z urządzenia) ----------

const dialog = useTemplateRef<HTMLDialogElement>('dialog');
const pickingDay = ref<number | null>(null);
const imageError = ref('');
const NO_KEYS: ReadonlySet<string> = new Set();

function openPicker(index: number) {
  pickingDay.value = index;
  imageError.value = '';
  dialog.value?.showModal();
}

async function setImage(item: SelectedItem) {
  const index = pickingDay.value;
  if (index === null) return;
  imageError.value = '';
  try {
    if (!item.cover) throw new Error('no-cover');
    // Plik z urządzenia to `blob:` URL – zamieniamy na trwały `data:` URL i zwalniamy bloba.
    const src = item.source === 'custom' ? await toStorableImage(item.cover) : item.cover;
    const day: DayPlan = { ...plan.value.days[index]!, image: { title: item.title, src } };
    plan.value.days[index] = day;
    dialog.value?.close();
  } catch {
    imageError.value = item.cover
      ? 'Nie udało się wczytać tego obrazka.'
      : 'Ta gra nie ma okładki – wybierz inną albo wgraj obrazek z urządzenia.';
  } finally {
    if (item.source === 'custom') URL.revokeObjectURL(item.cover);
  }
}
</script>

<template>
  <div class="mt-6 grid gap-8">
    <SchedulePreview :plan="plan" />

    <section aria-labelledby="schedule-week" class="grid gap-5">
      <h2 id="schedule-week" class="font-display text-2xl font-semibold">Tydzień i wygląd</h2>

      <div class="flex flex-wrap items-end gap-4">
        <div>
          <label for="schedule-monday" class="block text-sm font-semibold">
            Tydzień (dowolny dzień – liczymy od poniedziałku)
          </label>
          <input
            id="schedule-monday"
            type="date"
            :value="plan.monday"
            class="mt-1 h-11 rounded-full border border-line-strong bg-surface px-4 text-base text-ink focus:border-accent focus-visible:outline-offset-0"
            @change="setWeek"
          />
        </div>
        <p class="pb-2.5 font-semibold" role="status">{{ range }}</p>
        <button type="button" class="btn btn-primary" @click="startNewWeek">Nowy rozkład</button>
        <button type="button" class="btn btn-ghost" @click="plan = withIcons(plan)">
          Losuj ikony
        </button>
      </div>

      <!--
        [Vue] Grupa radio bez v-model: wybór motywu to nie tylko przypisanie pola – zmiana
        zestawu ikon wymaga przelosowania, więc idziemy przez `setTheme()`.
      -->
      <fieldset>
        <legend class="text-sm font-semibold">Motyw</legend>
        <div class="mt-2 flex flex-wrap gap-2">
          <label v-for="id in THEME_IDS" :key="id" class="chip cursor-pointer">
            <input
              type="radio"
              name="schedule-theme"
              class="sr-only"
              :value="id"
              :checked="plan.theme === id"
              @change="setTheme(id)"
            />
            {{ THEMES[id].label }}
          </label>
        </div>
      </fieldset>

      <p v-if="saveFailed" class="text-sm font-semibold" role="alert">
        Nie udało się zapisać rozkładu w przeglądarce (brak miejsca albo zablokowana pamięć) – po
        odświeżeniu strony zmiany przepadną.
      </p>
    </section>

    <section aria-labelledby="schedule-days">
      <h2 id="schedule-days" class="font-display text-2xl font-semibold">Dni</h2>
      <div class="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <!-- Klucz = indeks: dni jest zawsze 7 i nie zmieniają kolejności. -->
        <DayEditor
          v-for="(name, index) in DAY_NAMES"
          :key="index"
          v-model="plan.days[index]!"
          :name="name"
          :date="dayDate(index)"
          :icons="icons"
          @pick-image="openPicker(index)"
        />
      </div>
    </section>

    <!--
      Natywny <dialog>: showModal() daje za darmo pułapkę fokusu, zamykanie Escape i tło.
      Wyszukiwarkę montujemy dopiero po otwarciu (v-if) – każdy dzień zaczyna z pustym polem.
    -->
    <dialog
      ref="dialog"
      aria-labelledby="schedule-picker"
      class="m-auto w-[min(36rem,calc(100vw-2rem))] rounded-card border border-line bg-paper p-5 text-ink backdrop:bg-black/50"
      @close="pickingDay = null"
    >
      <div class="flex items-center justify-between gap-4">
        <h2 id="schedule-picker" class="font-display text-xl font-semibold">
          Obrazek: {{ pickingDay === null ? '' : DAY_NAMES[pickingDay] }}
        </h2>
        <button type="button" class="btn btn-ghost" @click="dialog?.close()">Zamknij</button>
      </div>
      <p v-if="imageError" class="mt-3 text-sm font-semibold" role="alert">{{ imageError }}</p>
      <GamePicker
        v-if="pickingDay !== null"
        class="mt-4"
        :games="games"
        :selected-keys="NO_KEYS"
        :disabled="false"
        @add="setImage"
      />
    </dialog>
  </div>
</template>
