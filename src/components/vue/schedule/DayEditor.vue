<script setup lang="ts">
import { computed, useId } from 'vue';
import { SCHEDULE_CAPTION_MAX } from '@/config/schedule';
import type { IconMeta } from '@/lib/schedule/icons';
import { isActive, type DayPlan } from '@/lib/schedule/plan';
import IconPicker from './IconPicker.vue';

const { name, date, icons } = defineProps<{
  name: string;
  /** „09.11” – data dnia, tylko do wyświetlenia. */
  date: string;
  /** Ikony dostępne w bieżącym motywie. */
  icons: readonly IconMeta[];
}>();
const emit = defineEmits<{ pickImage: [] }>();

/*
 * [Vue] defineModel (3.4+) = prop `modelValue` + zdarzenie `update:modelValue` w jednej linii;
 * rodzic pisze po prostu `v-model="plan.days[i]"`.
 *
 * Dzień to obiekt, więc `v-model="day.from"` na inpucie mutowałby obiekt należący do rodzica
 * (działa, ale łamie jednokierunkowy przepływ danych: rodzic nie dostaje zdarzenia i nie wie,
 * że coś się zmieniło). Zamiast tego każda zmiana wysyła w górę NOWY obiekt – `patch()`.
 */
const day = defineModel<DayPlan>({ required: true });
function patch(change: Partial<DayPlan>) {
  day.value = { ...day.value, ...change };
}

const active = computed(() => isActive(day.value));
/** Podana tylko jedna z godzin – dzień zostaje nieaktywny, więc podpowiadamy dlaczego. */
const incomplete = computed(() => !active.value && !!(day.value.from || day.value.to));
// [Vue] useId (3.5+): unikalne i stabilne id dla par label–input, także gdy komponent jest
// użyty 7 razy na stronie.
const id = useId();
const valueOf = (event: Event) => (event.target as HTMLInputElement).value;
const checkedOf = (event: Event) => (event.target as HTMLInputElement).checked;

const field =
  'mt-1 h-11 w-full rounded-full border border-line-strong bg-paper px-4 text-base text-ink focus:border-accent focus-visible:outline-offset-0 disabled:opacity-50';
</script>

<template>
  <fieldset class="rounded-card border border-line bg-surface p-4" :data-active="active">
    <legend class="px-2 font-display text-lg font-semibold">
      {{ name }} <span class="text-sm font-normal text-muted">{{ date }}</span>
    </legend>

    <div class="grid gap-3">
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label :for="`${id}-from`" class="block text-sm font-semibold">Od</label>
          <input
            :id="`${id}-from`"
            type="time"
            step="300"
            :class="field"
            :value="day.from"
            @input="patch({ from: valueOf($event) })"
          />
        </div>
        <div>
          <label :for="`${id}-to`" class="block text-sm font-semibold">Do</label>
          <input
            :id="`${id}-to`"
            type="time"
            step="300"
            :class="field"
            :value="day.to"
            @input="patch({ to: valueOf($event) })"
          />
        </div>
      </div>
      <p class="text-sm text-muted" role="status">
        <template v-if="active">Otwarte {{ day.from }}–{{ day.to }}.</template>
        <template v-else-if="incomplete"
          >Podaj obie godziny – na razie dzień jest nieczynny.</template
        >
        <template v-else>Nieczynne (brak godzin).</template>
        <button
          v-if="day.from || day.to"
          type="button"
          class="ml-1 underline"
          @click="patch({ from: '', to: '', additional: false })"
        >
          Wyczyść godziny
        </button>
      </p>

      <label class="flex items-center gap-2 text-sm" :class="{ 'opacity-50': !active }">
        <input
          type="checkbox"
          :checked="day.additional"
          :disabled="!active"
          @change="patch({ additional: checkedOf($event) })"
        />
        Dodany na ostatnią chwilę
      </label>

      <div>
        <!-- Zwykły tekst, nie <label>: wybierak to przycisk z listą, a nie pojedyncze pole. -->
        <p class="text-sm font-semibold">Ikona</p>
        <IconPicker
          :model-value="day.icon"
          :icons="icons"
          :disabled="!!day.image"
          @update:model-value="patch({ icon: $event })"
        />
      </div>

      <div v-if="day.image" class="flex items-center gap-3">
        <img
          :src="day.image.src"
          alt=""
          class="size-12 shrink-0 rounded-md bg-sunken object-contain"
        />
        <span class="min-w-0 flex-1 truncate text-sm">{{ day.image.title }}</span>
        <button type="button" class="btn btn-ghost" @click="patch({ image: null })">Usuń</button>
      </div>
      <div v-else>
        <button type="button" class="btn btn-ghost" @click="emit('pickImage')">
          Obrazek zamiast ikony…
        </button>
      </div>

      <div>
        <label :for="`${id}-caption`" class="block text-sm font-semibold">Podpis</label>
        <input
          :id="`${id}-caption`"
          type="text"
          autocomplete="off"
          :maxlength="SCHEDULE_CAPTION_MAX"
          :class="field"
          :value="day.caption"
          @input="patch({ caption: valueOf($event) })"
        />
      </div>

      <label class="flex items-center gap-2 text-sm" :class="{ 'opacity-50': !active }">
        <input
          type="checkbox"
          :checked="day.stamp"
          :disabled="!active"
          @change="patch({ stamp: checkedOf($event) })"
        />
        Pieczątka „Special event”
      </label>
    </div>
  </fieldset>
</template>
