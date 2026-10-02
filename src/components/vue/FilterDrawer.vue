<script setup lang="ts">
import { onMounted, ref, useId, useTemplateRef, watch } from 'vue';
import AppIcon from './AppIcon.vue';
import { useI18n } from './i18n';

/**
 * Bottom sheet z filtrami (mobile). Oparty na natywnym <dialog> + showModal():
 * przeglądarka daje top layer, `inert` dla reszty strony (focus nie ucieknie – focus trap),
 * Esc (zdarzenie `cancel`) i przywrócenie focusu na przycisk otwierający.
 */
const open = defineModel<boolean>('open', { required: true });
const { title } = defineProps<{ title: string }>();
defineSlots<{ default(): unknown; footer(): unknown }>();

const { t } = useI18n();
const titleId = useId();
const dialog = useTemplateRef<HTMLDialogElement>('dialog');

/*
 * [Vue] Teleport a SSR: Astro nie wstawia treści teleportów do HTML-a, więc przy hydracji
 * Vue nie znalazłby ich w <body> (mismatch). Renderujemy dialog dopiero po zamontowaniu –
 * zamknięty dialog i tak nie jest potrzebny w HTML-u z serwera.
 */
const mounted = ref(false);
onMounted(() => (mounted.value = true));

// [Vue] watch (a nie computed): reagujemy efektem ubocznym na zmianę – wywołanie API DOM.
watch(open, (isOpen) => {
  const el = dialog.value;
  if (!el) return;
  if (isOpen && !el.open) el.showModal();
  if (!isOpen && el.open) el.close();
});

// ---------- Zamykanie gestem (przeciągnięcie w dół za uchwyt/nagłówek) ----------
const dragY = ref(0);
let startY: number | null = null;

function onPointerDown(event: PointerEvent) {
  startY = event.clientY;
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
}
function onPointerMove(event: PointerEvent) {
  if (startY != null) dragY.value = Math.max(0, event.clientY - startY);
}
function onPointerUp() {
  if (dragY.value > 100) open.value = false;
  dragY.value = 0;
  startY = null;
}

function onBackdropClick(event: MouseEvent) {
  // Klik w ::backdrop trafia w sam element <dialog>.
  if (event.target === dialog.value) open.value = false;
}
</script>

<template>
  <!--
    [Vue] Teleport do <body>. Przy showModal() dialog i tak trafia do top layer (overflow/z-index
    przodków go nie dotyczą), ale Teleport wynosi go poza DOM wyspy: nie staje się elementem
    siatki `lg:grid` rodzica, nie dziedziczy jego stylów i nie zależy od struktury listy.
  -->
  <Teleport v-if="mounted" to="body">
    <dialog
      ref="dialog"
      :aria-labelledby="titleId"
      class="sheet m-0 mt-auto max-h-[88dvh] w-full max-w-none rounded-t-3xl bg-paper p-0 text-ink shadow-lift"
      :style="dragY ? { transform: `translateY(${dragY}px)`, transition: 'none' } : undefined"
      @close="open = false"
      @cancel.prevent="open = false"
      @click="onBackdropClick"
    >
      <div class="flex max-h-[88dvh] flex-col">
        <header
          class="flex touch-none items-center gap-2 border-b border-line px-4 pt-2 pb-2 select-none"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
        >
          <span
            class="absolute top-2 left-1/2 h-1.5 w-10 -translate-x-1/2 rounded-full bg-line-strong"
            aria-hidden="true"
          />
          <h2 :id="titleId" class="flex-1 pt-3 font-display text-xl font-semibold">{{ title }}</h2>
          <button
            type="button"
            class="icon-btn mt-2"
            :aria-label="t.list.closeFilters"
            @click="open = false"
          >
            <AppIcon name="close" />
          </button>
        </header>
        <div class="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          <slot />
        </div>
        <footer
          class="border-t border-line bg-surface px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        >
          <slot name="footer" />
        </footer>
      </div>
    </dialog>
  </Teleport>
</template>

<style scoped>
.sheet::backdrop {
  background: rgb(20 19 17 / 0.5);
}
.sheet[open] {
  animation: sheet-in 280ms var(--ease-out-soft);
}
@keyframes sheet-in {
  from {
    transform: translateY(100%);
  }
}
</style>
