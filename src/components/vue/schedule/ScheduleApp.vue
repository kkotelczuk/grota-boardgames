<script setup lang="ts">
import { ref } from 'vue';
import { hasToolAccess } from '@/lib/generator/access';
import type { GeneratorGame } from '@/lib/generator/types';
import PasswordGate from '../generator/PasswordGate.vue';
import { provideI18n } from '../i18n';
import ScheduleEditor from './ScheduleEditor.vue';

const { games } = defineProps<{ games: GeneratorGame[] }>();
/*
 * [Vue] provide działa „w dół drzewa”: słownik wstrzyknięty tutaj dostają i bramka hasła,
 * i wyszukiwarka gier głęboko w edytorze – oba komponenty pochodzą z generatora grafik.
 */
provideI18n('pl');

// [Vue] Odczyt localStorage w setup jest bezpieczny, bo wyspa ma `client:only` (brak SSR).
const unlocked = ref(hasToolAccess());
</script>

<template>
  <!--
    [Vue] Edytor jest osobnym komponentem pod v-else, a nie fragmentem tego szablonu: dopóki
    hasło nie padnie, jego setup w ogóle się nie wykona – nie czytamy zapisanego rozkładu,
    nie ładujemy fontów ani obrazków i nie zakładamy watcherów „na zapas”.
  -->
  <PasswordGate v-if="!unlocked" class="mt-6" @unlock="unlocked = true" />
  <ScheduleEditor v-else :games="games" />
</template>
