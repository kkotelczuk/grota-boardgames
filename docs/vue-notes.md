# Notatki Vue – Grota (Astro 7 + Vue 3.5)

Ten dokument tłumaczy **każdy koncept Vue, który faktycznie występuje w kodzie projektu**, na poziomie potrzebnym na stanowisko senior. Nie jest to kurs Vue od zera, tylko komentarz do konkretnego kodu: co zostało użyte, gdzie, dlaczego tak, co można było zrobić inaczej i o co zapytają na rozmowie.

## Jak korzystać

- Każda sekcja ma ten sam układ: **Co to jest → Gdzie w projekcie → Dlaczego tak → Alternatywy i trade-offy → Pułapki → Pytania rekrutacyjne (senior)**.
- Odwołania mają postać `ścieżka/plik:LINIA` (stan kodu w chwili pisania). Jeśli kod się przesunie, szukaj po fragmencie, a kluczowe decyzje znajdziesz też przez `grep -rn "\[Vue\]" src` – komentarze z prefiksem `// [Vue]` / `<!-- [Vue] -->` oznaczają miejsca, w których podjęto świadomą decyzję.
- Wersje: Vue **3.5.43**, `@vueuse/core` **15.0.0**, Astro **7.3.5**, `@astrojs/vue` **7.0.3**, Vitest 5, `@vue/test-utils` 2.5.
- Najlepiej czytać z otwartym edytorem; na końcu jest [Ścieżka nauki](#sciezka-nauki) z ćwiczeniami.

### Mapa plików

| Plik                                                                                                          | Rola                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/vue/GameExplorer.vue`                                                                         | Wyspa `client:load` na stronie głównej: wyszukiwarka, filtry, lista 252 kart (stabilny scoped slot), skrót „/” (`onKeyStroke` + ref do `SearchBox`). Korzeń drzewa – `provideI18n`. |
| `src/components/vue/GameCard.vue`                                                                             | Karta gry (prezentacyjna), scoped slot `actions` typowany `defineSlots`, rozwijana lista dodatków.                                                                                  |
| `src/components/vue/FilterPanel.vue`                                                                          | Panel filtrów – 10 nazwanych `defineModel`.                                                                                                                                         |
| `src/components/vue/FilterDrawer.vue`                                                                         | Bottom sheet na mobile: `Teleport` + natywny `<dialog>`, `watch`, `defineSlots`.                                                                                                    |
| `src/components/vue/ChipGroup.vue`, `SegmentedControl.vue`, `SelectField.vue`                                 | Generyczne kontrolki formularza (`generic="T …"`) z `defineModel`.                                                                                                                  |
| `src/components/vue/SearchBox.vue`                                                                            | Pole wyszukiwania: `defineModel`, `useTemplateRef`, `useId`, `defineExpose`.                                                                                                        |
| `src/components/vue/FavoriteButton.vue`                                                                       | Serduszko – w liście (dziecko, `@toggle` → komunikat `aria-live`) i jako samodzielna wyspa na stronie gry. `defineEmits`.                                                           |
| `src/components/vue/FavoritesCounter.vue`, `ThemeToggle.vue`                                                  | Małe wyspy `client:idle` w headerze; `ThemeToggle` obserwuje `data-theme` (`useMutationObserver`).                                                                                  |
| `src/components/vue/FavoritesList.vue`                                                                        | Wyspa `client:load` na stronie ulubionych, `TransitionGroup`.                                                                                                                       |
| `src/components/vue/AppIcon.vue`                                                                              | Ikony SVG (fallthrough atrybutów).                                                                                                                                                  |
| `src/components/vue/i18n.ts`                                                                                  | `provide`/`inject` z typowanym `InjectionKey`.                                                                                                                                      |
| `src/composables/useFavorites.ts`                                                                             | Singleton modułu współdzielony między wyspami + bramkowanie hydracji.                                                                                                               |
| `src/composables/useGameFilters.ts`                                                                           | Stan filtrów (`ref`) + wyniki (`computed`), `MaybeRefOrGetter`.                                                                                                                     |
| `src/composables/useGameSearch.ts`                                                                            | Debounce frazy (`refDebounced`).                                                                                                                                                    |
| `src/composables/useUrlQueryState.ts`                                                                         | Synchronizacja stanu z query stringiem (`watchDebounced`, `popstate`).                                                                                                              |
| `src/lib/filters.ts`, `src/lib/game-index.ts`                                                                 | Czysta logika (bez Vue) i typ `GameIndexItem` przekazywany do wysp.                                                                                                                 |
| `src/views/*.astro`, `src/components/SiteHeader.astro`, `src/layouts/BaseLayout.astro`                        | Granice wysp i dyrektywy `client:*`.                                                                                                                                                |
| `tests/unit/components.test.ts`, `useFavorites.test.ts`, `useGameFilters.test.ts`, `useUrlQueryState.test.ts` | Testy komponentów i composables (Vitest + jsdom + `@vue/test-utils`).                                                                                                               |

## Spis treści

1. [`<script setup lang="ts">` i makra kompilatora](#script-setup)
2. [`defineProps` z typami TS i reactive props destructure (3.5)](#define-props)
3. [`defineEmits` – typowana składnia krotek](#define-emits)
4. [`defineModel` – pojedynczy, wiele nazwanych, w komponentach generycznych](#define-model)
5. [Zapisywalny `computed` jako adapter `v-model`](#writable-computed)
6. [Komponenty generyczne (`generic="T extends …"`)](#generic)
7. [Sloty, scoped slots i `defineSlots`](#slots)
8. [`defineExpose`](#define-expose)
9. [`useTemplateRef` (3.5)](#use-template-ref)
10. [`useId` (3.5) i id stabilne między SSR a klientem](#use-id)
11. [`ref` vs `shallowRef` vs `reactive` (i `markRaw`)](#ref-shallowref)
12. [`computed` vs `watch` vs `watchEffect`](#computed-watch)
13. [Projektowanie composables (`MaybeRefOrGetter`, `toValue`, czysta logika obok)](#composables)
14. [VueUse: `refDebounced`, `watchDebounced`, `useMediaQuery`, `onKeyStroke`, `useMutationObserver`](#vueuse)
15. [`provide` / `inject` z typowanym `InjectionKey`](#provide-inject)
16. [`Teleport` i natywny `<dialog>` / `showModal()`](#teleport)
17. [`Transition` i `TransitionGroup`](#transitions)
18. [Fallthrough attributes i `<style scoped>` / `:deep()`](#attrs-scoped)
19. [Cykl życia: `onMounted` / `onBeforeUnmount`](#lifecycle)
20. [SSR i hydracja w wyspach Astro](#ssr-hydration)
21. [Stan współdzielony między wyspami – singleton modułu](#shared-state)
22. [Pinia – świadomie nieużyta](#pinia)
23. [Lazy hydration w Vue 3.5 – rozważona, nieużyta](#lazy-hydration)
24. [Testowanie composables i komponentów](#testing)
25. [Ścieżka nauki](#sciezka-nauki)

---

<a id="script-setup"></a>

## 1. `<script setup lang="ts">` i makra kompilatora

### Co to jest

`<script setup>` to cukier składniowy kompilatora SFC: zawartość bloku staje się ciałem funkcji `setup()`, a wszystkie top-level bindingi (zmienne, funkcje, importy komponentów) są automatycznie dostępne w szablonie. Makra kompilatora (`defineProps`, `defineEmits`, `defineModel` – stabilne od 3.4, `defineSlots`/`defineOptions` – od 3.3, `defineExpose`, `withDefaults`) nie są importowane ani wywoływane w runtime – kompilator `@vue/compiler-sfc` zamienia je na opcje komponentu (`props`, `emits`…). W buildzie produkcyjnym szablon jest kompilowany „inline” do domknięcia `setup`, więc ma bezpośredni dostęp do zmiennych bez proxy instancji. Komponent z `<script setup>` jest domyślnie **zamknięty** – rodzic przez template ref nic nie widzi, dopóki nie użyjesz `defineExpose`.

### Gdzie w projekcie

Wszystkie komponenty w `src/components/vue/` (np. `src/components/vue/SearchBox.vue:1`). Typowy początek pliku:

```vue
<!-- src/components/vue/SearchBox.vue:1-8 -->
<script setup lang="ts">
import { useId, useTemplateRef } from 'vue';
import AppIcon from './AppIcon.vue';
import { useI18n } from './i18n';

// [Vue] defineModel = prop `modelValue` + emit `update:modelValue` w jednym, zapisywalnym refie.
const query = defineModel<string>({ required: true });
const { t } = useI18n();
```

Tak wygląda wynik kompilacji makr w `ChipGroup.vue` (wygenerowane przez `compileScript`, nie ma tego w repo):

```js
props: /*@__PURE__*/_mergeModels({
    legend: { type: String, required: true },
    options: { type: Array, required: true },
    limit: { type: Number, required: false, default: () => (Infinity) },
    searchable: { type: Boolean, required: false, default: false }
  }, { "modelValue": { type: Array, ...{ required: true } }, "modelModifiers": {} }),
emits: ["update:modelValue"],
```

### Dlaczego tak

Wymóg projektu to wyłącznie Composition API. `<script setup>` daje najmniej boilerplate'u, najlepszą inferencję typów w `vue-tsc` (typy propsów, emitów i slotów są wyprowadzane z deklaracji TS) i najmniejszy kod wynikowy (szablon inline, bez proxy `this`). Typy propsów piszemy raz – w TS – a kompilator generuje z nich runtime'owe `props` (z `type`, `required`, `default`).

### Alternatywy i trade-offy

- **`defineComponent({ setup() { … return {…} } })`** – jawne, działa bez SFC (np. w testach: `tests/unit/useFavorites.test.ts:13`), ale trzeba ręcznie zwracać bindingi i deklarować `props`/`emits` w runtime albo przez generyki `defineComponent`.
- **Options API** – czytelne dla juniorów, ale słaba kompozycja logiki (mixiny) i gorsze typowanie; w nowym kodzie Vue 3 to wybór „legacy”.
- **Render functions / JSX** – pełna moc JS, brak optymalizacji kompilatora szablonów (patch flags, hoisting statycznych węzłów).

### Pułapki

- Argumenty makr są **wynoszone poza `setup()`** – nie mogą odwoływać się do lokalnych zmiennych (`defineProps({ x: { default: localVar } })` to błąd kompilacji); mogą do importów i literałów.
- Typy w `defineProps<…>()` muszą być analizowalne statycznie przez kompilator (od 3.3 obsługuje importowane typy i część typów złożonych, ale np. typy warunkowe o zależnościach z zewnątrz nadal bywają problemem).
- Komponent jest zamknięty – `ref` na komponent zwraca pusty obiekt publiczny bez `defineExpose`.
- `await` na top-levelu `<script setup>` robi z komponentu komponent asynchroniczny (wymaga `<Suspense>`; Astro opakowuje taki komponent w `Suspense` – patrz `node_modules/@astrojs/vue/dist/client.js:25-27`).

### Pytania rekrutacyjne (senior)

1. **Czym różni się `<script setup>` od `setup()` w `defineComponent` pod względem wyniku kompilacji?** – W `<script setup>` szablon jest kompilowany inline do domknięcia `setup`, więc odwołania do zmiennych są bezpośrednie (bez `_ctx`/proxy), a makra zamieniane są na opcje komponentu. W `setup()` zwracasz obiekt, który trafia do proxy renderu.
2. **Dlaczego makra nie wymagają importu i czemu nie mogą używać lokalnych zmiennych?** – Bo to instrukcje dla kompilatora, nie funkcje runtime; ich argumenty trafiają do definicji komponentu poza funkcją `setup`, gdzie lokalny scope nie istnieje.
3. **Kiedy użyjesz `defineOptions`?** – Gdy potrzebujesz opcji komponentu, których nie da się wyrazić makrem, np. `inheritAttrs: false` albo `name` (od 3.3), bez drugiego bloku `<script>`.

---

<a id="define-props"></a>

## 2. `defineProps` z typami TS i reactive props destructure (3.5)

### Co to jest

`defineProps<T>()` deklaruje propsy na podstawie typu TS. Od **Vue 3.5** destrukturyzacja wyniku (`const { a, b = 1 } = defineProps<…>()`) jest stabilna i reaktywna: kompilator zamienia każde odwołanie do `a` na `__props.a`, więc odczyt w `computed`/szablonie śledzi zależność. Wartości domyślne piszemy składnią domyślnych JS – `withDefaults()` przestaje być potrzebne, a dla wartości nieprymitywnych (np. `[]`) kompilator sam generuje fabrykę `default: () => ([])`. Obiekt `__props` jest `shallowReactive`.

### Gdzie w projekcie

- `src/components/vue/FavoriteButton.vue:12-23` – destrukturyzacja z domyślną wartością `variant = 'overlay'`.
- `src/components/vue/GameCard.vue:12-16` – `expansions = []` (kompilator generuje `default: () => ([])`).
- `src/components/vue/ChipGroup.vue:17-29` – `limit = Infinity`, `searchable = false`.
- `src/components/vue/GameExplorer.vue:37` – przekazanie propsa do composable jako getter `() => games`.

```ts
// src/components/vue/FavoriteButton.vue:12-23
const {
  id,
  title,
  locale,
  variant = 'overlay',
} = defineProps<{
  id: string;
  title: string;
  /** Potrzebne tylko, gdy przycisk jest samodzielną wyspą (bez provideI18n wyżej w drzewie). */
  locale?: Locale;
  variant?: 'overlay' | 'full';
}>();
```

```ts
// src/components/vue/GameExplorer.vue:37-41 – getter zachowuje reaktywność; `locale` idzie jako wartość
const { state, results, activeCount, reset } = useGameFilters(() => games, {
  locale,
  favorites,
  query: debouncedQuery,
});
```

Po kompilacji: `useGameFilters(() => __props.games, { locale: __props.locale, … })`.

### Dlaczego tak

Destrukturyzacja czyta się jak zwykły JS (bez `props.` w każdej linii) i daje wartości domyślne bez `withDefaults`. W `GameExplorer` lista gier idzie do composable jako **getter**, bo tylko on zachowuje reaktywność po destrukturyzacji. `locale` przekazujemy świadomie jako zwykłą wartość (snapshot) – w wyspie Astro propsy nie zmieniają się po hydracji (strona nie używa `ClientRouter`, więc ta sama wyspa nie dostaje nowych propsów), a `Intl.Collator` i słownik są tworzone raz.

### Alternatywy i trade-offy

- **`const props = defineProps<…>()`** + `props.x` – zero „magii” kompilatora, oczywiste dla każdego; ale więcej szumu i trzeba `withDefaults` dla domyślnych.
- **`withDefaults(defineProps<…>(), { … })`** – nadal wspierane; potrzebne tylko, jeśli nie destrukturyzujesz (projekt go nie używa, zgodnie z zasadą „tylko gdy potrzebne”).
- **`toRefs(props)`** – stary sposób na reaktywną destrukturyzację; generuje refy (`x.value`), więcej kodu.

### Pułapki

- **Przekazanie zdestrukturyzowanego propsa do funkcji przekazuje wartość, nie reaktywne źródło.** `useSomething(id)` dostaje snapshot; trzeba `useSomething(() => id)` i `toValue()` po drugiej stronie.
- `watch(id, …)` i `toRef(id)` – kompilator 3.5 zgłasza **błąd kompilacji** („destructured prop … should not be passed directly to watch()”); poprawnie: `watch(() => id, …)`.
- Kod poza `<script setup>` (np. w composable) nie jest transformowany – tam destrukturyzacja `props` zabija reaktywność (reguła ESLint `vue/no-setup-props-reactivity-loss`).
- Props są `shallowReactive`: mutacja zagnieżdżona (`game.title = …`) nie jest śledzona przez props i łamie jednokierunkowy przepływ danych.
- Typ: `variant` po destrukturyzacji z domyślną ma typ `'overlay' | 'full'` (bez `undefined`) – to celowe, ale przy `locale?: Locale` bez domyślnej pamiętaj o `undefined`.

### Pytania rekrutacyjne (senior)

1. **Jak działa reactive props destructure i dlaczego nie łamie reaktywności?** – To transformacja kompilatora: każdy odczyt zmiennej zamieniany jest na `__props.x`, a `__props` jest `shallowReactive`. Reaktywność wynika z odczytu w momencie wykonywania efektu, nie z samej zmiennej.
2. **Co się stanie, gdy przekażesz zdestrukturyzowany prop do composable?** – Composable dostanie wartość z chwili wywołania `setup`. Rozwiązanie: getter `() => x` + `MaybeRefOrGetter`/`toValue` w composable (patrz `src/composables/useGameFilters.ts:24,37`).
3. **Jak są obsługiwane domyślne wartości obiektowe przy destrukturyzacji?** – Kompilator opakowuje je w fabrykę (`default: () => ([])`), więc każda instancja dostaje własną tablicę – bez wspólnej referencji między instancjami.

---

<a id="define-emits"></a>

## 3. `defineEmits` – typowana składnia krotek

### Co to jest

`defineEmits<{ nazwa: [arg1: Typ, arg2: Typ] }>()` (składnia od 3.3) deklaruje zdarzenia z nazwanymi krotkami argumentów; starsza składnia to sygnatury wywołań `(e: 'toggle', id: string): void`. Zadeklarowane eventy trafiają do `emits` komponentu, więc listener `onToggle` nie ląduje w `$attrs` (nie „przecieka” na element root). Eventy komponentów Vue **nie bubblują** – słyszy je tylko bezpośredni rodzic.

### Gdzie w projekcie

`src/components/vue/FavoriteButton.vue:25` i `:33-35`:

```ts
// src/components/vue/FavoriteButton.vue:25-35
const emit = defineEmits<{ toggle: [id: string, isFavorite: boolean] }>();

const { t } = useI18n(locale);
const { isFavorite, toggle } = useFavorites();

const active = computed(() => isFavorite(id));
const label = computed(() => `${active.value ? t.favorites.remove : t.favorites.add}: ${title}`);

function onClick() {
  emit('toggle', id, toggle(id));
}
```

Odbiorca: `GameExplorer` podpina handler w slocie karty (`src/components/vue/GameExplorer.vue:314`) i ogłasza zmianę czytnikom ekranu przez region `aria-live` (`:88-91`, `:269`):

```ts
// src/components/vue/GameExplorer.vue:88-91
const announcement = ref('');
function announceFavorite(_id: string, isFavorite: boolean) {
  announcement.value = isFavorite ? t.favorites.added : t.favorites.removed;
}
```

Test sprawdza payload: `tests/unit/components.test.ts:80-83`.

### Dlaczego tak

Stan ulubionych żyje w singletonie `useFavorites`, więc event nie służy do synchronizacji danych, tylko jako **hak dla rodzica** („użytkownik właśnie zmienił ulubione”). Rodzic decyduje, co z tym zrobić – tu: komunikat dla czytników ekranu („Dodano do ulubionych”), bo samo `aria-pressed` na przycisku nie zawsze jest ogłaszane po kliknięciu. Przycisk nie wie nic o regionie `aria-live` ani o tłumaczeniach komunikatu. Krotki z nazwami argumentów dają dokumentację w IDE i sprawdzanie typów handlera (`announceFavorite(_id: string, isFavorite: boolean)`).

### Alternatywy i trade-offy

- **Brak eventu, tylko wspólny stan** – mniej API, ale rodzic nie ma haka na sam moment interakcji (komunikat, analityka, toast); `watch` na zbiorze ulubionych reagowałby też na zmiany z innej karty przeglądarki (`storage`).
- **Region `aria-live` wewnątrz `FavoriteButton`** – samowystarczalny przycisk, ale 252 regiony live na stronie i brak kontroli rodzica nad treścią.
- **`defineModel`** – gdy event opisuje zmianę wartości, którą rodzic trzyma (`v-model:favorite`). Tu stan nie należy do rodzica, więc model byłby mylący.
- **Callback w propsie (`onToggle: (id) => void`)** – działa, ale w wyspie Astro funkcji nie da się przekazać z `.astro` (serializacja), a w czystym Vue to mniej idiomatyczne niż emit.

### Pułapki

- Emit z **korzenia wyspy** nie ma odbiorcy: Astro nie podpina listenerów z `.astro` (funkcje się nie serializują). `FavoriteButton` jako samodzielna wyspa w `src/views/GameView.astro:138` emituje w próżnię – i to jest w porządku, bo event jest opcjonalnym hakiem, a nie jedyną drogą zmiany stanu.
- Handler przypięty w slocie musi odwoływać się do bindingów `setup` (tu `announceFavorite`), a nie do zmiennej z `v-for` – inaczej slot staje się dynamiczny (patrz [sekcja 7](#slots)).
- Niezadeklarowane eventy trafiają do `$attrs` i jako natywne listenery na root element – możesz dostać event dwa razy (natywny `click` + Twój `click`).
- Nazwy: w szablonie `@update:model-value` / `@updateModelValue` są normalizowane, ale w testach `emitted()` używasz nazwy z deklaracji (`'update:modelValue'`).

### Pytania rekrutacyjne (senior)

1. **Dlaczego warto deklarować emits, nawet bez TS?** – Vue odróżnia wtedy eventy komponentu od natywnych listenerów; niezadeklarowane trafiają do `$attrs` i fallthrough na element root (podwójne wywołania, mylące zachowanie).
2. **Jak przekazać zdarzenie z głęboko zagnieżdżonego komponentu?** – Nie przez bubbling (go nie ma): provide/inject funkcji, wspólny store/composable albo przekazywanie przez kolejne poziomy. W projekcie zastosowano wspólny stan modułu (`src/composables/useFavorites.ts:13`).
3. **Czym różni się składnia krotek od sygnatur wywołań?** – To ten sam typ wynikowy; krotki (3.3+) są krótsze i pozwalają nazwać argumenty, sygnatury są potrzebne tylko przy przeciążeniach.

---

<a id="define-model"></a>

## 4. `defineModel` – pojedynczy, wiele nazwanych, w komponentach generycznych

### Co to jest

`defineModel()` (stabilne od **3.4**) deklaruje parę prop + event (`modelValue` + `update:modelValue`, albo `x` + `update:x` dla `defineModel('x')`) i zwraca zapisywalny ref. Odczyt `model.value` czyta prop; zapis emituje `update:*` – wartość zmieni się dopiero, gdy rodzic ją odeśle. Jeśli rodzic nie podał `v-model`, ref działa jako stan lokalny. Opcja `{ required: true }` trafia do definicji propa; drugi element zwracanej krotki to modyfikatory (`const [model, mods] = defineModel()`), a `get`/`set` w opcjach pozwalają transformować wartość.

### Gdzie w projekcie

- Pojedynczy model: `src/components/vue/SearchBox.vue:7`, `src/components/vue/FilterDrawer.vue:11` (nazwany `open`).
- 10 nazwanych modeli: `src/components/vue/FilterPanel.vue:24-33`, użycie w `src/components/vue/GameExplorer.vue:211-223` i `:333-345`.
- W komponentach generycznych: `src/components/vue/ChipGroup.vue:31`, `src/components/vue/SegmentedControl.vue:20`, `src/components/vue/SelectField.vue:10`.

```ts
// src/components/vue/FilterPanel.vue:24-33
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
```

```ts
// src/components/vue/ChipGroup.vue:50-55 – zapis nowej tablicy zamiast mutacji
function toggle(value: T) {
  // [Vue] Nowa tablica zamiast push/splice – czytelny przepływ danych przez v-model.
  selected.value = selected.value.includes(value)
    ? selected.value.filter((v) => v !== value)
    : [...selected.value, value];
}
```

### Dlaczego tak

`FilterPanel` jest używany w dwóch miejscach (sidebar i drawer) i nie powinien znać całego `FilterState` – dostaje tylko swoje pola przez nazwane `v-model:*`. `defineModel` usuwa boilerplate `props + emit + computed get/set`, który wcześniej trzeba było pisać dla każdego pola. W `ChipGroup` zapis **nowej tablicy** emituje `update:modelValue` – zmiana idzie jawnie przez rodzica, a test może ją przechwycić (`tests/unit/components.test.ts:42`).

### Alternatywy i trade-offy

- **Jeden `v-model` z całym obiektem filtrów** – mniej deklaracji, ale panel zna cały kształt stanu, a każda zmiana to nowy obiekt (albo – gorzej – mutacja propsa).
- **Ręczne `props` + `emit` + zapisywalny `computed`** – to, co `defineModel` generuje pod spodem; dziś tylko przy nietypowych potrzebach.
- **Wspólny stan (inject/store) zamiast `v-model`** – mniej przekazywania, ale ukryte zależności i trudniejsze testowanie oraz reużycie kontrolek.

### Pułapki

- **Mutacja w miejscu** (`selected.value.push(x)`) nie emituje eventu – modyfikuje obiekt rodzica „bokiem”. Działa przypadkiem tylko, jeśli rodzic przekazał obiekt reaktywny; łamie jednokierunkowy przepływ.
- Nazwa w `defineModel('polishRules')` vs atrybut w szablonie `v-model:polish-rules` (`GameExplorer.vue:217`) – Vue normalizuje kebab-case, ale w testach/`emitted()` nazwa to `update:polishRules`.
- `default` w `defineModel` przy braku `v-model` u rodzica może rozjechać stan (dziecko ma wartość domyślną, rodzic `undefined`) – dlatego tu wszędzie `required: true`.
- Po zapisie `model.value = x` odczyt w tej samej synchronicznej ścieżce zwraca już nową wartość lokalnie, ale „prawdą” jest to, co odeśle rodzic (np. rodzic może odrzucić zmianę).
- Typ modelu musi zgadzać się z adapterem po stronie rodzica: `FilterPanel.vue:32` ma `Exclude<KindFilter, 'all'> | null`, dokładnie jak `kindModel` w `GameExplorer.vue:65`. Wcześniej panel deklarował szersze `KindFilter | null` – `vue-tsc` tego nie zgłosił, bo szerszy typ modelu przyjmuje węższą wartość, a ewentualne `'all'` z panelu i tak „ratował” setter adaptera.

### Pytania rekrutacyjne (senior)

1. **Co dokładnie generuje `defineModel('x')`?** – Prop `x` (+ `xModifiers`) w `props` i `update:x` w `emits`, a w setup wywołanie `useModel(__props, 'x')`, które zwraca customRef: get czyta prop, set emituje event (i trzyma wartość lokalnie, gdy rodzic nie wiąże modelu).
2. **Dlaczego nie mutować tablicy z `v-model` w miejscu?** – Brak emitu → rodzic nie wie o zmianie; zmiana obiektu, który rodzic może dzielić z innymi komponentami; trudne debugowanie i testy. Nowa referencja = jawny przepływ.
3. **Jak zaimplementujesz modyfikator `v-model.trim` dla własnego komponentu?** – `const [model, modifiers] = defineModel<string>({ set: (v) => (modifiers.trim ? v.trim() : v) })`.

---

<a id="writable-computed"></a>

## 5. Zapisywalny `computed` jako adapter `v-model`

### Co to jest

`computed({ get, set })` zwraca zapisywalny ref: odczyt jest cache'owany jak w zwykłym `computed`, zapis wywołuje `set`. Używa się go jako **adaptera** między kształtem danych w stanie a kształtem oczekiwanym przez kontrolkę, albo do rozgałęzienia jednego `v-model` na kilka celów. Od 3.4 `computed` powiadamia zależnych tylko wtedy, gdy wartość faktycznie się zmieniła.

### Gdzie w projekcie

- `src/components/vue/GameExplorer.vue:47-53` – `searchModel`: jeden `v-model` pisze do `query` (źródło debounce) i `state.q` (URL).
- `src/components/vue/GameExplorer.vue:65-68` – `kindModel`: w stanie `'all'`, w kontrolce `null`.

```ts
// src/components/vue/GameExplorer.vue:47-53
const searchModel = computed({
  get: () => query.value,
  set: (value: string) => {
    query.value = value;
    state.value.q = value;
  },
});
```

```ts
// src/components/vue/GameExplorer.vue:65-68
const kindModel = computed<Exclude<KindFilter, 'all'> | null>({
  get: () => (state.value.kind === 'all' ? null : state.value.kind),
  set: (value) => (state.value.kind = value ?? 'all'),
});
```

### Dlaczego tak

`SegmentedControl` ma generyczny model `T | null` (`null` = „dowolne”), a domena ma `kind: 'all'` (czytelniejsze w URL i w `filters.ts`). Adapter trzyma tę translację w jednym miejscu, zamiast zmieniać typ domeny pod UI. `searchModel` rozwiązuje inny problem: pole tekstowe ma reagować natychmiast, filtrowanie – po debounce, a URL – zawsze z aktualnym `q`.

### Alternatywy i trade-offy

- **`defineModel` z opcjami `get`/`set` po stronie dziecka** – adapter w kontrolce zamiast w rodzicu; gorzej, bo generyczna kontrolka zaczyna znać domenę.
- **Rozbite wiązanie `:model-value` + `@update:model-value`** – jawne, bez dodatkowego bytu, ale logika ląduje w szablonie.
- **Jedno źródło prawdy dla frazy** (np. `state.q` + `refDebounced(() => state.value.q)`) – usuwa ręczną synchronizację `query`↔`state.q` (patrz pułapki).

### Pułapki

- `getter` musi być czysty – efekty uboczne tylko w `set`.
- **Dwa źródła prawdy**: `query` i `state.value.q` są synchronizowane ręcznie w trzech miejscach (`GameExplorer.vue:50-51`, `:58`, `:191`). Nowa ścieżka zmiany `state.q` bez aktualizacji `query` rozjedzie pole i filtrowanie.
- Zapis do `computed` bez `set` – w dev ostrzeżenie, w prod cicho nic.
- Getter zwracający nowy obiekt przy każdym wywołaniu (np. `{ ...state }`) powoduje zbędne aktualizacje zależnych.

### Pytania rekrutacyjne (senior)

1. **Kiedy zapisywalny `computed` jest lepszy od `watch` synchronizującego dwa refy?** – Zawsze, gdy da się wyrazić relację jako get/set: brak opóźnienia (watch odpala się w kolejce), brak pętli i jeden kierunek przepływu. `watch` do synchronizacji stanu to anty-wzorzec.
2. **Co się zmieniło w `computed` w 3.4?** – Zależni są powiadamiani tylko, jeśli nowa wartość różni się od poprzedniej (`hasChanged`), co eliminuje zbędne re-rendery przy computed zwracających prymitywy; doszedł też argument `previous` w getterze.
3. **Jak przetestujesz adapter?** – Jak każdy ref: ustaw `kindModel.value = null` i sprawdź `state.value.kind === 'all'`; albo przez komponent – kliknij radio „wszystkie” i sprawdź stan/URL.

---

<a id="generic"></a>

## 6. Komponenty generyczne (`generic="T extends …"`)

### Co to jest

Atrybut `generic` na `<script setup>` (od **3.3**) deklaruje parametry typu komponentu, tak jak generyki funkcji TS. `vue-tsc`/Volar inferują `T` w miejscu użycia z przekazanych propsów i `v-model`, więc typ wartości jest spójny między `options`, modelem i slotami. Generyki istnieją tylko w czasie kompilacji – runtime'owa walidacja propsów zna jedynie typ bazowy (`Array`, `String`…).

### Gdzie w projekcie

- `src/components/vue/ChipGroup.vue:1` – `T extends string | number` (opcje mogą być bucketami czasu – stringi, albo id kategorii – liczby).
- `src/components/vue/SegmentedControl.vue:1` – model `T | null`.
- `src/components/vue/SelectField.vue:1-10` – `T extends string`, używany z `SortKey` (`GameExplorer.vue:268`).

```vue
<!-- src/components/vue/SelectField.vue:1-10 -->
<script setup lang="ts" generic="T extends string">
import { useId } from 'vue';
import AppIcon from './AppIcon.vue';

const { label, options } = defineProps<{
  label: string;
  options: { value: T; label: string }[];
}>();

const model = defineModel<T>({ required: true });
```

### Dlaczego tak

`<ChipGroup v-model="time" :options="timeOptions">` w `FilterPanel.vue:75` jest w pełni typowane jako `TimeBucket[]` – pomyłka (np. `v-model` na `number[]` z opcjami-stringami) jest błędem `vue-tsc` w rodzicu, a nie bugiem w runtime. Ograniczenie `string | number` wynika z użycia `option.value` jako `:key` i jako `value` natywnego inputu/selecta.

### Alternatywy i trade-offy

- **`unknown`/`any` + rzutowania** – prościej, ale tracisz kontrolę typów na granicy komponentu.
- **Osobne komponenty per typ** (`StringChipGroup`, `NumberChipGroup`) – duplikacja.
- **`defineComponent` z generykiem funkcji** (`defineComponent(<T>(props: …) => …)`, od 3.3) – działa bez SFC, ale mniej czytelne.

### Pułapki

- `T` musi być wyprowadzalny z propsów; jeśli nie jest użyty w żadnym propsie/modelu, inferencja spada do ograniczenia.
- Typowanie template refa do komponentu generycznego jest trudniejsze – `InstanceType<typeof Comp>` nie działa dla generyków; używa się `ComponentExposed` z `vue-component-type-helpers`.
- Generyk nie daje walidacji w runtime – dane z serwera/URL i tak trzeba walidować (tu: `stateFromQuery` w `src/lib/filters.ts:177`).
- Atrybut `generic` to string parsowany przez kompilator – złożone typy importuj, nie definiuj inline.

### Pytania rekrutacyjne (senior)

1. **Skąd Vue wie, czym jest `T` w miejscu użycia?** – Vue nie wie; wie `vue-tsc`/Volar, które generują wirtualny kod TS, w którym komponent jest funkcją generyczną, a propsy z szablonu są jej argumentami – TS inferuje `T` jak przy zwykłym wywołaniu.
2. **Czy generyk wpływa na runtime?** – Nie. Runtime'owe `props` mają typy bazowe wygenerowane z ograniczenia/kształtu (`options: Array`), a `T` znika po kompilacji.
3. **Jak ograniczyć `T` i po co?** – `T extends string | number` – bo wartości trafiają do `:key` i do atrybutu `value`; bez ograniczenia kompilator TS zgłosi błąd przy takim użyciu.

---

<a id="slots"></a>

## 7. Sloty, scoped slots i `defineSlots`

### Co to jest

Slot to funkcja przekazana przez rodzica i wywoływana przez dziecko w miejscu `<slot>`. **Scoped slot** to slot, któremu dziecko przekazuje dane (`<slot name="actions" :game="game" />`), a rodzic odbiera je jako propsy slotu (`#actions="{ game }"`). `defineSlots<{ … }>()` (od **3.3**) to makro wyłącznie typujące – opisuje nazwy slotów i typy ich propsów, nie zmienia runtime. Treść slotu kompiluje się do funkcji z `withCtx`. Kompilator oznacza sloty jako `STABLE`, jeśli ich treść zależy tylko od propsów slotu i bindingów `setup`; jeśli odwołuje się do zmiennych z `v-for`/innego scope'u rodzica – jako `DYNAMIC` (flaga `DYNAMIC_SLOTS`), co wymusza aktualizację dziecka przy **każdym** renderze rodzica.

### Gdzie w projekcie

- Scoped slot `actions` z typem w `defineSlots`: `src/components/vue/GameCard.vue:7-10`, wywołanie `:76`.
- Wypełnienie przez propsy slotu (slot stabilny): `src/components/vue/GameExplorer.vue:307-316`.
- Wypełnienie bez propsów slotu (slot dynamiczny, świadomie zostawiony): `src/components/vue/FavoritesList.vue:56-62`.
- `defineSlots` z `default` i `footer`: `src/components/vue/FilterDrawer.vue:13`, `:97`, `:102`; wypełnienie `#footer` w `GameExplorer.vue:346`.

```ts
// src/components/vue/GameCard.vue:7-10 (dziecko: kontrakt slotu)
defineSlots<{
  /** Akcje w rogu karty (np. serduszko). Scoped: rodzic dostaje dane karty. */
  actions(props: { game: GameIndexItem }): unknown;
}>();
```

```vue
<!-- src/components/vue/GameExplorer.vue:312-316 (rodzic: treść zależy tylko od `card`) -->
<GameCard :game="game" :expansions="expansionsOf(game)">
            <template #actions="{ game: card }">
              <FavoriteButton :id="card.id" :title="card.title" @toggle="announceFavorite" />
            </template>
          </GameCard>
```

Fragment wyniku kompilacji (`compileScript`, nie ma go w repo) – obecny wariant i, dla porównania, poprzedni (`<template #actions>` czytający `game` z `v-for`):

```js
// teraz: slot stabilny, na GameCard tylko flaga PROPS
{ actions: _withCtx(({ game: card }) => [/* … */]), _: 1 /* STABLE */ }, 8 /* PROPS */

// wcześniej: slot dynamiczny, GameCard aktualizowana przy każdym renderze rodzica
{ actions: _withCtx(() => [/* … */]), _: 2 /* DYNAMIC */ }, 1032 /* PROPS, DYNAMIC_SLOTS */
```

### Dlaczego tak

- **Slot zamiast twardej zależności**: `GameCard` jest prezentacyjna i nie zależy od `useFavorites` – akcja (serduszko) jest wstrzykiwana przez slot. Ta sama karta mogłaby mieć inne akcje (np. „wypożycz”), a testy karty nie potrzebują localStorage (`tests/unit/components.test.ts:104-150`).
- **Scoped slot jako optymalizacja – co naprawiliśmy i dlaczego.** Wcześniej rodzic pisał `<template #actions><FavoriteButton :id="game.id" …/></template>`, czyli treść slotu czytała `game` z `v-for`. Kompilator generował wtedy `_: 2 /* DYNAMIC */` i flagę `1032 /* PROPS, DYNAMIC_SLOTS */` na `GameCard`, a `shouldUpdateComponent` dla takiego dziecka zawsze zwraca `true`. Do tego `expansions` było liczone w szablonie (`flatMap` → nowa tablica przy każdym renderze). Ponieważ szablon `GameExplorer` czyta `searchModel` i `isPending`, **każde naciśnięcie klawisza re-renderowało wirtualny DOM wszystkich 252 kart** (DOM się nie zmieniał, ale CPU tak). Naprawa ma dwie części:
  1. treść slotu korzysta wyłącznie z propsów slotu (`card`) i bindingów `setup` (`announceFavorite`) → slot `STABLE`;
  2. stabilne referencje propsów: `expansionsById` (`GameExplorer.vue:76-85`) liczone raz w `computed`, a karty bez dodatków dostają wspólną stałą `NO_EXPANSIONS`.

  Teraz przy wpisywaniu frazy `GameCard` dostaje te same referencje `game` i `expansions`, więc Vue pomija jej aktualizację.

- **`defineSlots` w `GameCard`** daje rodzicowi typ `card: GameIndexItem` w `#actions="{ game: card }"` i sprawdza, że karta wywołuje slot z poprawnymi propsami.
- **`FavoritesList`** nadal ma slot dynamiczny (`FavoritesList.vue:58-60`) – to świadomy kompromis: ta wyspa re-renderuje się tylko przy zmianie listy ulubionych, nie przy pisaniu.

### Alternatywy i trade-offy

- **Prop typu `showFavorite: boolean` i import `FavoriteButton` w karcie** – prościej i bez problemu dynamicznych slotów, ale karta zna konkretną funkcję i jej zależności (localStorage w testach karty).
- **Render props / komponent przekazany w propsie** (`:action-component="FavoriteButton"`) – elastyczne, ale mniej idiomatyczne i gorzej typowane.
- **`v-memo="[game, expansionsOf(game)]"` na `<li>`** – też odcina zbędne re-rendery, ale to ręczne zarządzanie zależnościami (łatwo zapomnieć o nowej zależności → nieaktualny UI); naprawa u źródła (stabilne sloty i propsy) jest bezpieczniejsza.
- **Brak `defineSlots`** – `vue-tsc` i tak inferuje typy slotów z szablonu dziecka; `defineSlots` daje jawny kontrakt i dokumentację.

### Pułapki

- **Slot czytający zmienną z `v-for` = `DYNAMIC_SLOTS` = dziecko re-renderuje się zawsze razem z rodzicem.** Sprawdzisz to w wyniku kompilacji (`_: 2 /* DYNAMIC */`) albo w Vue Devtools („Highlight updates”).
- **Props tworzone w szablonie** (`:items="list.filter(…)"`, `:style="{…}"`, inline `() => …`) to nowa referencja przy każdym renderze – dziecko zawsze się aktualizuje. Stała dla „pustej” wartości (`NO_EXPANSIONS`) jest ważna tak samo jak cache dla niepustej.
- Nazwa propsa slotu (`game`) koliduje z nazwą zmiennej `v-for` – stąd alias `{ game: card }`; bez aliasu przesłonisz zmienną pętli, co działa, ale jest mylące przy czytaniu.
- Sloty z `.astro` do wyspy Vue to statyczny HTML (`<astro-slot>`) – nie mogą być scoped i nie są reaktywne.
- `defineSlots` nie waliduje niczego w runtime.

### Pytania rekrutacyjne (senior)

1. **Dlaczego slot odwołujący się do zmiennej z `v-for` wymusza update dziecka?** – Kompilator nie może udowodnić, że treść slotu jest stabilna (zależy od zmiennej z zewnętrznego scope'u), więc oznacza ją jako dynamiczną i ustawia `DYNAMIC_SLOTS` – `shouldUpdateComponent` zwraca `true` bez porównywania propsów. Rozwiązanie: przekazać dane przez propsy slotu (scoped slot), wtedy slot jest `STABLE`.
2. **Jak znajdziesz komponent, który re-renderuje się bez potrzeby?** – Vue Devtools (highlight updates, timeline wydajności), tymczasowy `onUpdated` z licznikiem, wynik kompilacji szablonu (patch flags: `DYNAMIC_SLOTS`, `FULL_PROPS`), a potem szukanie niestabilnych referencji w propsach.
3. **Czym różni się scoped slot od propsa z funkcją renderującą?** – Semantycznie podobnie (oba to funkcje), ale slot jest kompilowany z `withCtx`, ma wsparcie w szablonach, typowanie przez `defineSlots` i optymalizacje kompilatora (stabilne sloty).
4. **Po co `defineSlots`, skoro Volar inferuje sloty?** – Jawny, publiczny kontrakt komponentu (szczególnie w bibliotekach), kontrola typów przy wywołaniu `<slot>` w dziecku i typowane propsy slotu u rodzica.

---

<a id="define-expose"></a>

## 8. `defineExpose`

### Co to jest

Komponenty `<script setup>` są domyślnie zamknięte: template ref rodzica dostaje publiczną instancję bez żadnych bindingów. `defineExpose({ … })` jawnie publikuje wybrane metody/refy. To imperatywny „escape hatch” – do rzeczy, których nie da się wyrazić deklaratywnie (focus, scroll, reset formularza, otwarcie animacji).

### Gdzie w projekcie

Dziecko publikuje jedną funkcję – `src/components/vue/SearchBox.vue:20` (wewnętrznie `clear()` w `:15-18` używa tego samego refa do inputu). Rodzic korzysta z niej w skrócie klawiszowym „/” – `src/components/vue/GameExplorer.vue:93-101`, ref na komponencie w `:234`:

```ts
// src/components/vue/GameExplorer.vue:94-101
// [Vue] useTemplateRef na KOMPONENCIE daje dostęp do tego, co wystawił przez defineExpose().
const searchBox = useTemplateRef<InstanceType<typeof SearchBox>>('searchBox');
onKeyStroke('/', (event) => {
  const target = event.target as HTMLElement | null;
  if (target?.closest('input, textarea, select, [contenteditable]')) return;
  event.preventDefault();
  searchBox.value?.focus();
});
```

### Dlaczego tak

Fokus to typowy przypadek imperatywny – nie ma sensownego stanu, który można by „ustawić” deklaratywnie. Eksponujemy **tylko funkcję `focus`**, nie cały element `<input>`: rodzic nie może grzebać w DOM-ie dziecka, a `SearchBox` może zmienić wewnętrzną strukturę bez łamania rodzica. Typ `InstanceType<typeof SearchBox>` sprawia, że `searchBox.value?.focus()` jest sprawdzane przez `vue-tsc` – literówka w nazwie metody to błąd kompilacji. Guard na `closest('input, …')` nie przechwytuje „/” wpisywanego w pola tekstowe.

### Alternatywy i trade-offy

- **Prop `autofocus` / `focusOn: number` (licznik)** – deklaratywne, ale sztuczne dla jednorazowych akcji.
- **Eksport całego refa `input`** – elastyczniejsze, ale łamie enkapsulację.
- **Natywny `autofocus`** albo fokus przez `document.getElementById(id)` – omija Vue, kruche.

### Pułapki

- Bez `defineExpose` ref na komponent nic nie zawiera – częsty „bug” po migracji z Options API.
- Wyeksponowane refy są automatycznie rozpakowywane na instancji publicznej (`compRef.value.someRef` to wartość, nie ref).
- Ref do komponentu jest `null` przed mount i po `v-if=false` – zawsze `?.`.
- Nadużywanie `defineExpose` prowadzi do imperatywnych zależności rodzic→dziecko; preferuj props/emits.

### Pytania rekrutacyjne (senior)

1. **Jak otypujesz ref do komponentu z `defineExpose`?** – Jak w `GameExplorer.vue:95`: `useTemplateRef<InstanceType<typeof SearchBox>>('searchBox')` (nowsze Volar/`vue-tsc` potrafią też wyinferować typ dla statycznego klucza); dla komponentów generycznych `InstanceType` nie działa – użyj `ComponentExposed<typeof Comp>` z `vue-component-type-helpers`.
2. **Dlaczego `<script setup>` jest domyślnie zamknięty?** – Żeby publiczne API komponentu było jawne; w Options API wszystko z `this` było dostępne przez `$refs`, co prowadziło do niekontrolowanych zależności.

---

<a id="use-template-ref"></a>

## 9. `useTemplateRef` (3.5)

### Co to jest

`useTemplateRef<T>(key)` (nowość w **3.5**) zwraca `Readonly<ShallowRef<T | null>>`, który Vue wypełnia elementem/instancją z atrybutem `ref="key"`. Zastępuje wzorzec „zmienna `ref(null)` o tej samej nazwie co atrybut” – klucz jest jawnym stringiem, więc nazwa zmiennej jest dowolna, a klucz może być dynamiczny. Wartość jest `null` przed zamontowaniem i gdy element jest usunięty (`v-if`).

### Gdzie w projekcie

- `src/components/vue/SearchBox.vue:13` + `ref="input"` w `:32`.
- `src/components/vue/FilterDrawer.vue:17` + `ref="dialog"` w `:66`, użycie w `watch` `:28-33` i `onBackdropClick` `:52-55`.
- Ref do **komponentu** (dostęp do API z `defineExpose`): `src/components/vue/GameExplorer.vue:95` + `ref="searchBox"` w `:234`.

```ts
// src/components/vue/FilterDrawer.vue:17 i :28-33
const dialog = useTemplateRef<HTMLDialogElement>('dialog');

watch(open, (isOpen) => {
  const el = dialog.value;
  if (!el) return;
  if (isOpen && !el.open) el.showModal();
  if (!isOpen && el.open) el.close();
});
```

### Dlaczego tak

W projekcie z Vue 3.5 to rekomendowany sposób; nazwa zmiennej nie musi pokrywać się z atrybutem, więc nie ma kolizji z innymi bindingami i nie ma „magicznego” wiązania po nazwie. Guard `if (!el) return` jest potrzebny, bo dialog jest w `Teleport v-if="mounted"` i istnieje dopiero po pierwszym renderze po zamontowaniu. Ten sam API działa dla elementów i komponentów – w `GameExplorer` ref na `SearchBox` daje publiczną instancję z metodą `focus` (z `defineExpose`), a nie element DOM.

### Alternatywy i trade-offy

- **`const input = ref<HTMLInputElement | null>(null)` + `ref="input"`** – działa nadal; wiązanie po nazwie, łatwo o literówkę i kolizję nazw.
- **Function ref** `:ref="(el) => …"` – pełna kontrola (np. listy refów w `v-for` z mapą po id), więcej kodu.
- **`document.querySelector`** – omija cykl życia Vue, nie działa z wieloma instancjami.

### Pułapki

- Odczyt w `setup()` (synchronicznie) zawsze daje `null` – element istnieje od `onMounted`.
- Ref w `v-for` daje **tablicę** w kolejności niegwarantowanej względem danych.
- `watch` z domyślnym `flush: 'pre'` wykonuje się **przed** aktualizacją DOM – jeśli zmiana stanu jednocześnie montuje element, trzeba `flush: 'post'` (lub `nextTick`). Tu dialog istnieje wcześniej, więc `pre` wystarcza.
- Ref jest readonly – przypisanie do `.value` ostrzega w dev.

### Pytania rekrutacyjne (senior)

1. **Jaki problem rozwiązuje `useTemplateRef` względem `ref(null)`?** – Rozdziela nazwę zmiennej od klucza w szablonie (koniec wiązania po nazwie, możliwość dynamicznych kluczy), daje lepszą inferencję typów i ostrzeżenia przy złym użyciu.
2. **Kiedy w `watch` potrzebujesz `flush: 'post'`?** – Gdy callback czyta DOM, który zmienia się w tym samym ticku (np. element pojawia się przez `v-if`), bo `pre` odpala się przed patchem.

---

<a id="use-id"></a>

## 10. `useId` (3.5) i id stabilne między SSR a klientem

### Co to jest

`useId()` (nowość w **3.5**) zwraca unikalny w obrębie aplikacji string, który jest **identyczny w renderze serwerowym i przy hydracji**, bo wynika z deterministycznej kolejności renderowania drzewa komponentów w obrębie aplikacji, a nie z globalnego licznika procesu. Prefiks ustawia `app.config.idPrefix`. Służy do wiązania `label for`/`id`, `aria-labelledby`, `aria-controls`, `name` grup radio.

### Gdzie w projekcie

- `src/components/vue/SearchBox.vue:11` → `label for` (`:25`) i `input id` (`:31`).
- `src/components/vue/ChipGroup.vue:33`, `src/components/vue/SelectField.vue:11`, `src/components/vue/FilterDrawer.vue:16` (`aria-labelledby`, `:67`).
- `src/components/vue/SegmentedControl.vue:21` – `name` grupy radio (dwa panele filtrów nie mogą dzielić grupy).
- `src/components/vue/GameCard.vue:19` → `aria-controls` (`:146`) i `id` listy dodatków (`:163`) – 252 unikalne id.
- Astro nadaje każdej wyspie osobny prefiks: `node_modules/@astrojs/vue/dist/server.js:28` i `node_modules/@astrojs/vue/dist/client.js:31` (atrybut `prefix="s0"` na `<astro-island>`).

```ts
// src/components/vue/SearchBox.vue:10-11
// [Vue] useId() – stabilne id identyczne na serwerze i kliencie (zwykły licznik dałby mismatch).
const inputId = useId();
```

### Dlaczego tak

Licznik modułowy (`let n = 0; id = 'x' + n++`) daje inne wartości na serwerze (gdzie w jednym procesie renderuje się wiele stron i wysp) i na kliencie → hydration mismatch atrybutów, których Vue w produkcji **nie poprawia** – `label for` wskazywałby nieistniejący `id`. Każda wyspa Astro to osobna aplikacja Vue z własnym licznikiem, dlatego Astro ustawia `idPrefix` per wyspa – bez tego dwie wyspy na stronie mogłyby wygenerować to samo id.

### Alternatywy i trade-offy

- **Id z danych** (`` `exp-${game.id}` ``) – stabilne i czytelne, ale wymaga unikalnych danych i ryzykuje kolizję, gdy ten sam komponent pojawi się dwa razy (np. ta sama gra w dwóch listach).
- **Owinięcie inputu w `<label>`** – brak potrzeby id dla etykiety (użyte w `SegmentedControl.vue:28-41` i `FilterPanel.vue:88`), ale nie rozwiązuje `aria-controls`/`aria-labelledby`.
- **Biblioteki (`nanoid`) / `crypto.randomUUID()`** – gwarantowany mismatch przy SSR.

### Pułapki

- `useId()` wołaj w `setup`, nie w `computed`/pętli/`v-for` – każde wywołanie to nowe id.
- Id są stabilne tylko, gdy **drzewo komponentów** jest takie samo na serwerze i kliencie. Warunkowy render zależny od `window` (bez bramki `hydrated`) przesuwa pozycje i psuje stabilność.
- Nie używaj `useId` jako `:key`.
- Wiele aplikacji Vue na jednej stronie bez różnych `idPrefix` = kolizje (Astro to załatwia, własna integracja – już niekoniecznie).

### Pytania rekrutacyjne (senior)

1. **Dlaczego `Math.random()` albo globalny licznik psują hydrację?** – Serwer i klient generują inne wartości (różna liczba wcześniejszych wywołań, inne procesy). Vue w produkcji nie patchuje niezgodnych atrybutów, więc relacje `for`/`id` i ARIA zostają zepsute.
2. **Jak `useId` osiąga stabilność?** – Id to `idPrefix` + licznik należący do aplikacji, inkrementowany w kolejności wykonywania `setup` (za granicami async – `async setup`, `serverPrefetch`, `defineAsyncComponent` – licznik rozgałęzia się, żeby kolejność rozwiązywania promise'ów nie miała wpływu). Serwer i klient przechodzą to samo drzewo w tej samej kolejności, więc dostają te same wartości – niezależnie od tego, co wcześniej działo się w procesie.
3. **Co jeszcze trzeba skonfigurować przy wielu aplikacjach Vue na jednej stronie?** – `app.config.idPrefix` unikalne per aplikacja.

---

<a id="ref-shallowref"></a>

## 11. `ref` vs `shallowRef` vs `reactive` (i `markRaw`)

### Co to jest

`ref` jest głęboko reaktywny – obiekt w `.value` jest leniwie owijany w `reactive` proxy (przy odczycie). `shallowRef` śledzi wyłącznie przypisanie `.value`; zawartość zostaje surowa, więc mutacja w miejscu (`set.add`) **nie** wywoła aktualizacji (chyba że `triggerRef`). `reactive` to proxy na obiekcie bez `.value`, którego nie da się podmienić w całości ani zdestrukturyzować bez utraty reaktywności. `markRaw(obj)` trwale wyłącza proxy dla obiektu (np. instancje klas, duże dane tylko do odczytu). Props komponentu są trzymane w `shallowReactive`, więc przekazana tablica nie jest głęboko proxowana.

### Gdzie w projekcie

- `shallowRef` z niemutowalnym `Set`: `src/composables/useFavorites.ts:13-14`, podmiana całości w `write` (`:30-33`) i `toggle` (`:76-81`).
- `ref` z obiektem stanu filtrów (mutowanym polami przez `v-model`): `src/composables/useGameFilters.ts:27`.
- Duża tablica w propsach (surowa, nieproxowana): `src/components/vue/GameExplorer.vue:26-30`.

```ts
// src/composables/useFavorites.ts:76-81
function toggle(id: string) {
  const next = new Set(favorites.value);
  if (!next.delete(id)) next.add(id);
  write(next);
  return next.has(id);
}
```

### Dlaczego tak

- **Ulubione**: zmiana to zawsze „nowy zbiór” (kopiowany i zapisywany do localStorage w całości). `shallowRef` + podmiana daje jedną, jawną notyfikację; nie ma kosztu proxy kolekcji i nie ma problemu z porównywaniem surowych i proxowanych wartości. Typ `ReadonlySet` blokuje przypadkową mutację w miejscu na poziomie TS.
- **Filtry**: `FilterState` to mały obiekt, którego pola są wiązane osobnymi `v-model:*` (`state.players`, `state.time`) – tu głęboka reaktywność jest wygodna i tania.
- **252 gry**: lista przychodzi jako prop, a props są `shallowReactive` – elementy tablicy zostają surowe, więc `filterGames` nad 252 obiektami po ~25 pól nie zakłada tysięcy zależności ani proxy. `results` (`useGameFilters.ts:35-41`) zwraca nową tablicę surowych obiektów.

### Alternatywy i trade-offy

- **`ref(new Set())` / `reactive(new Set())`** – Vue obsługuje kolekcje (handlery `add`/`delete`/`has`), mutacje w miejscu działają; koszt: proxy, śledzenie per klucz, pułapka „raw vs proxy” przy porównaniach i przekazywaniu do bibliotek.
- **`markRaw(games)`** – alternatywa, gdy duża tablica trafia do **głębokiego** `ref`/store'a (np. `state.games = markRaw(data)`); tu niepotrzebne, bo dane są w propsach.
- **`shallowReactive(state)`** dla filtrów – przy płaskim obiekcie wystarczy, ale tablice (`time`, `categories`) i tak podmieniamy w całości, więc różnica marginalna.
- **`reactive(state)` zamiast `ref`** – brak `.value`, ale nie da się zrobić `state = defaultFilterState()` (reset w `useGameFilters.ts:44-50` podmienia cały obiekt), a destrukturyzacja gubi reaktywność.

### Pułapki

- `shallowRef`: `favorites.value.add(id)` „działa” na danych, ale nikt się nie dowie – brak re-renderu. Albo podmiana, albo `triggerRef(favorites)`.
- `reactive`: przypisanie `state = …` zrywa połączenie; destrukturyzacja `const { players } = state` daje wartość, nie ref (`toRefs` pomaga).
- Porównywanie proxy z surowym obiektem (`reactiveArr.includes(rawObj)` jest obsłużone przez Vue, ale `Set`/`Map` z kluczami-obiektami i biblioteki zewnętrzne – już nie zawsze); `toRaw` przy przekazywaniu do bibliotek.
- `markRaw` jest „zaraźliwe” w drugą stronę – obiekt nigdy nie będzie reaktywny, nawet gdy później tego chcesz.

### Pytania rekrutacyjne (senior)

1. **Kiedy `shallowRef` zamiast `ref`?** – Duże struktury podmieniane w całości (odpowiedzi API, immutable data), obiekty zewnętrznych bibliotek (instancje map/edytorów), kolekcje, których nie mutujemy w miejscu. Oszczędza tworzenie proxy i śledzenie zależności per pole.
2. **Czy dane przekazane przez props są głęboko reaktywne?** – Nie: `instance.props` jest `shallowReactive`. Jeśli rodzic przekaże obiekt już reaktywny, dziecko dostanie proxy; jeśli surowy (jak z Astro) – surowy.
3. **Jak Vue 3 owija zagnieżdżone obiekty – od razu czy leniwie?** – Leniwie: proxy dla zagnieżdżonego obiektu tworzy się przy pierwszym odczycie przez getter (`get` trap), i jest cache'owane w `WeakMap`.
4. **Czym różni się `markRaw` od `shallowRef`?** – `shallowRef` dotyczy kontenera (śledzi tylko `.value`), `markRaw` dotyczy obiektu (nigdy nie zostanie proxy, gdziekolwiek go włożysz – także w głęboki `ref`/`reactive`).

---

<a id="computed-watch"></a>

## 12. `computed` vs `watch` vs `watchEffect`

### Co to jest

`computed` – czysta, leniwa, cache'owana pochodna stanu; przelicza się dopiero przy odczycie po zmianie zależności. `watch(source, cb)` – efekt uboczny na zmianę jawnie wskazanych źródeł; domyślnie leniwy (bez `immediate`), `flush: 'pre'` (przed patchem DOM), opcje `deep` (od 3.5 także liczba = głębokość), `once` (3.4). `watchEffect(fn)` – efekt uboczny z automatycznym śledzeniem wszystkiego, co przeczyta, uruchamiany natychmiast. Od 3.5 jest `onWatcherCleanup()` do sprzątania w callbacku.

### Gdzie w projekcie

- `computed` dla wyników: `src/composables/useGameFilters.ts:31-42`; dalej `chips` (`src/components/vue/GameExplorer.vue:120-172`), `visible` w `src/components/vue/ChipGroup.vue:38-48`.
- `watch` dla efektu na DOM: `src/components/vue/FilterDrawer.vue:27-33`.
- `watchDebounced` (VueUse) dla zapisu URL: `src/composables/useUrlQueryState.ts:43-44`.
- `watchEffect` – **nieużywany bezpośrednio** (używa go wewnętrznie `useMediaQuery` z VueUse).

```ts
// src/composables/useGameFilters.ts:31-41
// [Vue] computed, nie watch: wyniki są czystą pochodną stanu, cache'owaną do zmiany zależności.
const effectiveState = computed<FilterState>(() =>
  options.query ? { ...state.value, q: options.query.value } : state.value,
);
const results = computed(() =>
  sortGames(
    filterGames(toValue(items), effectiveState.value, options.favorites.value),
    state.value.sort,
    collator,
  ),
);
```

### Dlaczego tak

- Wyniki filtrowania to **dane pochodne** – `computed` daje cache, brak opóźnienia i brak duplikacji stanu. `watch` + `results.value = …` byłby anty-wzorcem (dodatkowy stan, render z nieaktualną wartością między zmianą a flushem).
- `FilterDrawer` musi wywołać **imperatywne API DOM** (`showModal()`/`close()`) – to efekt uboczny, więc `watch` na `open`.
- URL to też efekt uboczny (History API) i ma być zdebouncowany – `watchDebounced` z `deep: true`, bo stan to obiekt z tablicami.
- `watchEffect` nie jest potrzebny: wszędzie znamy źródła wprost, a jawne źródła są czytelniejsze i nie łapią przypadkowych zależności.

### Alternatywy i trade-offy

- **`watchEffect` w `FilterDrawer`** (`if (open.value) dialog.value?.showModal()`) – krótsze, ale uruchamia się natychmiast (dialog jeszcze nie istnieje) i śledzi także `dialog`, co jest mniej oczywiste.
- **Event handler zamiast `watch`** (wywołać `showModal()` w miejscu kliknięcia) – prostsze, ale stan `open` mógłby się zmienić z innych miejsc (`drawerOpen = false` w stopce `GameExplorer.vue:356`) i wtedy dialog by się rozjechał.
- **`watch` z `deep: true` vs getter** – `watch(() => stateToQuery(state.value).toString(), …)` śledziłby tylko to, co faktycznie trafia do URL i porównywał string, zamiast przechodzić cały obiekt.

### Pułapki

- Efekty uboczne w `computed` (fetch, zapis do storage) – mogą się wykonać wielokrotnie lub wcale (leniwość).
- `watch` na zdestrukturyzowanym propsie – błąd kompilacji; użyj gettera.
- `deep: true` na dużych strukturach przechodzi cały graf przy każdej zmianie.
- Mutowanie obiektu w `watch` z `deep` → callback dostaje **ten sam** obiekt jako `newValue` i `oldValue`.
- `computed` zwracający nowy obiekt (`effectiveState` robi `{ ...state.value, q }`) zawsze „się zmienia” – zależni przeliczą się przy każdej zmianie źródeł (tu akceptowalne, bo `results` i tak zależy od tych samych źródeł).

### Pytania rekrutacyjne (senior)

1. **Kiedy `watch`, a kiedy `computed`?** – `computed` dla wartości wyprowadzanych synchronicznie i bez efektów; `watch` dla efektów (I/O, DOM API, analityka, zapis do storage/URL) i asynchroniczności.
2. **Czym różni się `flush: 'pre' | 'post' | 'sync'`?** – `pre` (domyślny) – przed aktualizacją DOM komponentu, w kolejce schedulera; `post` – po patchu (dostęp do nowego DOM); `sync` – natychmiast przy każdej zmianie (bez batchingu, ryzykowne wydajnościowo).
3. **Jak sprzątać w `watch` w 3.5?** – `onWatcherCleanup(() => controller.abort())` wewnątrz callbacku albo trzeci argument `onCleanup`; cleanup wykonuje się przed kolejnym uruchomieniem i przy zatrzymaniu watchera.
4. **Dlaczego `watchEffect` może być pułapką w złożonym kodzie?** – Śledzi wszystko, co przeczyta synchronicznie (także przez wywoływane funkcje), więc zależności są niejawne; z kolei odczyty po `await` nie są śledzone.

---

<a id="composables"></a>

## 13. Projektowanie composables (`MaybeRefOrGetter`, `toValue`, czysta logika obok)

### Co to jest

Composable to funkcja `useX()` enkapsulująca stan reaktywny i logikę z użyciem Composition API. Konwencje: wywołanie synchronicznie w `setup` (lifecycle hooks, `provide`/`inject` wymagają aktywnej instancji), zwracanie obiektu **refów** (destrukturyzacja bez utraty reaktywności), przyjmowanie wejść jako `MaybeRefOrGetter<T>` i normalizacja przez `toValue()` (od **3.3**) wewnątrz efektu/`computed`. Logika domenowa najlepiej żyje w czystych funkcjach bez Vue, a composable tylko dokłada reaktywność.

### Gdzie w projekcie

- `src/composables/useGameFilters.ts:23-26` – `items: MaybeRefOrGetter<readonly GameIndexItem[]>`, `toValue(items)` w `:37`.
- `src/composables/useGameSearch.ts:8-17` – mały, jednoodpowiedzialny composable.
- `src/composables/useUrlQueryState.ts:4-7`, `:19` – generyczny `useUrlQueryState<T>` z wstrzykiwanym `QueryCodec<T>`.
- `src/composables/useFavorites.ts:56-91` – composable nad stanem modułu.
- Czysta logika: `src/lib/filters.ts:1-4` (`filterGames` `:124`, `sortGames` `:147`, `stateFromQuery` `:177`, `stateToQuery` `:199`).

```ts
// src/composables/useUrlQueryState.ts:4-7 i :19
export interface QueryCodec<T> {
  parse: (params: URLSearchParams) => T;
  serialize: (value: T) => URLSearchParams;
}
// …
export function useUrlQueryState<T>(state: Ref<T>, codec: QueryCodec<T>, { debounce = 250 } = {}) {
```

### Dlaczego tak

- **Testowalność**: `filters.ts` testujesz zwykłymi asercjami (`tests/unit/filters.test.ts`), `useGameFilters` – bez komponentu (`tests/unit/useGameFilters.test.ts:12-15`), a tylko composables z lifecycle hookami potrzebują mini-aplikacji.
- **`MaybeRefOrGetter`**: `GameExplorer` przekazuje getter na prop (`() => games`), test – zwykłą tablicę. Jedno API, bez wymuszania `ref` na wywołującym.
- **Odwrócenie zależności w `useUrlQueryState`**: composable nie zna `FilterState`; zna tylko kodek. Można go użyć do dowolnego stanu.
- **Composable nad stanem modułu (`useFavorites`)**: stan globalny, ale bramkowanie hydracji (`mounted`) jest per wywołanie – patrz [sekcja 20](#ssr-hydration).

### Alternatywy i trade-offy

- **Klasy/serwisy** – OOP znane z Angulara, ale gorsza integracja z reaktywnością i tree-shakingiem.
- **Store (Pinia)** zamiast composable – lepszy, gdy stan jest globalny i potrzebujesz devtools/pluginów; tu stan filtrów jest lokalny dla jednej wyspy.
- **`effectScope` + `onScopeDispose`** zamiast `onBeforeUnmount` – composable działa wtedy także poza komponentem (w scope'ie), np. w store'ach Pinia lub testach.
- **Opcje przez obiekt (`options.locale`)** jako zwykłe wartości vs refy – prostsze, ale nie reagują na zmiany (tu świadomie: `locale` i `favorites` w `UseGameFiltersOptions`, `useGameFilters.ts:12-17`).

### Pułapki

- `toValue()` wywołane **poza** `computed`/efektem robi snapshot – musi być w środku (`useGameFilters.ts:37`).
- Wywołanie composable z lifecycle hookami po `await` w `setup` lub w callbacku – brak aktywnej instancji, hooki się nie zarejestrują (ostrzeżenie w dev).
- Zwracanie `reactive({...})` zamiast obiektu refów – destrukturyzacja u wywołującego gubi reaktywność.
- `useUrlQueryState` używa `onBeforeUnmount`, więc nie zadziała w samodzielnym `effectScope` – `onScopeDispose` byłoby ogólniejsze.
- Stan modułu vs stan per wywołanie: łatwo przypadkiem zrobić singleton (zmienna poza funkcją) albo przypadkiem go nie zrobić.

### Pytania rekrutacyjne (senior)

1. **`toValue` vs `unref`?** – `unref` rozpakowuje tylko refy; `toValue` dodatkowo wywołuje gettery, więc obsługuje `MaybeRefOrGetter`.
2. **Dlaczego composable powinien zwracać obiekt refów, a nie `reactive`?** – Wywołujący destrukturyzuje wynik (`const { results } = useGameFilters(…)`); refy przetrwają destrukturyzację, właściwości `reactive` – nie.
3. **Jak przetestujesz composable z `onMounted`?** – Zamontuj mini-komponent, który go wywołuje (`tests/unit/useUrlQueryState.test.ts:8-20`), albo helper `withSetup`; bez instancji hooki się nie wykonają.
4. **Gdzie postawić granicę między composable a czystą funkcją?** – Wszystko, co da się policzyć z danych wejściowych bez reaktywności i I/O, idzie do czystych funkcji; composable zarządza stanem, cyklem życia i efektami.

---

<a id="vueuse"></a>

## 14. VueUse: `refDebounced`, `watchDebounced`, `useMediaQuery`, `onKeyStroke`, `useMutationObserver`

### Co to jest

VueUse to biblioteka gotowych composables. `refDebounced(source, ms)` zwraca readonly ref, który dogania źródło po `ms` ciszy. `watchDebounced(source, cb, { debounce })` to `watch` z filtrem zdarzeń – **debouncowany jest callback**, nie śledzenie źródła. `useMediaQuery(query)` zwraca ref z wynikiem `matchMedia` i nasłuchuje zmian; na serwerze zwraca `false`, chyba że podasz opcję `ssrWidth`. `onKeyStroke(key, handler)` podpina listener klawiatury (domyślnie `keydown` na `window`), a `useMutationObserver(target, cb, options)` – `MutationObserver` na elemencie; oba sprzątają po sobie przy zakończeniu scope'u (odmontowaniu) i są no-opem tam, gdzie nie ma `window` (SSR).

### Gdzie w projekcie

- `refDebounced`: `src/composables/useGameSearch.ts:10` (+ `isPending` w `:15`, wykorzystany w `GameExplorer.vue:262`).
- `watchDebounced`: `src/composables/useUrlQueryState.ts:44`.
- `useMediaQuery`: `src/components/vue/GameExplorer.vue:182`.
- `onKeyStroke` – skrót „/” do wyszukiwarki: `src/components/vue/GameExplorer.vue:96-101`.
- `useMutationObserver` – synchronizacja ikony motywu z `<html data-theme>`: `src/components/vue/ThemeToggle.vue:28-34`.

```ts
// src/components/vue/ThemeToggle.vue:28-34
// Skrypt w <head> zmienia data-theme także przy zmianie motywu systemowego – nasłuchujemy atrybutu,
// żeby ikona nie rozjechała się z faktycznym motywem. (useMutationObserver sprząta po odmontowaniu.)
useMutationObserver(
  () => (typeof document === 'undefined' ? null : document.documentElement),
  () => (theme.value = readTheme()),
  { attributes: true, attributeFilter: ['data-theme'] },
);
```

### Dlaczego tak

Wymóg „VueUse tam, gdzie upraszcza kod”. Debounce z poprawnym sprzątaniem timerów, `matchMedia`/`keydown`/`MutationObserver` z listenerem i cleanupem – to dokładnie ten kod, którego nie warto pisać samemu. `isPending` (`query !== debouncedQuery`) to tani sygnał dla UI („lista jeszcze się nie przefiltrowała”). `useMutationObserver` rozwiązuje realny problem: motyw zmienia **skrypt spoza Vue** (inline w `src/layouts/BaseLayout.astro:31-55`, także przy zmianie motywu systemowego), więc jedynym źródłem prawdy jest atrybut `data-theme` – komponent go obserwuje, zamiast trzymać własną, potencjalnie nieaktualną kopię. Target podany jako getter zwracający `null` bez `document` jest bezpieczny w SSR.

### Alternatywy i trade-offy

- **Własny debounce** (`setTimeout` w `watch` + `onWatcherCleanup`) – zero zależności, ale łatwo zapomnieć o cleanupie.
- **Czysty CSS zamiast `useMediaQuery`** – układ i tak jest sterowany CSS-em (`hidden lg:block`), JS jest potrzebny tylko, żeby nie montować dwóch `FilterPanel` jednocześnie.
- **`useMediaQuery(q, { ssrWidth })`** – VueUse 15 potrafi zgadnąć wynik na serwerze z szerokości; przy SSG nie znamy urządzenia, więc nadal ryzyko mismatchu – stąd flaga `hydrated` w `GameExplorer.vue:180-181`.
- **Ręczne `addEventListener('keydown')` w `onMounted`/`onBeforeUnmount`** zamiast `onKeyStroke` – to samo, więcej kodu.
- **`useMediaQuery('(prefers-color-scheme: dark)')` w `ThemeToggle`** zamiast obserwowania atrybutu – dublowałoby logikę skryptu z `<head>` (preferencja zapisana vs systemowa) i mogło się z nim rozjechać.
- **`useStorage(key, …, { initOnMounted: true })`** – mogłoby zastąpić część `useFavorites`, ale nie rozwiązuje problemu wysp hydratowanych w różnym czasie (patrz [sekcja 21](#shared-state)).

### Pułapki

- `useMediaQuery` na kliencie zna wynik **już w setup** (synchronicznie), a serwer nie – użycie go wprost w `v-if` daje hydration mismatch.
- **Flagi czasowe nie współgrają z debounce – co usunęliśmy i dlaczego.** `useUrlQueryState` miał flagę `applyingFromUrl`, ustawianą przy odczycie URL-a i resetowaną w `queueMicrotask`, żeby „echo” (zapis URL-a po odczycie) nie nastąpiło. Ale `watchDebounced` wywołuje callback dopiero po 250 ms – flaga była wtedy dawno zresetowana, więc strażnik był martwym kodem. Zamiast niego zapis jest **idempotentny** (`useUrlQueryState.ts:24-30` porównuje docelowy URL z bieżącym), a echo co najwyżej normalizuje adres (usuwa śmieciowe parametry). Ogólna lekcja: przy debounce/throttle nie polegaj na stanie „z chwili zmiany” – polegaj na porównaniu wartości.
- Debouncowany callback może się wykonać po odmontowaniu komponentu (watcher zatrzymany, ale timer już zaplanowany).
- `refDebounced` jest readonly – nie da się go użyć jako `v-model`.
- Globalny skrót klawiszowy musi ignorować zdarzenia z pól edycyjnych (guard `closest('input, textarea, select, [contenteditable]')` w `GameExplorer.vue:98`), inaczej „/” nie da się wpisać w żadne pole.
- `MutationObserver` reaguje też na zmiany robione przez sam komponent (`toggle()` w `ThemeToggle.vue:38-47`) – callback musi być idempotentny (tu: ponowny odczyt atrybutu).

### Pytania rekrutacyjne (senior)

1. **Debounce na źródle (`refDebounced`) czy na efekcie (`watchDebounced`)?** – Na źródle, gdy wiele konsumentów ma widzieć opóźnioną wartość (filtrowanie); na efekcie, gdy opóźniamy tylko kosztowną akcję (zapis URL), a reszta UI ma widzieć wartość natychmiast.
2. **Jak użyć `useMediaQuery` bezpiecznie w SSR?** – Nie renderować warunkowo przed `onMounted` (flaga `hydrated`) albo podać `ssrWidth`, gdy znamy urządzenie (np. z nagłówków w SSR on-demand); układ bazowy zawsze przez CSS.
3. **Jak zsynchronizować stan Vue ze zmianami robionymi przez kod spoza Vue?** – Obserwować faktyczne źródło prawdy (atrybut DOM przez `MutationObserver`, `storage` event, custom event) i w callbacku odczytywać je ponownie, zamiast utrzymywać równoległy stan.
4. **Kiedy nie dodawać VueUse?** – Gdy używasz jednego prostego helpera, a zależność komplikuje build/SSR; VueUse jest tree-shakowalne, więc koszt w bundlu zwykle jest mały.

---

<a id="provide-inject"></a>

## 15. `provide` / `inject` z typowanym `InjectionKey`

### Co to jest

`provide(key, value)` udostępnia wartość wszystkim potomkom; `inject(key, default)` odczytuje najbliższą. `InjectionKey<T>` to `Symbol` z doczepionym typem – `inject(I18N)` zwraca `T | undefined` bez rzutowania, a `provide(I18N, x)` sprawdza typ `x`. Zakres to **jedna aplikacja Vue** (plus `app.provide` na poziomie aplikacji). Wartość nie jest automatycznie reaktywna – reaktywność masz tylko, gdy wstrzykniesz `ref`/`reactive`.

### Gdzie w projekcie

- Klucz i helpery: `src/components/vue/i18n.ts:15-33`.
- `provideI18n` w korzeniach wysp: `src/components/vue/GameExplorer.vue:32`, `src/components/vue/FavoritesList.vue:16`.
- `useI18n(fallbackLocale)` w wyspach bez providera: `src/components/vue/FavoriteButton.vue:27`, `FavoritesCounter.vue:10`, `ThemeToggle.vue:9`.
- Wstrzyknięcie w testach: `tests/unit/components.test.ts:13`.

```ts
// src/components/vue/i18n.ts:15-22
export const I18N: InjectionKey<I18nContext> = Symbol('i18n');

/** Wywoływane w komponencie-korzeniu wyspy. */
export function provideI18n(locale: Locale): I18nContext {
  const context = { locale, t: useTranslations(locale) };
  provide(I18N, context);
  return context;
}
```

### Dlaczego tak

Słownik zawiera **funkcje** (odmiana przez liczby, np. `t.favorites.counter(n)`, `t.list.resultsOf(a, b)`), a serializator propsów Astro nie obsługuje funkcji – więc słownika nie da się podać z `.astro` jako props wyspy. Wyspa dostaje tylko `locale: 'pl' | 'en'`, importuje słownik sama i rozdaje potomkom przez `provide`, zamiast przewlekać `t` przez każdy poziom (prop drilling). `fallbackLocale` pozwala tym samym komponentom działać jako samodzielne wyspy (`FavoriteButton` na stronie gry). Kontekst nie jest reaktywny celowo – język strony się nie zmienia (zmiana języka to nawigacja).

### Alternatywy i trade-offy

- **Props `t` w każdym komponencie** – jawne, ale prop drilling przez `FilterPanel`, `ChipGroup` itd.
- **Import słownika w każdym komponencie + `locale` w propsie** – brak DI, ale każdy komponent musi znać locale; trudniej podmienić w testach.
- **`vue-i18n`** – pełne i18n (format liczb/dat, pluralizacja, lazy loading), ale cięższe; przy dwóch małych słownikach przerost formy.
- **`app.provide` przez `appEntrypoint` Astro** – globalnie dla wysp, ale funkcja setup aplikacji nie zna propsów wyspy (locale), więc i tak trzeba by go skądś wziąć (np. z `document.documentElement.lang`, co nie działa na serwerze).

### Pułapki

- `inject` bez domyślnej wartości gdy brak providera → ostrzeżenie w dev; tu `inject(I18N, null)` (`i18n.ts:29`) i jawny błąd/fallback.
- Każda wyspa to **osobna aplikacja** – `provide` w `GameExplorer` nie jest widoczny w `FavoritesCounter` w headerze.
- `provide` wywołane po `await` w `setup` lub poza `setup` nie działa.
- Klucz-`Symbol` musi być tym samym obiektem – podwójna kopia modułu (np. dwa bundle'e) = dwa różne symbole.
- Koszt bundla: `useTranslations` importuje oba słowniki (PL i EN) do kodu klienta (wspólny chunk `i18n.*.js`), choć wyspa potrzebuje jednego.

### Pytania rekrutacyjne (senior)

1. **Jak otypować `inject` bez rzutowania?** – `InjectionKey<T>` (Symbol z typem); dla kluczy-stringów trzeba `inject<T>('key')`.
2. **Jak zrobić reaktywny `provide` i chronić go przed mutacją przez dzieci?** – `provide(key, readonly(state))` + funkcje mutujące jako osobne pola kontekstu; dzieci czytają, zmieniają przez API providera.
3. **Dlaczego w Astro nie da się przekazać funkcji jako props wyspy?** – Propsy są serializowane do atrybutu HTML `props` i deserializowane w przeglądarce; serializator obsługuje dane (obiekty, tablice, `Date`, `Map`, `Set`, `URL`, `BigInt`, `RegExp`, typed arrays), ale nie funkcje ani instancje klas.

---

<a id="teleport"></a>

## 16. `Teleport` i natywny `<dialog>` / `showModal()`

### Co to jest

`<Teleport to="body">` renderuje zawartość w innym miejscu DOM, zachowując ją w logicznym drzewie Vue (props, provide/inject, eventy działają normalnie). W SSR Vue renderuje treść teleportów do osobnego bufora `ssrContext.teleports`, który host musi sam wstrzyknąć do HTML-a. Natywny `<dialog>` z `showModal()` daje top layer (bez walki z `z-index`), `::backdrop`, `inert` dla reszty strony (focus nie ucieka), zdarzenie `cancel` na Esc i przywrócenie focusu po zamknięciu. W 3.5 doszedł `<Teleport defer>` (cel szukany po zamontowaniu aplikacji).

### Gdzie w projekcie

`src/components/vue/FilterDrawer.vue:19-25` (bramka `mounted`) i `:59-73` (Teleport + dialog), sterowanie przez `watch` w `:28-33`:

```vue
<!-- src/components/vue/FilterDrawer.vue:64-72 -->
  <Teleport v-if="mounted" to="body">
    <dialog
      ref="dialog"
      :aria-labelledby="titleId"
      class="sheet m-0 mt-auto max-h-[88dvh] w-full max-w-none rounded-t-3xl bg-paper p-0 text-ink shadow-lift"
      :style="dragY ? { transform: `translateY(${dragY}px)`, transition: 'none' } : undefined"
      @close="open = false"
      @cancel.prevent="open = false"
      @click="onBackdropClick"
```

### Dlaczego tak

- **Teleport – po co, skoro jest top layer?** Element otwarty przez `showModal()` trafia do **top layer**, którego containing block to viewport – `overflow`, `transform` i `z-index` przodków już go nie dotyczą, więc Teleport **nie** jest potrzebny do „wyjścia spod” sticky paska. (Wcześniejszy komentarz w kodzie tak to uzasadniał; został poprawiony – `FilterDrawer.vue:59-63`.) Teleport daje co innego: dialog nie jest elementem siatki `lg:grid` w `GameExplorer.vue:196` (nie zajmuje komórki gridu, gdy jest zamknięty), nie dziedziczy stylów wyspy i nie zależy od tego, gdzie rodzic umieści komponent – np. przodek z `display: none` ukryłby także dialog w top layer.
- **Brak Teleportu w SSR**: renderer Astro (`node_modules/@astrojs/vue/dist/server.js:30`) wywołuje `renderToString(app)` bez obsługi `teleports`, więc treść nie trafia do HTML-a, a hydracja szukałaby jej w `<body>`. Zamknięty dialog nie jest potrzebny w HTML-u z serwera, więc renderujemy go dopiero po `onMounted`. Dodatkowo cały `FilterDrawer` jest montowany tylko po hydracji na mobile (`GameExplorer.vue:332`).
- **Natywny dialog** zamiast własnej implementacji: focus trap, Esc, inert i przywrócenie focusu „za darmo” i zgodnie z a11y. `@cancel.prevent` utrzymuje jedno źródło prawdy (`open`), a zamknięcie wykonuje `watch`.

### Alternatywy i trade-offy

- **Własny modal (`div` + `role="dialog"` + focus-trap)** – pełna kontrola animacji, ale dużo kodu a11y do napisania i przetestowania.
- **`<Teleport defer>`** (3.5) – rozwiązuje cel renderowany później w tej samej aplikacji, nie problem SSR w Astro.
- **`<Teleport :disabled="!mounted">`** – treść renderuje się w miejscu na serwerze; dla zamkniętego dialogu niepotrzebny HTML.
- **`client:only="vue"` dla drawera** – nie da się, bo drawer jest częścią wyspy `GameExplorer`.
- **Atrybut `closedby="any"`** na `<dialog>` (nowszy, jeszcze nie wszędzie wspierany) zamiast ręcznego `onBackdropClick`.

### Pułapki

- Ustawienie atrybutu `open` (`<dialog :open="…">`) **nie** czyni dialogu modalnym – brak top layer, `inert` i `::backdrop`; trzeba `showModal()`.
- `v-if` na samym `<dialog>` przy zamykaniu zabija animację i przywracanie focusu – dialog powinien istnieć, zmieniamy tylko stan.
- Esc → `cancel` → `close`; bez `.prevent` przeglądarka zamyka dialog sama, a stan Vue (`open`) trzeba zsynchronizować przez `@close`.
- Teleport w SSR bez obsługi `ssrContext.teleports` = hydration mismatch.
- Błędne uzasadnienie Teleportu („żeby uciec spod `overflow`/`z-index`”) przy `showModal()` – top layer już to załatwia; przy niemodalnym `show()` albo zwykłym `div` – wtedy faktycznie Teleport jest potrzebny.
- `showModal()` nie blokuje przewijania strony pod spodem na wszystkich platformach (tu `overscroll-contain` na treści).

### Pytania rekrutacyjne (senior)

1. **Jak Teleport zachowuje się w SSR?** – Treść trafia do `ssrContext.teleports[target]`; aplikacja hostująca musi ją wstrzyknąć w odpowiednie miejsce HTML-a. Bez tego klient nie znajdzie węzłów przy hydracji.
2. **Co daje `showModal()` względem `show()`?** – Top layer, `::backdrop`, `inert` dla reszty dokumentu, Esc/`cancel`, modalną semantykę dla czytników ekranu; `show()` to zwykły niemodalny dialog.
3. **Czy komponent w Teleporcie widzi `provide` z rodzica?** – Tak – Teleport zmienia tylko miejsce w DOM, nie w drzewie komponentów (`FilterPanel` w drawerze korzysta z `useI18n()` z `GameExplorer`).

---

<a id="transitions"></a>

## 17. `Transition` i `TransitionGroup`

### Co to jest

`<Transition>` animuje wejście/wyjście **jednego** elementu/komponentu (przez `v-if`/`v-show` albo zmianę `key`), dodając klasy `*-enter-from/active/to` i `*-leave-*`. `<TransitionGroup>` robi to dla list z kluczami i dodatkowo animuje przesunięcia (`*-move`) techniką FLIP. Transition nie działa przy pierwszym renderze (także przy hydracji), chyba że ustawisz `appear`.

### Gdzie w projekcie

- `<Transition name="badge">` z `:key="count"` – „pop” licznika przy każdej zmianie: `src/components/vue/FavoritesCounter.vue:21-30`, CSS `:34-41`.
- `<Transition name="expand">` dla listy dodatków: `src/components/vue/GameCard.vue:160-176`.
- `<TransitionGroup name="chip">` bez `tag` (fragment): `src/components/vue/GameExplorer.vue:278-291`.
- `<TransitionGroup tag="ul" name="fav">` tylko z animacją wyjścia (bez `-move`): `src/components/vue/FavoritesList.vue:50-63`, CSS `:67-77`.

```vue
<!-- src/components/vue/FavoritesCounter.vue:21-30 -->
<Transition name="badge">
      <span
        v-if="count > 0"
        :key="count"
        class="absolute -top-0.5 -right-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-heart px-1 text-[0.6875rem] leading-none font-bold text-white dark:text-black"
        aria-hidden="true"
      >
        {{ count }}
      </span>
    </Transition>
```

### Dlaczego tak

Mikroanimacje dają informację zwrotną (dodano do ulubionych, usunięto filtr) bez bibliotek. `:key="count"` to celowy trik: zmiana klucza = nowy element = ponowne `enter`, więc badge „pyka” przy każdej zmianie liczby. Zdefiniowano tylko `badge-enter-active`, więc wyjście starego elementu jest natychmiastowe. Animacje używają `transform`/`opacity` (kompozytor, bez layoutu). W `FavoritesList` celowo **nie ma** klasy `fav-move`: lista jest tylko zmniejszana (usunięcie z ulubionych), a FLIP przy usuwaniu wymagałby wyjęcia znikającej karty z przepływu (`position: absolute` w `fav-leave-active`), co w siatce CSS Grid daje skok rozmiaru karty. Prostsze rozwiązanie: karta zanika, reszta przesuwa się bez animacji.

### Alternatywy i trade-offy

- **Czyste CSS (`@keyframes` na `[aria-pressed]`)** – jak w `FavoriteButton.vue:62-65`; zero JS, ale tylko dla zmian atrybutów, nie dla montowania/odmontowania.
- **View Transitions API** – projekt używa `viewTransitionName` dla okładek (`GameCard.vue:64`) między stronami; dla zmian w obrębie listy byłoby to cięższe.
- **Biblioteki (GSAP, `@vueuse/motion`)** – więcej możliwości, większy bundle.

### Pułapki

- `TransitionGroup` wymaga unikalnych `:key` na **bezpośrednich** dzieciach.
- Klasa `*-move` nie zadziała przy usuwaniu, jeśli element opuszczający zostaje w przepływie layoutu: rodzeństwo przesuwa się dopiero po usunięciu węzła, już bez transition. Zalecane jest `position: absolute` w `*-leave-active`. Dlatego z `FavoritesList` usunięto nieskuteczne `.fav-move` (wcześniej było w CSS, ale przy samych usunięciach nigdy się nie odpalało) – martwy CSS sugerował animację, której nie było.
- `TransitionGroup` z `tag` przekazuje atrybuty (`role="list"`, `class`) na wygenerowany element – to dobrze, ale łatwo o tym zapomnieć.
- Respektuj `prefers-reduced-motion` (globalnie w CSS).
- Animacje nie odpalą się przy hydracji – to zaleta (brak „skakania” po załadowaniu).

### Pytania rekrutacyjne (senior)

1. **Jak działa animacja `move` w `TransitionGroup`?** – FLIP: Vue zapamiętuje pozycje przed zmianą, po patchu liczy różnicę, ustawia odwrotny `transform`, a potem usuwa go z klasą `*-move` z transition.
2. **Jak wymusić animację wejścia przy zmianie wartości tego samego elementu?** – Zmienić `key` – Vue potraktuje to jako nowy element (unmount + mount), więc wykona `leave` starego i `enter` nowego.
3. **Kiedy `mode="out-in"`?** – Gdy stary i nowy element nie mogą być jednocześnie w DOM (przełączanie widoków); kosztem jest sekwencyjne opóźnienie.

---

<a id="attrs-scoped"></a>

## 18. Fallthrough attributes i `<style scoped>` / `:deep()`

### Co to jest

Atrybuty i listenery przekazane do komponentu, które nie są zadeklarowanymi propsami/emitami (`class`, `style`, `aria-*`, natywne `on*`), trafiają automatycznie na **element root** komponentu (fallthrough). `inheritAttrs: false` (przez `defineOptions`) wyłącza to zachowanie. `<style scoped>` dodaje atrybut `data-v-xxx` do elementów komponentu i przepisuje selektory; root element dziecka dostaje także scope rodzica. `:deep(sel)` przenosi selektor poza scope (`.a[data-v-x] sel`).

### Gdzie w projekcie

- `class` przekazywana do `AppIcon` (root `<svg>`): `src/components/vue/SearchBox.vue:26-29`, `src/components/vue/ThemeToggle.vue:62-63`.
- `:deep()` w `src/components/vue/FavoriteButton.vue:62-65`.
- Atrybuty `role`/`class` na `TransitionGroup tag="ul"`: `src/components/vue/FavoritesList.vue:50-55`.

```css
/* src/components/vue/FavoriteButton.vue:59-65 */
.fav[aria-pressed='true'] {
  color: var(--heart);
}
.fav[aria-pressed='true'] :deep(.fav-icon) {
  fill: currentColor;
  animation: pop 320ms var(--ease-out-soft);
}
```

### Dlaczego tak

`AppIcon` ma jeden root (`<svg>`), więc klasy pozycjonujące z rodzica (`absolute`, `text-muted`, `dark:hidden`) „po prostu działają” bez deklarowania propsa `class`. Style są głównie Tailwindem; `scoped` zostało dla animacji i stanów, które zależą od atrybutów (`aria-pressed`). `:deep(.fav-icon)` stylizuje element wewnątrz komponentu dziecka; ponieważ `.fav-icon` jest akurat rootem `AppIcon` (który dostaje też scope rodzica), zadziałałoby to nawet bez `:deep` – `:deep` czyni intencję jawną i jest odporne na zmianę struktury `AppIcon`.

### Alternatywy i trade-offy

- **Prop `class`/`iconClass`** – jawne, ale nienaturalne w Vue.
- **CSS Modules (`<style module>`)** – twarda izolacja nazw, gorsza współpraca z selektorami globalnymi.
- **Tylko Tailwind (`aria-pressed:fill-current`)** – mniej CSS, ale animacje `@keyframes` i tak lądują w CSS.

### Pułapki

- Komponent z wieloma rootami (fragment) nie ma automatycznego fallthrough – trzeba `v-bind="$attrs"` (inaczej ostrzeżenie).
- Listener `@click` na komponencie bez zadeklarowanego emitu trafia na root jako natywny listener.
- `:deep` łatwo nadużyć i rozlać style na całe poddrzewo.
- Scoped CSS nie działa na treść wstrzykiwaną przez `v-html`.

### Pytania rekrutacyjne (senior)

1. **Dlaczego root element dziecka jest stylowany przez scoped CSS rodzica?** – Celowo: rodzic może kontrolować layout dziecka (marginesy, pozycja) bez `:deep`; dostaje on atrybuty scope obu komponentów.
2. **Jak przekazać atrybuty na element inny niż root?** – `defineOptions({ inheritAttrs: false })` + `v-bind="$attrs"` (albo `useAttrs()`) na wybranym elemencie.

---

<a id="lifecycle"></a>

## 19. Cykl życia: `onMounted` / `onBeforeUnmount`

### Co to jest

`onMounted` wykonuje się po wstawieniu (lub zhydratowaniu) DOM komponentu – **nigdy na serwerze**; dzieci montują się przed rodzicem. `onBeforeUnmount` – tuż przed odmontowaniem, do sprzątania listenerów/timerów (`onUnmounted` – po). W SSR wykonują się tylko `setup` i `onServerPrefetch`, co czyni `onMounted` naturalnym miejscem na wszystko, co zależy od przeglądarki.

### Gdzie w projekcie

- Odczyt localStorage: `src/composables/useFavorites.ts:67-71`.
- Odczyt URL + `popstate`, sprzątanie: `src/composables/useUrlQueryState.ts:37-41`.
- Odczyt motywu z DOM: `src/components/vue/ThemeToggle.vue:19-26`.
- Flagi „po hydracji”: `src/components/vue/GameExplorer.vue:180-181`, `src/components/vue/FilterDrawer.vue:24-25`.

```ts
// src/composables/useUrlQueryState.ts:37-41
onMounted(() => {
  readUrl();
  window.addEventListener('popstate', readUrl);
});
onBeforeUnmount(() => window.removeEventListener('popstate', readUrl));
```

### Dlaczego tak

`onMounted` jest **granicą między renderem identycznym z HTML-em z serwera a stanem specyficznym dla przeglądarki**: hydracja przebiega na stanie domyślnym (jak SSR), a dopiero potem zmieniamy stan i Vue robi zwykłą aktualizację DOM. Sprzątanie `popstate` jest wzorowe, choć w praktyce wyspy Astro odmontowują się tylko przy `astro:unmount` (np. z `ClientRouter`, którego projekt nie używa). Listener `storage` w `useFavorites.ts:48` celowo nie jest sprzątany – należy do singletonu modułu, nie do instancji.

### Alternatywy i trade-offy

- **`onBeforeMount`** – też nie działa na serwerze, ale DOM jeszcze nie istnieje i przy hydracji zmiana stanu tutaj = mismatch.
- **`onScopeDispose`** zamiast `onBeforeUnmount` – działa też w `effectScope` (poza komponentami).
- **`useEventListener` z VueUse** – automatyczny cleanup.
- **`client:only`** – cały komponent tylko w przeglądarce, wtedy odczyt w `setup` byłby bezpieczny (brak SSR).

### Pułapki

- Każda zmiana stanu w `onMounted` to **dodatkowy render tuż po hydracji** – np. `hydrated.value = true` re-renderuje cały `GameExplorer`. Karty go nie odczuwają tylko dlatego, że mają stabilne propsy i slot (`STABLE`) – z dynamicznym slotem ten render przeszedłby przez wszystkie 252 karty (patrz [sekcja 7](#slots)).
- Odwołanie do `window`/`document` w `setup` (poza hookiem) wywali build SSR (`window is not defined`) albo da mismatch.
- `onMounted` rejestrowane po `await` w `setup` – nie zadziała.
- Rodzic w `onMounted` może polegać na tym, że dzieci są zamontowane – ale nie na tym, że async dzieci (lazy hydration, `defineAsyncComponent`) też są.

### Pytania rekrutacyjne (senior)

1. **Które hooki wykonują się w SSR?** – Żadne z `on*Mount*`/`on*Update*`; tylko `setup` (i `onServerPrefetch`). Dlatego kod przeglądarkowy idzie do `onMounted`.
2. **Kolejność `onMounted` w drzewie?** – Od dzieci do rodzica (post-order), bo rodzic jest „zamontowany”, gdy całe jego poddrzewo jest w DOM.
3. **Jak uniknąć wycieku listenerów w composable?** – Rejestrować i usuwać w parze (`onMounted`/`onBeforeUnmount` lub `onScopeDispose`), albo użyć `useEventListener`.

---

<a id="ssr-hydration"></a>

## 20. SSR i hydracja w wyspach Astro

### Co to jest

Astro (tu `output: 'static'`) renderuje każdą wyspę w buildzie przez `createSSRApp` + `renderToString` i opakowuje HTML w `<astro-island>` z atrybutami `component-url`, `renderer-url`, `props` (zserializowane propsy), `client="…"` i `prefix` (dla `useId`). Dyrektywa `client:*` decyduje, **kiedy** przeglądarka pobierze kod i wykona `createSSRApp(…).mount(el, true)` (hydracja): `client:load` – od razu, `client:idle` – w `requestIdleCallback` (fallback `setTimeout` 200 ms, opcjonalnie `client:idle={{ timeout }}`), `client:visible` – po wejściu w viewport (IntersectionObserver), `client:media` – po spełnieniu media query, `client:only` – bez SSR. Hydracja zakłada, że pierwszy render klienta daje **identyczny** DOM jak HTML z serwera; w produkcji Vue poprawia niezgodny tekst i podmienia niezgodne węzły, ale **nie poprawia niezgodnych atrybutów/klas** (w dev tylko ostrzega; od 3.5 można świadomie wyciszyć ostrzeżenie atrybutem `data-allow-mismatch`).

### Gdzie w projekcie

| Wyspa                             | Dyrektywa     | Miejsce                                 |
| --------------------------------- | ------------- | --------------------------------------- |
| `GameExplorer`                    | `client:load` | `src/views/HomeView.astro:83`           |
| `FavoritesList`                   | `client:load` | `src/views/FavoritesView.astro:33-38`   |
| `FavoritesCounter`, `ThemeToggle` | `client:idle` | `src/components/SiteHeader.astro:63-68` |
| `FavoriteButton` (strona gry)     | `client:idle` | `src/views/GameView.astro:138`          |

Mechanizmy unikania mismatchu:

- `localStorage` dopiero po zamontowaniu, z bramką per instancja: `src/composables/useFavorites.ts:57-73`.
- `location.search` dopiero w `onMounted`: `src/composables/useUrlQueryState.ts:32-40`.
- `matchMedia` za flagą `hydrated`: `src/components/vue/GameExplorer.vue:175-183`, `:198`, `:332`.
- Stan „wczytywanie” zamiast fałszywie pustej listy: `src/components/vue/FavoritesList.vue:26-37`.
- Motyw: skrypt inline w `<head>` (`src/layouts/BaseLayout.astro:31-55`), komponent zna go dopiero po mount (`src/components/vue/ThemeToggle.vue:14-34`).
- Odchudzony model danych dla propsów: `src/lib/game-index.ts:1-4`, `:12-40`.

```vue
<!-- src/components/vue/GameExplorer.vue:180-183 i :198 -->
const hydrated = ref(false);
onMounted(() => (hydrated.value = true));
const isDesktop = useMediaQuery('(min-width: 1024px)');
const drawerOpen = ref(false);
<!-- … -->
    <aside v-if="!hydrated || isDesktop" class="hidden lg:block" :aria-label="t.list.filters">
```

```ts
// src/composables/useFavorites.ts:67-74
const mounted = shallowRef(false);
onMounted(() => {
  hydrateOnce();
  mounted.value = true;
});

const visible = computed(() => (mounted.value ? favorites.value : EMPTY));
const isFavorite = (id: string) => visible.value.has(id);
```

### Dlaczego tak

- **`client:load` dla `GameExplorer`**: wyszukiwarka i filtry to główna funkcja strony; pierwsze karty są w SSR (resztę dokłada `useProgressiveLimit`, bez JS – linki w `<noscript>`), a skrypty wysp są modułami (async), więc nie blokują renderu.
- **`client:load` dla `FavoritesList`**: bez JS strona nie ma treści. SSR (a nie `client:only`) daje placeholder o tych samych wymiarach co pusty stan – brak CLS.
- **`client:idle` w headerze i na stronie gry**: nie są potrzebne do pierwszego malowania; nie konkurują z hydracją listy. `client:visible` nic by nie dało – są nad zgięciem, więc „widoczne” od razu.
- **Bramka `mounted` per instancja w `useFavorites`**: wyspy hydratują się w różnym czasie. Gdyby `FavoritesCounter` (idle) wczytał ulubione do wspólnego stanu, a potem hydratowała się wyspa z serduszkiem, jej pierwszy render pokazałby `aria-pressed="true"` wobec `"false"` w HTML-u – a Vue w produkcji nie poprawi tego atrybutu. Każda instancja widzi więc ulubione dopiero po **swoim** `onMounted`.
- **`hydrated` w `GameExplorer`**: `useMediaQuery` zna wynik na kliencie już w `setup`; do czasu montażu układ ustala CSS (`hidden lg:block`), a potem JS montuje albo sidebar, albo drawer (jeden `FilterPanel` naraz).
- **Serializacja propsów**: `GameIndexItem` nie ma opisów; w obecnym buildzie atrybut `props` wyspy listy to ~370 tys. znaków (po escapowaniu HTML) w `dist/index.html`. To główny koszt SSR+hydracji: dane są w HTML-u dwa razy (DOM + props).

### Alternatywy i trade-offy

- **`client:only="vue"`** – zero mismatchy, ale brak HTML-a (SEO, CLS, brak treści bez JS).
- **`client:visible` dla listy** – lista jest pod hero, ale filtry/wyszukiwarka muszą działać od razu po przewinięciu; ryzyko „martwego” kliknięcia.
- **Ciasteczko/parametr dla SSR on-demand** (np. motyw, `ssrWidth`) – w SSG niemożliwe.
- **`data-allow-mismatch`** (3.5) – wycisza ostrzeżenie, ale nie poprawia DOM – w produkcji nadal zostałby zły atrybut.
- **Mniejsze propsy**: przekazać tylko id i pobrać indeks `fetch`-em z JSON-a (cache HTTP, mniejszy HTML), kosztem dodatkowego żądania i opóźnienia interaktywności.

### Pułapki

- Każdy odczyt `window`, `localStorage`, `location`, `matchMedia`, `Date.now()`, `Math.random()` w `setup` lub w szablonie = potencjalny mismatch.
- Różnice ICU między Node a przeglądarką (`Intl.Collator`, `toLocaleString`) mogą dać inną kolejność/format na serwerze i kliencie – `sortGames` i `GameCard.vue:24-33` polegają na tym, że są zgodne.
- Kliknięcie przed hydracją (`client:idle`) nie ma handlera – dla krytycznych akcji użyj `client:load` albo natywnego fallbacku (link/formularz).
- Mismatch atrybutów nie jest naprawiany w produkcji – test SSR (`tests/unit/components.test.ts:93-101`) to jedyny tani sposób, by tego pilnować.
- Wyspy to osobne aplikacje: `provide`, Pinia, devtools-instancje – wszystko per wyspa.

### Pytania rekrutacyjne (senior)

1. **Co dokładnie dzieje się przy hydracji i co Vue robi przy niezgodności w produkcji?** – Vue przechodzi istniejący DOM równolegle z vnode'ami, podpina listenery i refy zamiast tworzyć węzły. Przy niezgodnym tekście nadpisuje `textContent`, przy niezgodnym typie węzła – podmienia węzeł; niezgodnych atrybutów/klas nie poprawia (ostrzega tylko w dev lub z flagą `__VUE_PROD_HYDRATION_MISMATCH_DETAILS__`).
2. **Jak bezpiecznie pokazać stan z `localStorage` w komponencie renderowanym na serwerze?** – Render „neutralny” na serwerze i w pierwszym renderze klienta, odczyt w `onMounted`, potem zwykła aktualizacja; przy stanie współdzielonym – bramka per instancja (jak w `useFavorites`).
3. **Dlaczego `client:idle` dla małych wysp, a nie `client:load`?** – Hydracja to praca na głównym wątku; małe wyspy nie są potrzebne do LCP/pierwszej interakcji, więc nie powinny konkurować z hydracją głównej wyspy (TBT/INP).
4. **Co trafia do HTML-a jako propsy wyspy i jakie to ma konsekwencje?** – Zserializowane dane (bez funkcji); duże tablice zwiększają HTML i czas parsowania, a dane istnieją podwójnie (DOM + props). Stąd odchudzony `GameIndexItem`.

---

<a id="shared-state"></a>

## 21. Stan współdzielony między wyspami – singleton modułu

### Co to jest

Każda wyspa Astro to osobna aplikacja Vue (`createSSRApp` per `<astro-island>`), więc `provide`/`inject` ani plugin zainstalowany w jednej (np. Pinia) nie są widoczne w drugiej. Wszystkie wyspy na stronie importują jednak **ten sam moduł ES** – Vite wydziela współdzielony kod do wspólnego chunka (w buildzie: `dist/_astro/useFavorites.*.js`), a moduł ES wykonuje się raz na stronę. Ref utworzony na poziomie modułu jest więc singletonem widocznym dla wszystkich wysp.

### Gdzie w projekcie

- `src/composables/useFavorites.ts:5-15` – komentarz decyzji i stan modułu.
- `src/composables/useFavorites.ts:41-52` – jednorazowy odczyt + synchronizacja między kartami (`storage` event).
- Konsumenci: `src/components/vue/FavoritesCounter.vue:11-12`, `FavoriteButton.vue:28`, `GameExplorer.vue:33`, `FavoritesList.vue:17`.
- Test współdzielenia między aplikacjami: `tests/unit/useFavorites.test.ts:77-83`.

```ts
// src/composables/useFavorites.ts:13-15 i :41-46
const favorites = shallowRef<ReadonlySet<string>>(new Set());
const ready = shallowRef(false);
let listening = false;
// …
function hydrateOnce() {
  if (ready.value) return;
  favorites.value = read();
  ready.value = true;
  if (!listening) {
    listening = true;
```

### Dlaczego tak

Wspólny stan to jeden `Set<string>` z trwałością w localStorage. Singleton modułu nie wymaga zależności, konfiguracji ani `appEntrypoint`, działa w testach (osobne `createApp` – `tests/unit/useFavorites.test.ts:22-41`) i jest w pełni reaktywny w Vue. **Bezpieczeństwo w SSR**: na serwerze moduł jest wspólny dla wszystkich renderowanych stron (jeden proces buildu), co zwykle grozi przeciekiem stanu między żądaniami – tu nie, bo serwer nigdy nie pisze do stanu (`onMounted` się nie wykonuje, `favorites` zostaje pustym `Set`).

### Alternatywy i trade-offy

- **nanostores** (+ `@nanostores/persistent`, `@nanostores/vue`) – rekomendacja Astro; agnostyczne frameworkowo (wyspy React/Svelte/Vue dzielą stan). Koszt: zależność i drugi model reaktywności z adapterem.
- **Pinia ze wspólną instancją** przez `appEntrypoint` – patrz [sekcja 22](#pinia).
- **`createGlobalState` + `useStorage` z VueUse** – mniej własnego kodu (serializacja `Set`, `storage` event), ale bramkę per instancja i tak trzeba dopisać.
- **CustomEvent na `window` / `BroadcastChannel`** – luźne powiązanie, ale ręczna synchronizacja stanu i brak reaktywności „za darmo”.

### Pułapki

- **SSR**: stan modułu na serwerze jest współdzielony między żądaniami/stronami. Mutacja w `setup` na serwerze = wyciek danych między użytkownikami (w SSR on-demand) lub stronami (w SSG).
- **Duplikacja modułu**: jeśli moduł trafi do dwóch różnych chunków (np. różne ścieżki importu, różne wersje), powstaną dwa singletony.
- Wyspy hydratują się w różnym czasie – stan globalny nie może bezpośrednio sterować pierwszym renderem (stąd `mounted` per instancja).
- Testy: stan przeżywa między testami – potrzebny reset (`__resetFavoritesForTests`, `useFavorites.ts:94-97`; uwaga: nie resetuje flagi `listening`).

### Pytania rekrutacyjne (senior)

1. **Dlaczego zmienna na poziomie modułu jest współdzielona między wyspami?** – Moduły ES są singletonami w obrębie realm/strony: każdy `import` tego samego URL-a dostaje tę samą instancję modułu. Wyspy różnią się aplikacją Vue, ale nie modułami.
2. **Jakie ryzyko niesie ten wzorzec w SSR i jak go tu zneutralizowano?** – Cross-request state pollution. Tu serwer nigdy nie mutuje stanu (odczyt i zapisy tylko po `onMounted`/w handlerach).
3. **Kiedy wybrałbyś nanostores?** – Gdy wyspy są w różnych frameworkach albo stan musi być czytany poza komponentami (zwykłe skrypty Astro).

---

<a id="pinia"></a>

## 22. Pinia – świadomie nieużyta

### Co to jest

Pinia to oficjalny store Vue: definiujesz store'y (`defineStore`) w stylu options albo setup, dostajesz devtools (timeline, edycja stanu), pluginy (np. persystencja), wsparcie SSR (serializacja `pinia.state.value`) i HMR. Instancję instaluje się w aplikacji (`app.use(pinia)`); w Astro robi się to w pliku wskazanym opcją `appEntrypoint` integracji `@astrojs/vue`, który wykonuje się dla **każdej** wyspy.

### Gdzie w projekcie

Nigdzie – to decyzja. Odpowiedniki: wspólny stan `src/composables/useFavorites.ts:13-14` (komentarz o alternatywach w `:11`), lokalny stan wyspy `src/composables/useGameFilters.ts:27`. `astro.config.ts` używa `vue()` bez `appEntrypoint`.

```ts
// src/composables/useFavorites.ts:7-11
 * Każda wyspa to osobna aplikacja Vue (osobne `createApp`), więc provide/inject ani Pinia
 * zainstalowana w jednej wyspie nie są widoczne w drugiej. Wszystkie wyspy na stronie ładują jednak
 * TEN SAM moduł ES (Vite wydziela go do wspólnego chunka), więc ref utworzony na poziomie modułu
 * jest singletonem: serduszko na karcie i licznik w headerze widzą ten sam stan.
 * Alternatywy: nanostores (gdy wyspy są w różnych frameworkach), Pinia z jednym wspólnym store'em.
```

### Dlaczego tak

- Globalny stan to **jeden `Set` id**; stan filtrów jest lokalny dla jednej wyspy i synchronizowany z URL-em (URL jest „store'em” współdzielonym z historią przeglądarki).
- Pinia per wyspa = osobne store'y; żeby współdzielić, trzeba w `appEntrypoint` używać **wspólnej instancji** utworzonej na poziomie modułu – czyli i tak singletonu modułu, tylko z dodatkową warstwą.
- Na serwerze wspólna instancja Pinii przeciekałaby stan między stronami buildu – trzeba by rozróżniać serwer/klienta.
- Astro nie ma wbudowanego transferu stanu store'a z SSR do klienta – dane i tak idą przez propsy wysp.
- Bramka hydracji per instancja (`mounted`) i tak musiałaby zostać w composable/getterze.

### Alternatywy i trade-offy

- **Pinia** – wybrałbym, gdy: wiele powiązanych store'ów, rozbudowana logika domenowa współdzielona między wieloma wyspami, zespół oczekuje devtools/time-travel i konwencji, potrzeba pluginów (persystencja, undo), albo aplikacja to w praktyce SPA w jednej wyspie (`client:only`).
- **nanostores** – lżejsze, wieloframeworkowe, bez devtools Vue.
- **Singleton modułu** (wybrany) – najmniej kodu, pełna kontrola nad hydracją, brak devtools/pluginów.

### Pułapki

- `app.use(pinia)` z nową instancją w każdej wyspie → stan **nie jest** współdzielony (najczęstszy błąd przy Astro).
- Store używany przed `app.use(pinia)` → błąd „getActivePinia was called with no active Pinia”.
- Destrukturyzacja store'a gubi reaktywność – `storeToRefs(store)`.
- Moduł-singleton Pinii po stronie serwera w SSR on-demand = wyciek danych między żądaniami.

### Pytania rekrutacyjne (senior)

1. **Jak współdzielić Pinię między wyspami Astro?** – `appEntrypoint` z `export default (app) => app.use(sharedPinia)`, gdzie `sharedPinia` jest tworzone na poziomie modułu tylko w przeglądarce (na serwerze – nowa instancja per render).
2. **Kiedy store, a kiedy composable?** – Store dla stanu globalnego o długim życiu, z wieloma konsumentami i potrzebą narzędzi; composable dla logiki/stanu lokalnego dla komponentu/wyspy lub prostego singletonu.
3. **Czy URL może być store'em?** – Tak, dla stanu, który ma być linkowalny i przeżyć odświeżenie/„wstecz” (filtry); wymaga parsera odpornego na śmieci i decyzji `pushState` vs `replaceState`.

---

<a id="lazy-hydration"></a>

## 23. Lazy hydration w Vue 3.5 – zmierzona i odrzucona

### Co to jest

Od **3.5** `defineAsyncComponent({ loader, hydrate })` przyjmuje strategię hydracji: `hydrateOnVisible()`, `hydrateOnIdle()`, `hydrateOnInteraction()`, `hydrateOnMediaQuery()` (lub własną). Komponent jest renderowany na serwerze normalnie, ale na kliencie jego kod jest ładowany i hydratowany dopiero, gdy strategia zadziała – to „wyspy wewnątrz wyspy”. Ważne ograniczenie implementacji: jeśli komponent-wrapper zostanie **zaktualizowany przez rodzica przed hydracją**, Vue pomija lazy hydration (ostrzeżenie „Skipping lazy hydration … it was updated before lazy hydration performed”).

### Gdzie w projekcie

Nieużyte – **wypróbowane i zmierzone**. Kandydat: lista 252 kart w `src/components/vue/GameExplorer.vue:301-318`. Stan obecny: slot karty jest `STABLE`, a propsy mają stabilne referencje (`:76-85`), więc **główna techniczna przeszkoda została usunięta** – re-render rodzica po montażu (`:181`) nie aktualizuje już kart. Decyzję „nie teraz” podtrzymują wyniki Lighthouse w `README.md:117`.

```vue
<!-- src/components/vue/GameExplorer.vue:306-317 -->
<li v-for="game in results" :key="game.id" class="card-slot">
          <!--
            [Vue] Scoped slot: treść slotu używa propsów slotu (`card`), a nie zmiennej `game` z v-for.
            Slot odwołujący się do zmiennych z v-for kompilator oznacza jako dynamiczny i wymusza
            re-render karty przy każdym renderze rodzica.
          -->
          <GameCard :game="game" :expansions="expansionsOf(game)">
            <template #actions="{ game: card }">
              <FavoriteButton :id="card.id" :title="card.title" @toggle="announceFavorite" />
            </template>
          </GameCard>
        </li>
```

Tak wyglądała testowana zmiana (wycofana – patrz pomiar niżej):

```ts
const LazyGameCard = defineAsyncComponent({
  loader: () => import('./GameCard.vue'),
  hydrate: hydrateOnVisible({ rootMargin: '200px' }),
});
```

### Dlaczego tak

- **Pomiar zamiast intuicji**: na produkcji (GitHub Pages) strona główna miała 91–94 (TBT 170–280 ms). Lazy hydration kart (`hydrateOnVisible({ rootMargin: '300px' })`) **pogorszyła** TBT lokalnie do 320–380 ms. Powód: strategia `hydrateOnVisible` przy hydracji każdej karty woła `getBoundingClientRect()` (sprawdzenie, czy element jest już w viewporcie) – 252 wymuszone przeliczenia layoutu w jednym tasku. Profil głównego wątku pokazał zresztą, że największy koszt to **Style & Layout** (~370 ms dla ~10 tys. węzłów DOM), a nie wykonanie JS hydracji.
- **Co zadziałało**: CSS `content-visibility: auto` + `contain-intrinsic-size: auto …` na elementach listy (klasa `.card-slot` w `src/styles/global.css`) – karty poza ekranem nie są układane ani malowane. Wynik produkcyjny: 93–99 (mediana 96), TBT 60–160 ms. Zero JS, zero zmian w modelu hydracji.
- **Przed poprawką slotów by nie zadziałała**: `onMounted(() => (hydrated.value = true))` re-renderuje `GameExplorer` od razu po hydracji; gdy karty miały `DYNAMIC_SLOTS` i nową tablicę `expansions` przy każdym renderze, wszystkie wrappery zostałyby zaktualizowane przed hydracją i Vue pominąłby lazy hydration dla każdej karty. Po przejściu na scoped slot i stabilne propsy wrapper nie jest patchowany, dopóki jego dane się nie zmienią – lazy hydration jest więc **technicznie możliwa** (ćwiczenie 1 w [Ścieżce nauki](#sciezka-nauki)).
- **Złożoność stanu**: karty hydratowane później muszą mieć te same zabezpieczenia co osobne wyspy – `FavoriteButton` już ma bramkę `mounted` per instancja, ale każdy nowy stan zależny od przeglądarki musiałby ją mieć.
- **UX**: serduszko w niezhydratowanej karcie jest „martwe” (brak handlera) – trzeba by `hydrateOnInteraction` albo pogodzić się z utratą pierwszego kliknięcia.
- **Korzyść ograniczona**: `GameCard` to mały chunk (kilka kB); głównym kosztem jest CPU hydracji 252 kart, a nie transfer.

### Alternatywy i trade-offy

- **Lazy hydration kart** – mniejszy TBT na starcie, kosztem: martwych serduszek przed hydracją karty, trudniejszego debugowania i pilnowania, by nikt nie przywrócił niestabilnych propsów/slotów (regresja byłaby cicha – tylko ostrzeżenie w dev).
- **Paginacja / „pokaż więcej”** – mniej DOM i mniej hydracji; gorsze SEO listy (choć strony gier są osobno indeksowane) i UX przeglądania. **Wybrany wariant bez przycisku**: `useProgressiveLimit` – SSR i hydracja 24 kart, reszta doklejana porcjami w `requestIdleCallback` (krótkie taski zamiast jednego ~650 ms), bez JS linki w `<noscript>`. W przeciwieństwie do `hydrateOnVisible` nie mierzy pozycji elementów, więc nie wymusza layoutu. Koszt: ręczne przywracanie przewinięcia przy „wstecz” bez bfcache.
- **Wirtualizacja listy** – minimalny DOM, ale konflikt z SSR (pełna lista w HTML dla SEO) i z `Ctrl+F`.
- **Rozbicie na osobne wyspy Astro (`client:visible` per karta)** – niemożliwe, bo karty zależą od stanu filtrów wyspy `GameExplorer`.
- **`v-memo`** na elemencie listy – alternatywny sposób odcięcia zbędnych re-renderów; tu niepotrzebny, bo stabilne propsy i sloty dają ten sam efekt bez ręcznej listy zależności.

### Pułapki

- **Optymalizacja „na oko” może szkodzić**: lazy hydration brzmi jak oczywista wygrana dla długiej listy, a tu zwiększyła TBT. Zawsze porównuj ten sam scenariusz przed/po (kilka przebiegów – Lighthouse ma rozrzut ±3 pkt).
- `hydrateOnVisible` przy starcie mierzy pozycję każdego elementu (`getBoundingClientRect`) – przy setkach instancji to wymuszone layouty; w połączeniu z `content-visibility: auto` koszt rośnie jeszcze bardziej.
- Aktualizacja wrappera przed hydracją = brak lazy hydration (sprawdzone w `@vue/runtime-core`: `__asyncHydrate` rejestruje `beforeUpdate`, które ustawia flagę `patched`).
- Każdy prop tworzony w szablonie (inline obiekty/tablice, `.map()`/`.filter()` w szablonie, funkcje strzałkowe) i każdy slot czytający zmienną z `v-for` powoduje aktualizację dziecka – a więc i utratę lazy hydration. `expansionsOf(game)` jest bezpieczne tylko dlatego, że zwraca referencje z cache (`expansionsById`) lub stałą `NO_EXPANSIONS`.
- Interakcja przed hydracją jest tracona, chyba że użyjesz `hydrateOnInteraction` (który odtwarza zdarzenie).
- Lazy hydration działa tylko przy SSR+hydracji – przy zwykłym `mount` komponent jest po prostu async.

### Pytania rekrutacyjne (senior)

1. **Czym różni się lazy hydration Vue 3.5 od `client:visible` w Astro?** – `client:visible` opóźnia całą aplikację (wyspę); lazy hydration Vue opóźnia poddrzewo **wewnątrz** jednej aplikacji, zachowując wspólny stan, `provide`/`inject` i reaktywność z rodzicem.
2. **Dlaczego aktualizacja rodzica może „zepsuć” lazy hydration?** – Jeśli rodzic spatchuje niezhydratowany wrapper, DOM i vnode'y przestają się zgadzać ze stanem „do hydracji”, więc Vue rezygnuje z leniwej hydracji (ostrzeżenie) i komponent zachowuje się jak zwykły async.
3. **Od czego zaczniesz optymalizację hydracji dużej listy?** – Od pomiaru (Performance panel, TBT/INP, Vue devtools „highlight updates”) i sprawdzenia, CO jest kosztem (JS? style/layout?). Potem ustabilizowanie propsów/slotów, tanie wygrane w CSS (`content-visibility`), a dopiero potem lazy hydration/paginacja – i ponowny pomiar. W tym projekcie lazy hydration przegrała z jedną regułą CSS.

---

<a id="testing"></a>

## 24. Testowanie composables i komponentów

### Co to jest

Vitest (środowisko `jsdom`) + `@vue/test-utils` (`mount`, `wrapper.find`, `trigger`, `emitted`, `setProps`). Composables bez lifecycle hooków testuje się jak zwykłe funkcje (reaktywność działa poza komponentem); te z `onMounted`/`inject` – w mini-aplikacji. SSR testuje się `createSSRApp` + `renderToString` z `vue/server-renderer`, co odtwarza warunki serwera (brak `onMounted`).

### Gdzie w projekcie

- Konfiguracja: `vitest.config.ts:5-14` (`@vitejs/plugin-vue`, alias `@`, `jsdom`).
- Wstrzyknięcie `provide` do testów: `tests/unit/components.test.ts:13`.
- Kontrakt `v-model`: emitowane nowe tablice (`tests/unit/components.test.ts:28-43`) i odzwierciedlenie wartości z propsa `modelValue` (`:45-51`).
- Test SSR „bez localStorage”: `tests/unit/components.test.ts:93-101`.
- Kilka osobnych aplikacji („wysp”) dla singletonu: `tests/unit/useFavorites.test.ts:13-41`, `:77-83`.
- Composable bez komponentu: `tests/unit/useGameFilters.test.ts:12-15`.
- Fake timers dla debounce: `tests/unit/useUrlQueryState.test.ts:22-25`, `:42-53`.
- Fabryka danych: `tests/unit/fixtures.ts:4-35`.

```ts
// tests/unit/components.test.ts:93-101
it('SSR render never reads storage (hydration safety)', async () => {
  localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(['g1']));
  const Host = defineComponent({
    render: () => h('section', [h(FavoriteButton, { id: 'g1', title: 'Catan', locale: 'pl' })]),
  });
  const html = await renderToString(createSSRApp(Host));
  expect(html).toContain('aria-pressed="false"');
  expect(html).not.toContain('aria-pressed="true"');
});
```

### Dlaczego tak

- Testy sprawdzają **zachowanie z perspektywy użytkownika** (atrybuty ARIA, tekst, emitowane eventy), nie wewnętrzny stan.
- Test SSR to jedyne tanie zabezpieczenie przed mismatchem atrybutów, którego produkcyjne Vue nie naprawi.
- `useFavorites.test.ts` montuje **osobne aplikacje** (`createApp`), żeby odtworzyć wyspy Astro, i łapie wartość w `setup` przed `onMounted` – czyli stan, który zobaczyłby SSR/hydracja (`:52-59`).
- `vi.useFakeTimers()` + `advanceTimersByTimeAsync` testuje debounce bez realnego czekania.

### Alternatywy i trade-offy

- **`@testing-library/vue`** – zapytania po rolach/etykietach (bliżej a11y), mniej dostępu do internali; projekt sprawdza role przez selektory atrybutów.
- **Vitest Browser Mode / Playwright component testing** – prawdziwa przeglądarka (`<dialog>`, `matchMedia`, layout), wolniejsze. `jsdom` (30.x) w ogóle nie implementuje `showModal()`/`close()` (`HTMLDialogElement` jest pustą klasą) – dlatego `FilterDrawer` nie ma testów jednostkowych, a jest objęty tylko smoke testem e2e (`tests/e2e/smoke.spec.ts:30-37`).
- **Helper `withSetup`** (Vue docs) zamiast ręcznego `Probe` – mniej kodu, to samo podejście.
- **`effectScope`** do testów composables bez lifecycle – pozwala sprzątnąć efekty (`scope.stop()`).

### Pułapki

- `trigger()` zwraca promise (`nextTick`) – bez `await` asercje widzą stary DOM.
- `mount` z `v-model`: kliknięcie w dziecko **nie zmieni** jego propsa – dziecko tylko emituje `update:modelValue`. Asercje na DOM po interakcji wymagają, żeby test zagrał rolę rodzica (`'onUpdate:modelValue': (v) => wrapper.setProps({ modelValue: v })`) – albo, jak w tym projekcie, rozdzielenia testu na „emituje poprawną wartość” i „renderuje przekazaną wartość”.
- Stan modułu przeżywa między testami – `beforeEach` z resetem (`__resetFavoritesForTests`) i `localStorage.clear()`.
- Nieodmontowane aplikacje zostawiają listenery (`popstate`, `storage`) – `afterEach` z `unmount` (`tests/unit/useFavorites.test.ts:47-49`).
- `computed` stworzony poza komponentem/scope'em nigdy nie jest zatrzymany – w testach bez znaczenia, w kodzie produkcyjnym to wyciek.

### Pytania rekrutacyjne (senior)

1. **Jak przetestujesz komponent z `v-model`?** – Dwa testy kontraktu, jak w `tests/unit/components.test.ts:28-51`: interakcja → `emitted('update:modelValue')` zawiera nową wartość; prop `modelValue` → DOM ją odzwierciedla. Do testu integracyjnego „pełnej pętli” – handler `'onUpdate:modelValue': (v) => wrapper.setProps({ modelValue: v })` albo komponent-host z prawdziwym `v-model`.
2. **Jak upewnić się w testach, że komponent nie spowoduje hydration mismatch?** – Wyrenderować go `renderToString(createSSRApp(…))` przy „wrogim” środowisku (wypełniony localStorage, URL z query) i sprawdzić, że HTML jest neutralny; ewentualnie zhydratować ten HTML w jsdom i nasłuchiwać ostrzeżeń `console.warn`.
3. **Kiedy composable da się przetestować bez komponentu?** – Gdy nie używa hooków cyklu życia ani `inject`; reaktywność (`ref`, `computed`) działa bez instancji (`tests/unit/useGameFilters.test.ts`).

---

<a id="sciezka-nauki"></a>

## 25. Ścieżka nauki

### Kolejność czytania

1. `src/lib/game-index.ts` → `src/lib/filters.ts` – dane i czysta logika (bez Vue). Przeczytaj razem z `tests/unit/filters.test.ts`.
2. `src/composables/useGameSearch.ts` → `useGameFilters.ts` → `useUrlQueryState.ts` → `useFavorites.ts` – od najprostszego do najbardziej „SSR-owego”. Każdy z odpowiadającym testem w `tests/unit/`.
3. `src/components/vue/i18n.ts` – provide/inject.
4. Komponenty-liście: `AppIcon.vue` → `SelectField.vue` → `SegmentedControl.vue` → `ChipGroup.vue` → `SearchBox.vue`.
5. Złożenia: `FilterPanel.vue` → `FilterDrawer.vue` → `GameCard.vue` → `FavoriteButton.vue`.
6. Korzenie wysp: `GameExplorer.vue` (najważniejszy plik), potem `FavoritesList.vue`, `FavoritesCounter.vue`, `ThemeToggle.vue`.
7. Granice wysp: `src/views/HomeView.astro`, `FavoritesView.astro`, `GameView.astro:138`, `src/components/SiteHeader.astro`, `src/layouts/BaseLayout.astro`.
8. Na koniec `node_modules/@astrojs/vue/dist/client.js` i `server.js` (krótkie!) – żeby zobaczyć, jak naprawdę działa wyspa.

### Ćwiczenia

1. **Nowy filtr end-to-end: „najlepsza liczba graczy”** (pole `bestPlayers` już jest w `GameIndexItem`). Dodaj pole do `FilterState` i `defaultFilterState`, logikę w `matchesFilters`, licznik w `activeFilterCount`, (de)serializację w `stateFromQuery`/`stateToQuery`, nowy `defineModel` w `FilterPanel`, `v-model:*` w obu miejscach `GameExplorer`, chip w `chips`, tłumaczenia w `src/i18n/*`, testy w `filters.test.ts` i `useUrlQueryState.test.ts`. Cel: zobaczyć, ile warstw dotyka jedna zmiana i gdzie typy TS Cię prowadzą.
2. **Lazy hydration kart.** Slot karty jest już `STABLE`, a propsy stabilne – sprawdź, czy to wystarcza. Zamień `GameCard` w `GameExplorer` na `defineAsyncComponent({ loader, hydrate: hydrateOnVisible({ rootMargin: '200px' }) })`, uruchom `pnpm dev` i szukaj w konsoli „Skipping lazy hydration”. Potem celowo przywróć stary wariant slotu (`<template #actions>` z `game.id` z `v-for`) i zobacz, że ostrzeżenia wracają. Zmierz TBT w Lighthouse przed i po (`pnpm build && pnpm preview`) i zdecyduj, co zrobić z kliknięciem w serduszko przed hydracją karty (`hydrateOnInteraction`?).
3. **Pinia zamiast singletonu.** Dodaj `pinia`, `appEntrypoint` w `astro.config.ts` ze wspólną instancją po stronie klienta i nową per render na serwerze, przenieś `useFavorites` do `defineStore` (setup store), zachowaj bramkę `mounted`. Porównaj rozmiar `dist/_astro/*.js` i liczbę linii; sprawdź, że testy `useFavorites.test.ts` nadal przechodzą (co musiało się zmienić w harnessie?).
4. **Test regresji wydajności.** Napisz test `GameExplorer` (props z `makeGame`, `locale: 'pl'`), który liczy aktualizacje kart przez globalny mixin: `mount(GameExplorer, { props, global: { mixins: [{ updated() { if (this.$options.__name === 'GameCard') updates++ } }] } })` (`__name` nadaje kompilator `<script setup>`). Wpisz frazę w `SearchBox` i sprawdź, że `updates` pozostaje `0`, dopóki nie minie debounce (`vi.useFakeTimers()`). Taki test zabezpiecza poprawkę z [sekcji 7](#slots) przed cichą regresją – sprawdź to, przywracając na chwilę stary wariant slotu.
5. **Stabilny slot także w `FavoritesList`.** `FavoritesList.vue:58-60` nadal ma slot czytający `game` z `v-for` (`DYNAMIC_SLOTS`). Przepisz go na `#actions="{ game: card }"`, porównaj wynik kompilacji (`compileScript` z `@vue/compiler-sfc`, flagi `_: 1` vs `_: 2`) i zastanów się, czy zmiana ma tu realny wpływ (kiedy ta wyspa się re-renderuje?). Opisz, kiedy taka optymalizacja jest warta dodatkowej składni, a kiedy nie.
