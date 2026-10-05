Generator postów na FB:

- chce móc wybrać, gry z listy
- nastepnie generaot obrazów powinien złoyć okładki wybranych tytułów w grafikę, która moge umieścić na swoim profilu na fb
- grafika powinna zawierać logo groty
- napis wybrany przez uzytkownika, domyślnie: W tym tygodniu było grane w:
- Dodaj to jako podstronę, narazie za prostym hasłem, zapisanym w astro (test-123), wystarczy, ze boty nie bedą tej strony odwiedzać, chce udostepnić to tylko czesci uytnowików a strona nie ma logowania

## Doprecyzowanie (2026-10-05)

### Grafika

- Format: post 1:1, **1080×1080 px**, eksport **PNG** (przycisk „Pobierz”).
- Jasne tło + czarne logo (`src/assets/brand/bgp_grota.png`).
- Elementy: logo, napis (edytowalny), siatka okładek, **nazwy gier pod okładkami**.
- Okładki przycinane do równych kafelków (object-fit: cover).
- Siatka dynamiczna – dopasowuje się do liczby gier, **maks. 25** (5×5).

### Wybór gier

- Wyszukiwarka po nazwie – **tylko gry bazowe** (bez dodatków).
- Gra spoza listy Groty: obrazek z pliku na urządzeniu + wpisana nazwa.
- Kolejność: kolejność dodawania + przycisk **„Losuj kolejność”** (shuffle).
- Brak zapamiętywania wyboru/napisu między wizytami.

### Podstrona

- Adresy: `/generator/` (PL) i `/en/generator/` (EN); interfejs w obu językach.
- Domyślny napis: PL „W tym tygodniu było grane w:”, EN „This week we played:”.
- Hasło `test-123` sprawdzane w przeglądarce (świadomie – ochrona tylko przed botami/przypadkowymi gośćmi), zapamiętane w localStorage na stałe.
- `noindex`, poza sitemapą, brak linków w menu.

---

## Szczegóły implementacji

> Instrukcja dla implementującego. Trzymaj się istniejących wzorców projektu (Astro 7 + wyspy Vue 3.5, Tailwind 4, i18n przez `src/i18n`, komentarze po polsku, oznaczenia `[Vue]` przy ciekawszych konstrukcjach). Pracuj na gałęzi `feat/generator-grafik`, nie na `main`.

### 1. Pliki do utworzenia / zmiany

| Plik                                                                             | Co                                                                                                                       |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `src/config/generator.ts`                                                        | Stałe: `GENERATOR_PASSWORD = 'test-123'`, `GENERATOR_MAX_GAMES = 25`, `GENERATOR_ACCESS_KEY = 'grota:generator-access'`. |
| `src/lib/generator/types.ts`                                                     | Typy client-safe (bez `astro:*`, `node:*`): `GeneratorGame`, `SelectedItem`.                                             |
| `src/lib/generator/layout.ts`                                                    | Czysta funkcja `computeLayout(count)` – geometria siatki (bez canvas, testowalna).                                       |
| `src/lib/generator/render.ts`                                                    | `renderPoster(ctx, options)` – rysowanie na canvas + pomocnicze `loadImage`, `wrapText`.                                 |
| `src/lib/generator/shuffle.ts`                                                   | `shuffle<T>(items: readonly T[]): T[]` – Fisher–Yates, zwraca nową tablicę.                                              |
| `src/lib/data/generator.ts`                                                      | Build-time (Astro): `buildGeneratorIndex(locale)` i `generatorLogoUrl()`.                                                |
| `src/components/vue/generator/GeneratorApp.vue`                                  | Korzeń wyspy: `provideI18n`, bramka hasła, stan wyboru.                                                                  |
| `src/components/vue/generator/PasswordGate.vue`                                  | Formularz hasła.                                                                                                         |
| `src/components/vue/generator/GamePicker.vue`                                    | Wyszukiwarka gier z listy + dodawanie gry spoza listy.                                                                   |
| `src/components/vue/generator/SelectedList.vue`                                  | Lista wybranych: usuń, „Losuj kolejność”, „Wyczyść”.                                                                     |
| `src/components/vue/generator/PosterPreview.vue`                                 | `<canvas>` 1080×1080 + przycisk „Pobierz PNG”.                                                                           |
| `src/views/GeneratorView.astro`                                                  | Widok wspólny dla PL/EN (wzorzec: `FavoritesView.astro`).                                                                |
| `src/pages/generator.astro`, `src/pages/en/generator.astro`                      | Cienkie strony: `<GeneratorView locale="pl" />` / `"en"`.                                                                |
| `src/i18n/index.ts`                                                              | Nowa trasa `generator: { pl: 'generator/', en: 'en/generator/' }`.                                                       |
| `src/i18n/pl.ts`, `src/i18n/en.ts`                                               | Nowa sekcja `generator` + `meta.generatorTitle`, `meta.generatorDescription`.                                            |
| `astro.config.ts`                                                                | Regex w filtrze sitemapy: dodać `generator` → `/\/(discord\|ulubione\|favorites\|generator)\/$/`.                        |
| `tests/unit/generator-layout.test.ts`, `tests/unit/generator-components.test.ts` | Testy jednostkowe (pkt 9).                                                                                               |
| `tests/e2e/smoke.spec.ts`, `tests/e2e/a11y.spec.ts`                              | Scenariusz e2e + strona `./generator/` w liście a11y.                                                                    |

**Nie zmieniać:** `robots.txt` (wpis `Disallow` publicznie zdradzałby adres), menu w `SiteHeader`/`SiteFooter` (brak linków do generatora), `llms*.txt`.

### 2. Dane (build-time) – `src/lib/data/generator.ts`

```ts
// src/lib/generator/types.ts
export interface GeneratorGame {
  id: string;
  title: string; // gameTitle(game, locale) – PL: titlePl, EN: titleOriginal
  subtitle: string | null; // gameSubtitle(game, locale) – tylko do listy wyników
  search: string; // jak w toIndexItem (znormalizowane tytuły + nazwy alternatywne)
  cover: string | null; // URL okładki 480 px webp (same-origin!)
}

export type SelectedItem =
  | { key: string; source: 'catalog'; title: string; cover: string | null }
  | { key: string; source: 'custom'; title: string; cover: string /* blob: URL */ };
```

- `buildGeneratorIndex(locale)`: `getAllGames()` → **tylko `kind === 'base'`** → mapowanie na `GeneratorGame`. Pole `search` liczyć tak samo jak w `toIndexItem` (wydziel wspólną funkcję `searchText(game)` w `src/lib/data/games.ts` zamiast kopiować kod).
- Okładka: `coverImage(game)` → `getImage({ src, width: 480, format: 'webp' })` → `.src`. Gdy brak obrazu → `null`.
- **Nie** przekazywać `GameIndexItem` (za ciężki – srcsety, filtry). Tylko `GeneratorGame`.
- `generatorLogoUrl()`: `getImage({ src: logoBlack /* @/assets/brand/bgp_grota.png */, width: 320, format: 'png' })` → `.src`.
- Dlaczego URL-e z `getImage`, a nie z BGG: obrazki z tej samej domeny nie „brudzą” canvasa (tainted canvas blokuje `toBlob`).

### 3. Strona – `src/views/GeneratorView.astro`

- `BaseLayout` z: `title={t.meta.generatorTitle + ' – Grota'}`, `description`, `locale`, `alternates` (z `localizedPath({ name: 'generator' }, …)` dla pl/en), `current={null}`, **`noindex`**.
- Treść: `<section class="container-page pt-8 sm:pt-12">`, `<h1>` z `t.generator.heading`, pod nim wyspa:
  ```astro
  <GeneratorApp client:only="vue" locale={locale} games={games} logoUrl={logoUrl} />
  ```
- `client:only="vue"` (a nie `client:load`): stan bramki zależy od `localStorage`, SSR dałby mignięcie formularza hasła / mismatch. Strona nie potrzebuje treści w HTML (noindex).
- W `<noscript>` krótki komunikat `t.generator.noscript`.

### 4. Bramka hasła – `PasswordGate.vue` + `GeneratorApp.vue`

- `GeneratorApp` przy starcie czyta `localStorage.getItem(GENERATOR_ACCESS_KEY) === '1'` (w `try/catch` – storage może być zablokowany; wtedy po prostu `false`).
- Zablokowane → renderuje tylko `PasswordGate`; odblokowane → resztę.
- `PasswordGate`: `<form>` z `<label>` + `<input type="password" autocomplete="off">` + przycisk „Wejdź”. Submit: porównanie `value.trim() === GENERATOR_PASSWORD`.
  - OK → `localStorage.setItem(GENERATOR_ACCESS_KEY, '1')` (w `try/catch`), emit `unlock`.
  - Źle → komunikat błędu pod polem (`role="alert"`), pole wyczyszczone i z fokusem.
- Brak opcji „wyloguj” (niepotrzebna).
- Komentarz w kodzie: hasło jest jawne w bundlu JS – to świadoma ochrona tylko przed botami i przypadkowymi gośćmi.

### 5. Wybór gier – stan w `GeneratorApp.vue`

- `const selected = ref<SelectedItem[]>([])`, `const heading = ref(t.generator.defaultHeading)`.
- Nic nie jest zapisywane między wizytami (poza flagą hasła).
- Przy `selected.length >= GENERATOR_MAX_GAMES` dodawanie jest zablokowane (przyciski `disabled`), wyświetlany jest komunikat `t.generator.limitReached`.
- Licznik „12 / 25” przy nagłówku listy wybranych.
- Przy usuwaniu gry `custom` i w `onBeforeUnmount` → `URL.revokeObjectURL(cover)`.

#### `GamePicker.vue`

- **Wyszukiwarka:** reużyj `SearchBox.vue` (już ma etykietę, czyszczenie, Esc) i `useGameSearch` (debounce). Dopasowanie: `matchesQuery(game, debouncedQuery)` z `src/lib/filters.ts` (obsługuje frazy bez polskich znaków).
- Wyniki pokazywane tylko, gdy fraza niepusta: maks. **8** pierwszych dopasowań, lista przycisków (tytuł + `subtitle` mniejszym, wyciszonym tekstem). Gry już wybrane: widoczne, ale `disabled` z dopiskiem „dodano”.
- Kliknięcie wyniku → `emit('add', item)` z `key = game.id`, czyści frazę, fokus wraca do pola wyszukiwania (`SearchBox` ma `focus()` przez `defineExpose`).
- Brak wyników → tekst `t.generator.noResults`.
- **Gra spoza listy:** pod wyszukiwarką zwijany blok (`<details>`) „Dodaj grę spoza listy”:
  - `<input type="text">` – nazwa (wymagana, trim, maks. 80 znaków),
  - `<input type="file" accept="image/*">` – obrazek (wymagany),
  - przycisk „Dodaj” – `disabled`, dopóki brakuje nazwy lub pliku.
  - Dodanie → `{ key: crypto.randomUUID(), source: 'custom', title, cover: URL.createObjectURL(file) }`, reset formularza.

#### `SelectedList.vue`

- Lista `<ol>` w kolejności z `selected` (= kolejność na grafice). Każdy wiersz: miniatura 40 px (`cover` lub szary kwadrat), tytuł, przycisk „Usuń” (ikona `close` z `AppIcon`, `aria-label` z tytułem gry).
- Przyciski pod listą: **„Losuj kolejność”** (`selected.value = shuffle(selected.value)`; `disabled` przy < 2 grach) i **„Wyczyść”** (bez potwierdzenia).
- Pusta lista → tekst `t.generator.emptySelection`.

#### Napis

- `<input type="text">` z etykietą `t.generator.headingLabel`, `v-model="heading"`, maks. 80 znaków. Pusty napis jest dozwolony (miejsce na napis zostaje puste – układ się nie zmienia).

### 6. Grafika – `layout.ts` + `render.ts`

Canvas zawsze **1080×1080** (atrybuty `width`/`height`), w podglądzie skalowany CSS-em (`w-full max-w-[540px] h-auto aspect-square`).

**Kolory i fonty** (wartości jasnego motywu z `global.css`, wpisane na sztywno – grafika nie zależy od motywu strony):

| Element                           | Wartość                                            |
| --------------------------------- | -------------------------------------------------- |
| Tło                               | `#f6f1e7` (`--paper`)                              |
| Napis                             | `#1b1916` (`--ink`), `600 …px "Fraunces Variable"` |
| Nazwy gier                        | `#1b1916`, `600 …px "Inter Variable"`              |
| Placeholder okładki (brak obrazu) | `#efe8da` (`--surface-sunken`)                     |

**Układ** (wszystkie liczby w px canvasa):

```
+--------------------------------+
|  W tym tygodniu było           |   ← napis (header)
|  grane w:                      |
|  [ ]  [ ]  [ ]  [ ]            |
|  [ ]  [ ]  [ ]  [ ]            |   ← grid
|  [ ]  [ ]  [ ]                 |
|                         [logo] |   ← stopka: logo w prawym dolnym rogu
+--------------------------------+

padding poziomy = 56, padding górny = 56, padding dolny = 40
header: x ∈ [56, 1024], y = 56, zarezerwowana wysokość 140 (także gdy napis pusty)
  napis: wyrównany do lewej, textBaseline 'top', interlinia 1.15, maks. 2 linie;
         rozmiar fontu: start 60, zmniejszaj o 2, aż się zmieści w 2 liniach, minimum 40;
         jeśli przy 40 nadal > 2 linie → druga linia ucięta „…”
stopka: logo wysokość 96, szerokość z proporcji (1871:1770 → 101),
        prawy dolny róg: x = 1024 − 101, y = 1080 − 40 − 96 = 944
grid: obszar x ∈ [56, 1024], y ∈ [56 + 140 + 32, 944 − 24] = [228, 920]  → 968 × 692
```

Stałe geometrii (`CANVAS = 1080`, `GRID = { x: 56, y: 228, width: 968, height: 692 }`, `LOGO = { x: 923, y: 944, height: 96 }` itd.) trzymaj w `layout.ts` jako eksportowane `const`, żeby łatwo było je potem dostroić.

`computeLayout(count: number)` → `{ cols, rows, tile, labelHeight, labelFontSize, cells: { x, y }[] }`:

- ~~`cols = Math.ceil(Math.sqrt(count))`~~ → **zmiana przy implementacji:** `cols` wybierane spośród 1…count tak, by kafelek był największy (remis → mniej pustych miejsc, potem mniej kolumn), `rows = Math.ceil(count / cols)`. Obszar siatki jest szerszy niż wyższy, a pod okładkami są podpisy, więc √n×√n marnował szerokość: dla 25 gier 5×5 dawało kafelki 69 px, wybrane 7×4 – 105 px. Wyniki: 1→1×1, 2→2×1, 4→2×2, 5→3×2, 10→5×2, 25→7×4.
- `gap = 24`, `labelFontSize = clamp(16, round(tile * 0.085), 30)`, `labelHeight = round(labelFontSize * 1.25 * 2) + 10` (2 linie + odstęp nad tekstem).
- Kafelek okładki jest **kwadratowy**: `tile = min((968 − gap·(cols−1)) / cols, (692 − gap·(rows−1)) / rows − labelHeight)` – iteracyjnie (labelHeight zależy od tile): policz z `labelHeight` dla `labelFontSize = 30`, potem przelicz raz z faktycznym rozmiarem fontu. Zaokrąglij w dół.
- Cała siatka wyśrodkowana w obszarze grid w poziomie i pionie. **Ostatni niepełny rząd wyśrodkowany** w poziomie.
- `count = 0` → `{ cells: [] }` (podgląd pokazuje samo tło, logo i napis; przycisk pobierania `disabled`).

`renderPoster(ctx, { heading, items, logo, images })`:

- `images: Map<string, HTMLImageElement | null>` – wczytane wcześniej (klucz = `item.key`).
- Okładka: przycięcie „cover” do kwadratu (wylicz `sx, sy, sw, sh` ze źródła tak, by środek obrazu był zachowany), `drawImage` w ścieżce z zaokrąglonymi rogami (`ctx.roundRect`, promień `round(tile * 0.06)`, `ctx.save()/clip()/restore()`).
- Brak obrazu → zaokrąglony prostokąt `#efe8da`.
- Nazwa gry: wyśrodkowana pod okładką, `textBaseline = 'top'`, maks. 2 linie (`wrapText` łamie po słowach; słowo dłuższe niż linia łamane po znakach), nadmiar → „…”.

**Ładowanie zasobów** (w `PosterPreview.vue`):

- `loadImage(url): Promise<HTMLImageElement | null>` – `new Image()`, `src = url`, `await img.decode()`, błąd → `null` (rysujemy placeholder, nie wywalamy całej grafiki). Cache w `Map<url, Promise>` na poziomie modułu.
- Przed pierwszym rysowaniem: `await document.fonts.load('600 64px "Fraunces Variable"', 'ąęłóśźż')` i to samo dla `"Inter Variable"` – drugi argument wymusza pobranie podzbioru latin-ext (polskie znaki), inaczej canvas narysuje font zastępczy.
- `watch([heading, selected], render, { deep: true, immediate: true })`. Render jest asynchroniczny (ładowanie obrazków) → zabezpiecz się przed wyścigiem: licznik `renderId`, rysuj tylko jeśli po `await` licznik się nie zmienił.

### 7. Eksport

- Przycisk „Pobierz PNG” (`disabled` przy 0 grach): `canvas.toBlob(cb, 'image/png')` → `URL.createObjectURL` → tymczasowy `<a download="grota-gry-YYYY-MM-DD.png">` → `click()` → `revokeObjectURL`. Data = dzisiejsza, lokalna.
- Bez udostępniania i kopiowania do schowka.

### 8. Układ strony i i18n

- Desktop (`lg:`): dwie kolumny – lewa: napis, wyszukiwarka, gra spoza listy, lista wybranych; prawa: podgląd (`lg:sticky lg:top-24`) + przycisk pobierania. Mobile: jedna kolumna, podgląd **pod** listą wybranych.
- Używaj istniejących klas/tokenów (`container-page`, `bg-surface`, `border-line`, `text-muted`, `icon-btn`, przyciski jak na reszcie strony – podejrzyj `FavoritesList.vue` / `FilterPanel.vue`).
- Klucze w `pl.ts` (EN analogicznie, typ `Dictionary` wymusi komplet):

```ts
generator: {
  heading: 'Generator grafiki na Facebooka',
  noscript: 'Generator wymaga włączonego JavaScriptu.',
  passwordLabel: 'Hasło',
  passwordSubmit: 'Wejdź',
  passwordError: 'Nieprawidłowe hasło.',
  headingLabel: 'Napis na grafice',
  defaultHeading: 'W tym tygodniu było grane w:',   // EN: 'This week we played:'
  searchLabel: 'Szukaj gry z kolekcji',
  noResults: 'Brak gier pasujących do wyszukiwania.',
  alreadyAdded: 'dodano',
  customToggle: 'Dodaj grę spoza listy',
  customName: 'Nazwa gry',
  customImage: 'Okładka (zdjęcie z urządzenia)',
  customAdd: 'Dodaj',
  selectedHeading: 'Wybrane gry',
  selectedCount: (n: number, max: number) => `${n} / ${max}`,
  emptySelection: 'Nie wybrano jeszcze żadnej gry.',
  limitReached: 'Osiągnięto limit 25 gier.',
  remove: (title: string) => `Usuń: ${title}`,
  shuffle: 'Losuj kolejność',
  clear: 'Wyczyść',
  previewHeading: 'Podgląd',
  previewAlt: 'Podgląd grafiki z wybranymi grami',
  download: 'Pobierz PNG',
},
```

- `SearchBox` ma na sztywno `t.list.searchLabel`/`searchPlaceholder` – dodaj opcjonalne propsy `label` i `placeholder` (domyślnie stare wartości), żeby nie psuć listy gier.
- `<canvas>` ma `role="img"` i `aria-label={t.generator.previewAlt}`.

### 9. Testy

- **Unit (`vitest`)**:
  - `computeLayout`: liczba kolumn/wierszy dla 1, 2, 4, 5, 10, 25 (wg reguły „największy kafelek”); wszystkie kafelki mieszczą się w obszarze grid; ostatni niepełny rząd wyśrodkowany.
  - `shuffle`: nie mutuje wejścia, zachowuje elementy.
  - `PasswordGate`: złe hasło → komunikat; dobre → emit `unlock` + flaga w `localStorage`.
  - `GamePicker` (props: 2–3 ręcznie zbudowane `GeneratorGame`, `search` przez `normalizeForSearch`): fraza bez polskich znaków (np. „zlodziej”) znajduje tytuł z polskimi znakami („Złodziej”); kliknięcie wyniku emituje `add`; gra już wybrana jest `disabled`.
  - Filtra `kind === 'base'` w `buildGeneratorIndex` nie testujemy jednostkowo (zależy od `astro:content`) – wystarczy, że jest to jedna linia `.filter(...)`.
  - Canvas w jsdom nie działa – `renderPoster` nie testujemy jednostkowo.
- **E2E (`playwright`)**: wejście na `./generator/`, wpisanie złego i dobrego hasła, dodanie 2 gier z wyszukiwarki, kliknięcie „Pobierz PNG” → `page.waitForEvent('download')` i sprawdzenie nazwy pliku. Po przeładowaniu strony hasło nie jest już wymagane. Dodać `./generator/` do listy stron w `a11y.spec.ts`.
- Na koniec: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm format` (deploy padał już na Prettierze).

### 10. Decyzje potwierdzone przez właściciela

1. Okładki w **kwadratowych** kafelkach (pionowe pudełka przycięte z góry i z dołu).
2. Nazwy gier na grafice w języku strony: PL → polski tytuł wydania, EN → tytuł z BGG.
3. Napis u góry (Fraunces), **logo w prawym dolnym rogu**.
4. Gra bez okładki w kolekcji: beżowy kwadrat + nazwa pod spodem.
5. Poza napisem, okładkami z nazwami i logo nic więcej na grafice.
