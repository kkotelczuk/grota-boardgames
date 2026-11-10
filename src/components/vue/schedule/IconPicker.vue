<script setup lang="ts">
import { computed, onWatcherCleanup, ref, useId, useTemplateRef, watch } from 'vue';
import { iconUrl } from '@/lib/schedule/assets';
import type { IconMeta } from '@/lib/schedule/icons';

const { icons, disabled = false } = defineProps<{
  /** Ikony dostępne w bieżącym motywie. */
  icons: readonly IconMeta[];
  disabled?: boolean;
}>();
/** Id wybranej ikony. */
const selected = defineModel<string>({ required: true });

const groups = computed(() =>
  [
    { label: 'Standardowe', icons: icons.filter((icon) => icon.standard) },
    { label: 'Okolicznościowe', icons: icons.filter((icon) => !icon.standard) },
  ].filter((group) => group.icons.length),
);
const current = computed(() => icons.find((icon) => icon.id === selected.value));

const id = useId();
const root = useTemplateRef<HTMLElement>('root');
const trigger = useTemplateRef<HTMLButtonElement>('trigger');
const panel = useTemplateRef<HTMLElement>('panel');
const open = ref(false);

function close(restoreFocus = true) {
  open.value = false;
  if (restoreFocus) trigger.value?.focus();
}

/*
 * Kliknięcie ikony: wybór ustawiamy sami i dopiero zamykamy. Samo `close()` na <label> usuwałoby
 * panel (v-if), zanim przeglądarka zdąży przekazać kliknięcie do ukrytego pola radio – zdarzenie
 * `change` nigdy by nie nastąpiło. Strzałki nadal idą natywnie przez v-model na polach radio.
 */
function pick(iconId: string) {
  selected.value = iconId;
  close();
}

/*
 * [Vue] Nasłuch „kliknięcia poza” istnieje tylko, gdy lista jest otwarta. `onWatcherCleanup`
 * (3.5+) rejestruje sprzątanie wprost w callbacku watchera: wykona się przed jego następnym
 * uruchomieniem i przy odmontowaniu komponentu – bez ręcznego pilnowania onBeforeUnmount.
 *
 * `flush: 'post'` – callback rusza po aktualizacji DOM, więc panel już istnieje i można
 * przenieść fokus na zaznaczoną ikonę (strzałki od razu działają).
 */
watch(
  open,
  (isOpen) => {
    if (!isOpen) return;
    const inputs = panel.value;
    (
      inputs?.querySelector<HTMLInputElement>('input:checked') ??
      inputs?.querySelector<HTMLInputElement>('input')
    )?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (!root.value?.contains(event.target as Node)) close(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    onWatcherCleanup(() => document.removeEventListener('pointerdown', onPointerDown));
  },
  { flush: 'post' },
);
// Ikona zablokowana (dzień dostał własny obrazek) – otwarta lista nie ma już sensu.
watch(
  () => disabled,
  (isDisabled) => isDisabled && close(false),
);
</script>

<template>
  <div ref="root" class="relative" @keydown.esc.stop="open && close()">
    <button
      ref="trigger"
      type="button"
      class="mt-1 flex h-14 w-full items-center gap-3 rounded-full border border-line-strong bg-paper px-4 text-left text-base text-ink focus:border-accent disabled:opacity-50"
      aria-haspopup="true"
      :aria-expanded="open"
      :aria-controls="`${id}-panel`"
      :disabled="disabled"
      @click="open = !open"
    >
      <img
        v-if="current"
        :src="iconUrl(current.id)"
        alt=""
        class="size-10 shrink-0 object-contain"
      />
      <span class="min-w-0 flex-1 truncate">{{ current?.label ?? 'Wybierz ikonę' }}</span>
      <span aria-hidden="true" class="text-muted">▾</span>
    </button>

    <!--
      Zwykłe pola radio (ukryte wizualnie) zamiast własnej obsługi klawiatury: strzałki, Tab
      i czytniki ekranu działają natywnie. Strzałki od razu zmieniają ikonę (widać ją na
      podglądzie), Enter albo kliknięcie zamyka listę.

      Enter obsługujemy na keyup, nie keydown: zamknięcie przenosi fokus na przycisk, a wciąż
      wciśnięty Enter od razu by go „kliknął” i otworzył listę z powrotem.
    -->
    <div
      v-if="open"
      :id="`${id}-panel`"
      ref="panel"
      role="radiogroup"
      aria-label="Ikona dnia"
      class="absolute inset-x-0 top-full z-20 mt-1 rounded-card border border-line-strong bg-paper p-3 shadow-card"
      @keyup.enter="close()"
    >
      <template v-for="group in groups" :key="group.label">
        <p class="mb-1 text-xs font-semibold text-muted not-first:mt-3">{{ group.label }}</p>
        <div class="grid grid-cols-4 gap-1.5">
          <label
            v-for="icon in group.icons"
            :key="icon.id"
            :title="icon.label"
            class="flex aspect-square cursor-pointer items-center justify-center rounded-xl border border-transparent p-1.5 hover:bg-sunken has-checked:border-accent has-checked:bg-sunken has-focus-visible:outline-2 has-focus-visible:outline-accent"
            @click.prevent="pick(icon.id)"
          >
            <input
              v-model="selected"
              type="radio"
              class="sr-only"
              :name="`${id}-icon`"
              :value="icon.id"
              :aria-label="icon.label"
            />
            <img :src="iconUrl(icon.id)" alt="" class="size-full object-contain" />
          </label>
        </div>
      </template>
    </div>
  </div>
</template>
