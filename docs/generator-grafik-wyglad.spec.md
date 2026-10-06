# Generator grafik – wygląd (v2)

> Kontynuacja `docs/generator-grafik.spec.md` (v1 zaimplementowana w `afdd530`). Ta specka zmienia **tylko wygląd grafiki i panel do jego ustawiania**. Wybór gier, bramka hasła, eksport PNG, trasy i i18n z v1 zostają bez zmian, chyba że niżej napisano inaczej.

## Wymagania właściciela (2026-10-06)

- Tła mniej płaskie: predefiniowane **kolory**, **gradienty**, **ramki**, **generator własnych teł** i **przesłanie własnej grafiki**.
- Font nagłówka nudny: **kilka do wyboru, jak na FB**, w tym jeden **pasujący do logotypu Groty**.
- Kafelki z grami atrakcyjniejsze: zaokrąglenia, obecne trendy UI, ewentualnie **Glass Design (Apple)**.

## Podsumowanie

Grafika dostaje „projekt” (`PosterDesign`) złożony z trzech części: **tło**, **napis**, **kafelki**. Ustawia się go w nowym panelu **„Wygląd”** (zakładki Tło / Napis / Kafelki). Nad zakładkami są **motywy**, czyli gotowe zestawy, które jednym kliknięciem ustawiają wszystkie trzy części, a potem można je zmieniać dalej.

```
+----------------------------------+   +---------------------------+
| Napis na grafice  [__________]   |   | Podgląd (sticky)          |
| Szukaj gry …                     |   |  ┌─────────────────────┐  |
| Wybrane gry 4 / 25               |   |  │                     │  |
|                                  |   |  │      1080×1080      │  |
| Wygląd                           |   |  │                     │  |
|  Motywy: [Grota][Sukno][Aurora]… |   |  └─────────────────────┘  |
|  ( Tło | Napis | Kafelki )       |   |  [Pobierz PNG]            |
|  … kontrolki aktywnej zakładki … |   +---------------------------+
+----------------------------------+
```

---

## 1. Model projektu – `src/lib/generator/design.ts`

Jedno źródło prawdy: typy, wartości domyślne, schemat zod (do localStorage, pkt 10). Moduł client-safe, bez `astro:*` i `node:*`.

```ts
export type Tone = 'light' | 'dark'; // jasne tło → ciemny tekst i czarne logo; ciemne → odwrotnie

export type Fill =
  | { kind: 'solid'; color: string }
  | { kind: 'linear'; colors: string[]; angle: number } // 2–4 kolory, kąt w stopniach (CSS-owy: 0 = do góry)
  | { kind: 'radial'; colors: string[] } // środek → brzegi (winieta)
  | { kind: 'mesh'; base: string; blobs: { x: number; y: number; r: number; color: string }[] }; // x,y,r ∈ [0,1]

export interface BackgroundDesign {
  source: 'preset' | 'custom' | 'image';
  presetId: string; // gdy source === 'preset'
  custom: Fill; // gdy 'custom' (generator)
  image: { focus: Focus; blur: number; dim: number } | null; // gdy 'image'; sam plik trzyma GeneratorApp (blob: URL)
  pattern: 'none' | 'dots' | 'grid' | 'hex' | 'pips' | 'diagonal';
  patternOpacity: number; // 0–1, mapowane na krycie 0.03–0.15
  grain: boolean;
  frame: 'none' | 'line' | 'double' | 'rounded' | 'mat' | 'corners' | 'dice';
  tone: 'auto' | Tone; // „Kolor napisów”
  seed: number; // dla rozrzutu kostek we wzorze `pips` i losowania – stabilny między renderami
}

export interface HeadingDesign {
  font: HeadingFontId; // pkt 3
  effect: 'none' | 'shadow' | 'neon' | 'highlight' | 'glass';
  align: 'left' | 'center';
}

export interface TilesDesign {
  style: 'classic' | 'card' | 'glass' | 'polaroid' | 'overlay';
  radius: 'none' | 's' | 'm' | 'l'; // ułamek boku okładki: 0 / 0.05 / 0.10 / 0.16
  shadow: boolean;
  labels: boolean; // nazwy gier on/off
}

export interface PosterDesign {
  themeId: string | null; // null = zmieniono coś po wybraniu motywu
  background: BackgroundDesign;
  heading: HeadingDesign;
  tiles: TilesDesign;
}

export const DEFAULT_DESIGN: PosterDesign; // = motyw „Grota” (pkt 5)
```

- **`resolveTone(design, measured)`**: `tone !== 'auto'` → ta wartość; dla presetu → `preset.tone`; dla `custom`/`image` → z luminancji zmierzonej na tle (pkt 2.6).
- Z tonu wynikają: kolor tekstu (`#1b1916` / `#fffcf5`), logo (`bgp_grota.png` / `bgp_grota_white.png`), kolor ramki i wzoru.
- `accent` (akcent motywu): używany przez efekt neon, „podświetlenie” i ramki `corners`/`dice`. Presety mają akcent na sztywno; dla `custom` = najbardziej nasycony kolor z `colors`/`blobs`; dla `image` = biały/atrament wg tonu.

---

## 2. Tło

### 2.1 Presety – `src/lib/generator/presets.ts`

Każdy preset: `{ id, fill: Fill, tone, accent }`. Nazwy w i18n (`t.generator.backgrounds[id]`). Kontrast sprawdzony ze wzoru WCAG (pkt 9).

**Kolory (jednolite)**

| id           | Kolor     | Ton    | Akcent    |
| ------------ | --------- | ------ | --------- |
| `paper`      | `#f6f1e7` | jasny  | `#1e5a44` |
| `sage`       | `#dde7d9` | jasny  | `#1e5a44` |
| `sky`        | `#dbe8f2` | jasny  | `#1f3b73` |
| `lavender`   | `#e7e1f2` | jasny  | `#5b2a86` |
| `peach`      | `#f6d2bd` | jasny  | `#a8432f` |
| `mustard`    | `#e9b949` | jasny  | `#1b1916` |
| `felt`       | `#1e5a44` | ciemny | `#e8c872` |
| `ink`        | `#1b1916` | ciemny | `#e8c872` |
| `navy`       | `#1f2a44` | ciemny | `#7fb2ff` |
| `burgundy`   | `#6b1f2a` | ciemny | `#f2c48d` |
| `terracotta` | `#a8432f` | ciemny | `#ffd9b0` |
| `plum`       | `#4a2545` | ciemny | `#f5a6d6` |

**Gradienty**

| id            | Fill                                                                                                           | Ton    | Akcent    |
| ------------- | -------------------------------------------------------------------------------------------------------------- | ------ | --------- |
| `paper-glow`  | radial `#fbf7ef → #e6dbc6` (papier z winietą)                                                                  | jasny  | `#1e5a44` |
| `dawn`        | linear 135° `#fde2c8 → #f4b6a6 → #d9b3e0`                                                                      | jasny  | `#a8432f` |
| `sunset`      | linear 135° `#ffb88c → #ff8a9a → #e0a3d8`                                                                      | jasny  | `#6b1f2a` |
| `mint`        | linear 160° `#e0f5ec → #bfe2f0`                                                                                | jasny  | `#1e5a44` |
| `pastel-mesh` | mesh, baza `#fbf6ef`, plamy `#ffd1dc` (0.15, 0.2, 0.6), `#c9e4ff` (0.85, 0.3, 0.6), `#d8f5d0` (0.5, 0.95, 0.7) | jasny  | `#5b2a86` |
| `felt-table`  | radial `#2f7a5c → #0f3326` (sukno stołu z winietą)                                                             | ciemny | `#e8c872` |
| `ocean`       | linear 160° `#1f3b73 → #23798a`                                                                                | ciemny | `#9be7ff` |
| `night`       | radial `#3b2f63 → #120f1f`                                                                                     | ciemny | `#ff4fd8` |
| `aurora`      | mesh, baza `#0f1226`, plamy `#6a5cff` (0.2, 0.15, 0.7), `#00c2a8` (0.9, 0.4, 0.6), `#ff5f8f` (0.4, 1.0, 0.7)   | ciemny | `#8f7dff` |

Wymóg dla każdego presetu (test): tekst w kolorze tonu ma kontrast **≥ 3:1 z każdym kolorem** wypełnienia (duży napis) i **≥ 4.5:1 ze średnim kolorem**.

### 2.2 Rysowanie wypełnień – `render/background.ts`

`drawFill(ctx, fill, size)`: funkcja niezależna od rozmiaru (rysuje w `size × size`), bo tą samą funkcją rysujemy miniatury w panelu (pkt 6.3).

- `linear`: `createLinearGradient` z kątem CSS-owym (0° = w górę, 90° = w prawo), równe odstępy kolorów.
- `radial`: środek `(0.5, 0.42)·size`, promień `0.75·size` – lekko w górę, bo tam jest napis.
- `mesh`: wypełnij `base`, potem każda plama to `createRadialGradient` od `color` (krycie 1) do `color` z kryciem 0 o promieniu `r·size`. Bez blura – miękkość daje sam gradient. To jest „mesh/aurora gradient” z obecnych trendów, a nie prawdziwa siatka.

### 2.3 Wzory i ziarno – `render/patterns.ts`

Rysowane na wypełnieniu, w kolorze tekstu (z tonu), krycie `0.03 + patternOpacity·0.12`. Skala liczona od `size`, żeby miniatura wyglądała tak samo.

| Wzór       | Opis (dla 1080 px)                                                                                                           |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `dots`     | kropki r = 3, siatka co 36                                                                                                   |
| `grid`     | kratka, linia 1.5, co 54 (papier w kratkę)                                                                                   |
| `hex`      | siatka heksów jak plansza (bok 40, linia 1.5)                                                                                |
| `pips`     | rozrzucone ścianki kostek (zaokrąglony kwadrat 44 + oczka 1–6), pozycje/obrót z `seed` (Poisson-disc albo siatka z jitterem) |
| `diagonal` | ukośne paski 45°, szerokość 14, co 40                                                                                        |

**Ziarno** (`grain`): szum 256×256 generowany raz (PRNG z `seed`) do offscreen canvasa, `createPattern(…, 'repeat')`, `globalCompositeOperation = 'soft-light'`, krycie 0.08. Usuwa „cyfrową płaskość” gradientów i zapobiega bandingowi. Cache na poziomie modułu.

### 2.4 Ramki – `render/frames.ts`

Ramki rysujemy **tylko w pasie przy krawędzi `FRAME_BAND = 32` px**, więc układ (napis, siatka, logo z v1) się nie zmienia. Kolor: tekst z tonu, krycie 0.85; `corners`/`dice` w kolorze akcentu.

| Ramka     | Opis                                                                                                                                                  |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `line`    | prostokąt, linia 3, wcięcie 24                                                                                                                        |
| `double`  | dwie linie (4 i 1.5, odstęp 6), wcięcie 18 – nawiązuje do podwójnych kresek w logo                                                                    |
| `rounded` | linia 3, wcięcie 24, promień 40                                                                                                                       |
| `mat`     | passe-partout: pas 28 px w kolorze `#fffcf5` (ton jasny) / `#1d1b18` (ciemny), wewnętrzne rogi zaokrąglone r = 32 – tło wygląda jak oprawione zdjęcie |
| `corners` | art-decowe narożniki: L o ramionach 72, linia 3, + kwadracik 8 w rogu                                                                                 |
| `dice`    | cztery małe kostki (32 px, r = 7) w rogach, wcięcie 16, pokazujące 1, 2, 5, 6 oczek, lekko obrócone (±8°)                                             |

Test: dla każdej ramki zadeklarowany obrys (`frameBounds(frame)`) mieści się w `FRAME_BAND`, a `HEADER`, `GRID` i `LOGO` zaczynają się co najmniej 8 px dalej od krawędzi.

### 2.5 Generator własnego tła (zakładka Tło → „Własne”)

- **Typ**: przełącznik `Jednolite | Liniowy | Radialny | Mesh`.
- **Kolory**: 2–4 pola `<input type="color">` (jednolite: 1), przyciski „+ kolor” / usuń (min. 2 dla gradientów). Dla mesh: kolor bazy + 3 plamy (pozycje z `seed`, zmieniane przyciskiem „Losuj układ”).
- **Kąt**: suwak 0–345, krok 15 (tylko liniowy).
- **„Losuj”**: `randomFill(rng)` w `src/lib/generator/color.ts`:
  1. Odcień bazowy `h ∈ [0, 360)`, schemat losowy: analogiczny (h, h+30, h+60), dopełniający (h, h+180), triada (h, h+120, h+240).
  2. Ton losowy: jasny → OKLCH `L ∈ [0.86, 0.95]`, `C ∈ [0.04, 0.09]`; ciemny → `L ∈ [0.22, 0.38]`, `C ∈ [0.07, 0.14]`.
  3. Typ losowy (`linear`, `radial`, `mesh`), kąt losowy co 15°.
  4. `oklchToHex` z przycięciem do gamutu sRGB (clamp kanałów).
  5. Gwarancja kontrastu: jeśli któryś kolor ma < 3:1 z tekstem tonu, przesuń jego `L` w stronę bezpieczną (krokami 0.02), aż przejdzie.
  - Losowanie zapisuje nowy `seed`; wzór i ramka się nie zmieniają (losujemy tylko kolory).
- Przejście z presetu do „Własne” kopiuje wypełnienie presetu do `custom`, więc można go od razu modyfikować.

### 2.6 Własna grafika (zakładka Tło → „Zdjęcie”)

- `<input type="file" accept="image/*">` → `createImageBitmap(file)`; od razu przeskalowane (z kadrowaniem „cover”) do offscreen canvasa 1080×1080, żeby duże zdjęcia z telefonu nie zjadały pamięci i nie były skalowane przy każdym renderze. Blob nie musi żyć dłużej (`close()` na bitmapie).
- **Kadr**: siatka 3×3 punktów skupienia (`Focus = 'top-left' | 'top' | … | 'bottom-right'`), domyślnie środek. Radiogroup z 9 przyciskami.
- **Rozmycie**: suwak 0–30 px (pkt 7.4).
- **Przyciemnienie / rozjaśnienie**: suwak −60…+60 (%) → nakładka czarna (ujemne) lub biała (dodatnie) o kryciu `|dim|/100`.
- **Ton „auto”**: średnia luminancja tła po rozmyciu i nakładce, liczona w pasie napisu i w całości (pomniejszenie do 8×8 + `getImageData`; blob z urządzenia jest same-origin, więc canvas nie jest „brudny”). Wynik < 0.4 → ton ciemny. Liczone raz po zmianie tła, nie przy każdym renderze.
- Tekst rysowany wprost na zdjęciu (napis, podpisy w stylu `classic`) dostaje **halo**: `shadowColor` w kolorze przeciwnym do tekstu, krycie 0.5, `shadowBlur 8`. To samo dla `mesh` i gradientów (subtelniej: krycie 0.25).
- Wzór, ziarno i ramka działają też na zdjęciu.
- Usunięcie zdjęcia / zmiana źródła → zwolnienie offscreen canvasa. Zdjęcie **nie** jest zapamiętywane (pkt 10).

---

## 3. Napis

### 3.1 Fonty – `src/lib/generator/fonts.ts`

Siedem stylów, jak przełącznik stylów tekstu w relacjach na FB/IG. W UI pokazujemy **nazwę stylu zapisaną tym fontem**, a nie nazwę kroju.

| id            | Styl (PL / EN)                  | Krój                         | Waga | `scale` | Uwagi                                           |
| ------------- | ------------------------------- | ---------------------------- | ---- | ------- | ----------------------------------------------- |
| `grota`       | Grota / Grota                   | **Fascinate Inline**         | 400  | 0.95    | pasuje do logotypu (pkt 3.2)                    |
| `classic`     | Klasyczny / Classic             | Fraunces Variable            | 600  | 1       | już ładowany globalnie (font z v1)              |
| `modern`      | Nowoczesny / Modern             | Bricolage Grotesque Variable | 800  | 1       |                                                 |
| `strong`      | Mocny / Strong                  | Anton                        | 400  | 1.25    | `uppercase: true` (`toLocaleUpperCase(locale)`) |
| `typewriter`  | Maszyna do pisania / Typewriter | Special Elite                | 400  | 0.95    |                                                 |
| `handwritten` | Odręczny / Handwritten          | Caveat Variable              | 700  | 1.3     | małe x-height → większy rozmiar                 |
| `retro`       | Retro / Retro                   | Lobster                      | 400  | 1.05    | odpowiednik „Fancy” z FB                        |

- `scale` mnoży `HEADING_FONT.max/min` z v1 (60/40), bo kroje mają różną szerokość i wysokość małych liter. Algorytm dopasowania (zmniejszaj, aż zmieści się w 2 liniach) zostaje bez zmian.
- **Polskie znaki sprawdzone 2026-10-06** (cmap plików `latin` + `latin-ext` z Fontsource, znaki `ĄĆĘŁŃÓŚŹŻąćęłńóśźż`) i obejrzane na próbce: wszystkie z tabeli są OK.
- **Odrzucone**: Rye i Ewert (westernowe, podobne do logo – **brak** `ą ę ś ź ż` / większości polskich znaków), Pacifico i Dancing Script (błędny glif `ł`, kreska zamiast przekreślenia).
- Licencje: OFL-1.1 (Special Elite: Apache-2.0) – można hostować u siebie.

**Ładowanie** – tylko na stronie generatora, **nie** w `global.css` (reszta serwisu nie płaci za te fonty):

- Zależności: `@fontsource/fascinate-inline`, `@fontsource-variable/bricolage-grotesque`, `@fontsource/anton`, `@fontsource/special-elite`, `@fontsource-variable/caveat`, `@fontsource/lobster`.
- Pliki importowane jako URL-e (`import url from '@fontsource/anton/files/anton-latin-400-normal.woff2?url'`) – Vite skopiuje je do `dist` z hashem, wszystko z tej samej domeny.
- Rejestracja przez FontFace API pod własną nazwą rodziny (prefiks `Gen`, np. `'Gen Anton'` – bez konfliktu z ewentualnym fontem systemowym), dwa pliki na krój z `unicodeRange` jak w CSS Fontsource:
  ```ts
  const face = new FontFace('Gen Anton', `url(${latinUrl})`, {
    weight: '400',
    unicodeRange: LATIN,
  });
  document.fonts.add(face);
  ```
- `ensureHeadingFont(id): Promise<void>` – ładuje `latin` + `latin-ext` danego kroju (cache obietnic w `Map`), błąd → `classic` jako zapas, bez wywalania renderu. `render()` w `PosterPreview` czeka na font aktualnie wybranego stylu (zamiast `loadFonts()` z v1 dla napisu).
- Miniatury w wyborze fontu potrzebują wszystkich krojów: `preloadHeadingFonts()` wołane przy pierwszym otwarciu zakładki „Napis” (i w `requestIdleCallback` po odblokowaniu). Łącznie ok. 300 KB woff2 – akceptowalne, bo tylko na generatorze.

### 3.2 Font „Grota”

Napis „GROTA” w logo to gruby, dekoracyjny krój z **wewnętrznymi liniami** (inline) i ozdobnym G. Najbliżej z darmowych krojów z polskimi znakami jest **Fascinate Inline** (art déco, inline, podobne G i R). W stylu `grota` domyślnie: efekt `none`, a na ciemnym tle inline nadal czytelny (wewnętrzne linie są „dziurami” w glifie, więc pokazują tło).

### 3.3 Efekty napisu

| Efekt       | Rysowanie                                                                                                                                                                                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `none`      | jak w v1 (+ halo z pkt 2.6 na zdjęciu/gradiencie)                                                                                                                                                                                                            |
| `shadow`    | `shadowColor rgba(0,0,0,.28)` (ton ciemny: `.5`), `shadowBlur 16`, `shadowOffsetY 6`                                                                                                                                                                         |
| `neon`      | tekst `#fffcf5`, rysowany 3× z `shadowColor = accent` i `shadowBlur` 8 / 24 / 48, na koniec raz bez cienia. Na jasnym tle w UI podpowiedź „Neon najlepiej wygląda na ciemnym tle” (bez blokowania)                                                           |
| `highlight` | jak „tekst z tłem” na FB/IG: każda linia na własnym zaokrąglonym prostokącie w kolorze `accent` (padding 0.18em × 0.35em, r = 0.25em, linie na siebie zachodzą), tekst w kolorze kontrastowym do akcentu (wybór z `#1b1916`/`#fffcf5` po wyższym kontraście) |
| `glass`     | cały blok napisu na „szklanej” pigułce (pkt 4.3), padding 24 × 32, promień 32                                                                                                                                                                                |

**Wyrównanie**: `left` (jak w v1) / `center` (x = środek `HEADER`, `textAlign = 'center'`). Efekt `highlight`/`glass` dopasowuje prostokąty do wyrównania.

Treść napisu (pole tekstowe) **zostaje na górze lewej kolumny**, jak w v1 – zakładka „Napis” zawiera tylko styl.

---

## 4. Kafelki

### 4.1 Style

| Styl       | Opis                                                                                                                                                                | Podpis      |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| `classic`  | jak v1: okładka z zaokrągleniem, podpis pod spodem bezpośrednio na tle; opcjonalny cień                                                                             | pod okładką |
| `card`     | „soft UI”: karta w kolorze `#fffcf5` (ton jasny) / `#24211d` (ciemny), padding wokół okładki, cień, podpis w karcie                                                 | w karcie    |
| `glass`    | **Liquid Glass** (pkt 4.3): karta z rozmytego tła, podpis w karcie                                                                                                  | w karcie    |
| `polaroid` | białe zdjęcie z szerszym dołem, podpis fontem `handwritten` (Caveat), lekki obrót ±2.5° (deterministyczny z hasha `item.key` – nie skacze przy przerysowaniu), cień | w ramce     |
| `overlay`  | okładka bez ramki, podpis **na** okładce na dole na gradiencie `transparent → rgba(0,0,0,.72)`, tekst biały. Brak pasa na podpis → większe okładki                  | na okładce  |

**Zaokrąglenie**: `none / s / m / l` = `0 / 0.05 / 0.10 / 0.16 × bok karty`. Domyślnie `m`. Zasada z UI Apple: **promienie koncentryczne** – promień okładki w karcie = `max(0, promień karty − padding)`, żeby rogi były równoległe. W `polaroid` zaokrąglenie max `s` (zdjęcie).

**Cień** (checkbox, domyślnie wł.): dwuwarstwowy, miękki – `rgba(0,0,0,.10)` blur 6 offsetY 2 + `rgba(0,0,0,.16)` blur 28 offsetY 12 (ton ciemny: krycie ×1.8). Rysowany wypełnieniem kształtu karty **przed** właściwą kartą (karta jest nieprzezroczysta albo ma pod sobą rozmyte tło, więc cień nie prześwituje).

**Nazwy gier** (checkbox, domyślnie wł.): wyłączenie usuwa pas na podpis z układu (większe okładki).

Font podpisów: Inter 600 jak w v1 (wyjątek: `polaroid` → Caveat 700, `scale` 1.3). Kolor: na karcie – kontrastowy do karty; na tle (`classic`) – kolor tonu + halo.

### 4.2 Geometria – zmiany w `layout.ts`

`computeLayout(count, frame: TileFrame)` zamiast `computeLayout(count)`:

```ts
export interface TileFrame {
  pad: number; // padding karty jako ułamek boku okładki (classic/overlay: 0, card/glass: 0.06, polaroid: 0.05)
  padBottom: number; // dolny padding pod podpisem (polaroid: 0.05; reszta = pad)
  label: 'below' | 'inside' | 'overlay' | 'none';
  rotationAllowance: number; // zapas na obrót (polaroid: 0.05 boku, reszta 0)
}
export const TILE_FRAMES: Record<TilesDesign['style'], TileFrame>; // + `labels: false` → label: 'none'
```

- Komórka = karta: `cardW = tile·(1 + 2·pad)`, `cardH = tile·(1 + pad) + labelBand + tile·padBottom`, gdzie `labelBand = labelHeight` dla `below`/`inside`, `0` dla `overlay`/`none`. Dla `classic` wychodzi dokładnie geometria z v1.
- Wybór liczby kolumn bez zmian (największa okładka), tylko liczony na wymiarach karty i z `rotationAllowance` dodanym do odstępu.
- Wynik rozszerzony o `card: { w, h }` i `cells[i] = { x, y }` (róg **karty**) + `cover: { dx, dy }` (przesunięcie okładki w karcie).
- `classic` + `labels: true` musi dawać **identyczny** układ jak v1 (test regresji na liczbach z v1: 1→1×1 … 25→7×4).

### 4.3 Liquid Glass na canvasie – `render/glass.ts`

Statyczne przybliżenie stylu Apple Liquid Glass (bez refrakcji/soczewkowania, które wymaga shaderów):

1. **Rozmyte tło**: raz na zmianę tła tworzymy `blurredBackground` (pkt 7.4, promień 28 px) – cache razem z tłem.
2. **Cień** karty (pkt 4.1).
3. `save()` → `roundRect` → `clip()` → `drawImage(blurredBackground)` – w karcie widać tło „przez mleczne szkło”.
4. **Tint**: wypełnienie `rgba(255,255,255,.22)` (ton jasny) / `rgba(255,255,255,.10)` (ciemny) – szkło dostosowuje się do tła.
5. **Połysk** (specular): gradient liniowy z góry na 45% wysokości, `rgba(255,255,255,.28) → 0`.
6. `restore()` → **krawędź**: `roundRect` obrysowany 1.5 px gradientem po przekątnej `rgba(255,255,255,.75) → rgba(255,255,255,.15) → rgba(255,255,255,.45)` – jasny refleks na górnym‑lewym i dolnym‑prawym rogu.
7. Okładka w środku z promieniem koncentrycznym, podpis w kolorze tonu.

Na płaskim, jasnym tle szkło jest prawie niewidoczne – dlatego motywy łączą `glass` z gradientem/mesh lub zdjęciem (pkt 5). Bez blokowania innych połączeń.

---

## 5. Motywy – `src/lib/generator/themes.ts`

Gotowe projekty (`PosterDesign` bez `themeId`), wybór ustawia całość. Każda późniejsza zmiana ustawia `themeId = null` (w UI motyw przestaje być zaznaczony).

| id        | Tło           | Wzór / ziarno / ramka      | Napis                         | Kafelki             |
| --------- | ------------- | -------------------------- | ----------------------------- | ------------------- |
| `grota` ★ | `paper-glow`  | — / ziarno / `double`      | `grota`, `none`, left         | `card`, m, cień     |
| `felt`    | `felt-table`  | — / ziarno / `corners`     | `classic`, `shadow`, center   | `classic`, m, cień  |
| `aurora`  | `aurora`      | — / ziarno / —             | `modern`, `none`, left        | `glass`, l, cień    |
| `pastel`  | `pastel-mesh` | — / ziarno / `rounded`     | `modern`, `none`, center      | `glass`, l, cień    |
| `photos`  | `paper`       | `dots` 0.4 / ziarno / —    | `handwritten`, `none`, center | `polaroid`, s, cień |
| `neon`    | `night`       | `grid` 0.3 / — / —         | `retro`, `neon`, center       | `overlay`, m, cień  |
| `poster`  | `mustard`     | `diagonal` 0.3 / — / `mat` | `strong`, `highlight`, left   | `card`, s, cień     |

★ = `DEFAULT_DESIGN`. Miniatura motywu w panelu = mała wersja grafiki z 4 przykładowymi kafelkami (szare prostokąty zamiast okładek) – ta sama funkcja `renderPoster` w skali (pkt 6.3).

---

## 6. Panel „Wygląd” (UI)

### 6.1 Układ strony

- Desktop (`lg:`): lewa kolumna: napis → wyszukiwarka → wybrane gry → **Wygląd**; prawa: podgląd sticky (bez zmian).
- Mobile: napis → wyszukiwarka → wybrane → **podgląd** → **Wygląd** (żeby przy zmianie wyglądu podgląd był tuż nad kontrolkami). Realizacja: `grid-template-areas` – mobile `"games" "preview" "design"`, `lg:` `"games preview" "design preview"`, podgląd `lg:row-span-2`. **Bez** duplikowania komponentów w DOM.

### 6.2 Struktura panelu – `DesignPanel.vue`

```
Wygląd                                         [Przywróć domyślny]
Motywy:  [▣ Grota] [▣ Sukno] [▣ Aurora] [▣ Pastel] [▣ Zdjęcia] [▣ Neon] [▣ Plakat]   ← poziomy scroll na mobile
( Tło | Napis | Kafelki )                                                            ← zakładki

Tło:      Źródło ( Kolor | Gradient | Własne | Zdjęcie )
          [siatka miniatur presetów]  /  kontrolki generatora  /  plik + kadr + suwaki
          Wzór  ( brak | kropki | kratka | heksy | kostki | paski )   Intensywność [——o——]
          [x] Ziarno
          Ramka ( brak | linia | podwójna | zaokrąglona | passe-partout | narożniki | kostki )
          Kolor napisów ( Auto | Ciemny | Jasny )

Napis:    Font  [Grota] [Klasyczny] [Nowoczesny] [MOCNY] [Maszyna…] [Odręczny] [Retro]   ← każdy swoim krojem
          Efekt ( brak | cień | neon | podświetlenie | szkło )
          Wyrównanie ( do lewej | do środka )

Kafelki:  Styl [▣ Klasyczny] [▣ Karta] [▣ Szkło] [▣ Polaroid] [▣ Nakładka]
          Zaokrąglenie ( brak | małe | średnie | duże )
          [x] Cień   [x] Nazwy gier
```

- **Zakładki**: wzorzec WAI-ARIA Tabs (`role="tablist"`, `tab`, `tabpanel`, strzałki ←/→, Home/End, `aria-selected`, `tabindex` roving). Wydziel `useTabs` (composable) – przyda się później. Ostatnio otwarta zakładka nie jest zapamiętywana.
- **Wybory z miniaturami / segmenty** = natywne `<input type="radio" class="sr-only">` w `<label>` w `<fieldset>` z `<legend>`: klawiatura i czytnik ekranu za darmo. Zaznaczona miniatura: obrys `accent` 2 px + ikona `check`. Cele dotyku ≥ 44 px.
- **Suwaki**: `<input type="range">` z `<label>` i `<output>` z wartością.
- Każda zmiana działa od razu (bez przycisku „Zastosuj”).
- „Przywróć domyślny” → `DEFAULT_DESIGN` (bez potwierdzenia; zdjęcie zostaje zwolnione).

### 6.3 Miniatury

- Jedno źródło prawdy: miniatury rysujemy **tym samym kodem** co grafikę (`drawFill`, `drawPattern`, `drawFrame`, `renderPoster` w skali), a nie osobnym CSS-em – nie trzeba utrzymywać dwóch definicji gradientów.
- `DesignThumb.vue`: `<canvas>` 96×96 (CSS 48–64 px), `aria-hidden="true"` (nazwę daje `<label>`). Render raz przy montowaniu i przy zmianie tonu; miniatury presetów nie zależą od wybranych gier.
- Miniatury motywów i stylów kafelków: 4 kafelki-placeholdery, rysowane przez `renderPoster(ctx, …, { scale })` – wymaga, żeby `renderPoster` przyjmował skalę (`ctx.scale(size / CANVAS, …)`).

### 6.4 Komponenty i stan

| Plik                                                  | Co                                                                                    |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `src/components/vue/generator/DesignPanel.vue`        | motywy + zakładki + „Przywróć domyślny”; `v-model` = `PosterDesign`                   |
| `src/components/vue/generator/BackgroundControls.vue` | zakładka Tło; `v-model` = `BackgroundDesign`, emit `image-change(file \| null)`       |
| `src/components/vue/generator/HeadingControls.vue`    | zakładka Napis; `v-model` = `HeadingDesign`                                           |
| `src/components/vue/generator/TileControls.vue`       | zakładka Kafelki; `v-model` = `TilesDesign`                                           |
| `src/components/vue/generator/OptionGroup.vue`        | generyczna grupa radio (`<script setup generic="T extends string">`), slot na podgląd |
| `src/components/vue/generator/DesignThumb.vue`        | miniatura-canvas                                                                      |
| `src/composables/useTabs.ts`                          | logika zakładek (klawiatura, roving tabindex)                                         |

- Stan w `GeneratorApp.vue`: `const design = ref<PosterDesign>(loadDesign())` + `backgroundImage = shallowRef<OffscreenCanvas | HTMLCanvasElement | null>(null)` (zdjęcie trzymamy poza `design`, bo nie da się go serializować i nie ma sensu robić go głęboko reaktywnym).
- `PosterPreview` dostaje prop **`design`** (nie `style` – `style` to atrybut przelotowy w Vue i trafiłby na element główny zamiast do propsa).
- **[Vue]** `defineModel<BackgroundDesign>()` w kontrolkach: **nie mutuj** zagnieżdżonych pól modelu (`model.value.pattern = 'dots'` zmieniłoby obiekt rodzica „bokiem”, bez `update:modelValue`). Zawsze podmieniaj całość: `model.value = { ...model.value, pattern: 'dots' }`. Pomocnik `patch(partial)` w każdej kontrolce.
- **[Vue]** `OptionGroup` jako komponent generyczny: `defineModel<T>()` + `options: { value: T; label: string }[]` – TypeScript pilnuje, że np. do „Ramki” nie da się przekazać wartości wzoru.
- Ustawienie `themeId = null` przy każdej zmianie: w `DesignPanel` przez `watch` na `background/heading/tiles` z pominięciem zmian wywołanych wyborem motywu (flaga albo porównanie z `THEMES[themeId]`; porównanie jest prostsze i odporne – `themeId` zostaje, jeśli projekt nadal równa się motywowi).

---

## 7. Renderer – zmiany techniczne

### 7.1 Pliki

`render.ts` dzielimy na katalog (publiczne API: `renderPoster`, `loadImage`, `posterFileName`):

| Plik                                                                 | Co                                                                                                        |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `src/lib/generator/render/index.ts`                                  | `renderPoster(ctx, { heading, items, design, assets, scale? })` – kolejność warstw                        |
| `src/lib/generator/render/background.ts`                             | `drawFill`, zdjęcie, cache tła                                                                            |
| `src/lib/generator/render/patterns.ts`                               | wzory + ziarno                                                                                            |
| `src/lib/generator/render/frames.ts`                                 | ramki + `frameBounds`                                                                                     |
| `src/lib/generator/render/heading.ts`                                | napis: font, dopasowanie, efekty                                                                          |
| `src/lib/generator/render/tiles.ts`                                  | style kafelków                                                                                            |
| `src/lib/generator/render/glass.ts`                                  | szkło (kafelki i napis)                                                                                   |
| `src/lib/generator/render/blur.ts`                                   | `blurred(source, radius)`                                                                                 |
| `src/lib/generator/render/text.ts`                                   | `wrapText`, `clampLines` (przeniesione z v1)                                                              |
| `src/lib/generator/color.ts`                                         | `hexToRgb`, `luminance`, `contrast`, `oklchToHex`, `pickTextColor`, `randomFill` – **czyste, testowalne** |
| `src/lib/generator/random.ts`                                        | `mulberry32(seed)` – deterministyczny PRNG                                                                |
| `src/lib/generator/design.ts`, `presets.ts`, `themes.ts`, `fonts.ts` | pkt 1, 2.1, 5, 3.1                                                                                        |

### 7.2 Kolejność warstw

1. tło (wypełnienie / zdjęcie + rozmycie + nakładka) → 2. wzór → 3. ziarno → 4. ramka → 5. napis (z efektem) → 6. kafelki (cień → karta → okładka → podpis) → 7. logo (czarne/białe wg tonu).

### 7.3 Wydajność

- **Cache tła**: warstwy 1–4 rysowane do offscreen canvasa 1080×1080 i trzymane pod kluczem `JSON.stringify(background) + imageVersion`. Zmiana gier/napisu/kafelków nie przerysowuje tła; `blurredBackground` dla szkła w tym samym cache.
- **Throttle**: render przez `requestAnimationFrame` – przeciąganie suwaka nie kolejkuje dziesiątek renderów. Mechanizm `renderId` z v1 zostaje (asynchroniczne fonty i obrazki).
- Cel: < 16 ms na render przy 25 grach i ciepłym cache.

### 7.4 Rozmycie – `blur.ts`

- Jeśli `'filter' in ctx` (Chrome, Firefox): `ctx.filter = \`blur(${radius}px)\``na kopii, z marginesem`2·radius` (żeby brzegi nie ciemniały – rysujemy obraz powiększony o margines i przycinamy).
- W przeciwnym razie (starsze Safari): pomniejszenie dwustopniowe (do ¼, potem do `size / radius`) i powiększenie z `imageSmoothingQuality = 'high'`. Wizualnie bardzo zbliżone przy dużych promieniach (szkło: 28 px).

### 7.5 Logo

- `generatorLogoUrl()` → `generatorLogoUrls()`: `{ dark: …bgp_grota.png, light: …bgp_grota_white.png }` (oba przez `getImage`, 320 px PNG). Prop `logoUrls` w `GeneratorApp` / `PosterPreview`.

---

## 8. i18n (`pl.ts` / `en.ts`, sekcja `generator`)

Nowe klucze (EN analogicznie, typ `Dictionary` wymusi komplet). Etykiety wartości trzymamy jako słowniki po `id`, żeby `OptionGroup` mógł je mapować:

```ts
design: {
  heading: 'Wygląd', reset: 'Przywróć domyślny', themes: 'Motywy',
  tabs: { background: 'Tło', heading: 'Napis', tiles: 'Kafelki' },
  source: { label: 'Źródło', preset: 'Kolor', gradient: 'Gradient', custom: 'Własne', image: 'Zdjęcie' },
  pattern: { label: 'Wzór', intensity: 'Intensywność', none: 'Brak', dots: 'Kropki', grid: 'Kratka', hex: 'Heksy', pips: 'Kostki', diagonal: 'Paski' },
  grain: 'Ziarno',
  frame: { label: 'Ramka', none: 'Brak', line: 'Linia', double: 'Podwójna', rounded: 'Zaokrąglona', mat: 'Passe-partout', corners: 'Narożniki', dice: 'Kostki' },
  tone: { label: 'Kolor napisów', auto: 'Automatyczny', dark: 'Ciemny', light: 'Jasny' },
  custom: { type: 'Typ', solid: 'Jednolite', linear: 'Liniowy', radial: 'Radialny', mesh: 'Mesh', color: (n: number) => `Kolor ${n}`, addColor: 'Dodaj kolor', removeColor: (n: number) => `Usuń kolor ${n}`, angle: 'Kąt', random: 'Losuj', randomLayout: 'Losuj układ' },
  image: { file: 'Zdjęcie z urządzenia', remove: 'Usuń zdjęcie', focus: 'Kadr', blur: 'Rozmycie', dim: 'Przyciemnienie / rozjaśnienie', focusPoints: { /* 9 etykiet: 'lewa góra' … */ } },
  font: 'Font', effect: { label: 'Efekt', none: 'Brak', shadow: 'Cień', neon: 'Neon', highlight: 'Podświetlenie', glass: 'Szkło' },
  neonHint: 'Neon najlepiej wygląda na ciemnym tle.',
  align: { label: 'Wyrównanie', left: 'Do lewej', center: 'Do środka' },
  tileStyle: { label: 'Styl', classic: 'Klasyczny', card: 'Karta', glass: 'Szkło', polaroid: 'Polaroid', overlay: 'Nakładka' },
  radius: { label: 'Zaokrąglenie', none: 'Brak', s: 'Małe', m: 'Średnie', l: 'Duże' },
  shadow: 'Cień', labels: 'Nazwy gier',
},
fonts: { grota: 'Grota', classic: 'Klasyczny', modern: 'Nowoczesny', strong: 'Mocny', typewriter: 'Maszyna do pisania', handwritten: 'Odręczny', retro: 'Retro' },
backgrounds: { paper: 'Papier', sage: 'Szałwia', /* … wszystkie id z pkt 2.1 */ },
themes: { grota: 'Grota', felt: 'Sukno', aurora: 'Aurora', pastel: 'Pastel', photos: 'Zdjęcia', neon: 'Neon', poster: 'Plakat' },
```

---

## 9. Testy

**Unit (`vitest`)**

- `color.ts`: `contrast('#1b1916', '#f6f1e7') ≈ 15.58` (zgodnie z `docs/design.md`); `oklchToHex` dla kilku znanych wartości; `pickTextColor`.
- `presets.ts`: każdy preset spełnia wymóg kontrastu z pkt 2.1; `id` unikalne; każdy ma tłumaczenie w PL i EN.
- `randomFill`: 200 seedów → każdy wynik ma 2–4 kolory w formacie `#rrggbb` i spełnia wymóg ≥ 3:1 z tekstem tonu; ten sam seed → ten sam wynik.
- `layout.ts`: `classic` = liczby z v1 (regresja); dla każdego stylu i 1…25 gier wszystkie karty (z `rotationAllowance`) mieszczą się w `GRID`; `labels: false` daje większe okładki niż `true`.
- `frames.ts`: `frameBounds` ⊂ `FRAME_BAND`, odstęp ≥ 8 px od `HEADER`/`GRID`/`LOGO`.
- `design.ts`: `DEFAULT_DESIGN` i wszystkie motywy przechodzą schemat zod; uszkodzony/stary JSON z localStorage → `DEFAULT_DESIGN`.
- `fonts.ts`: każdy font z rejestru ma tłumaczenie i dwa URL-e (`latin`, `latin-ext`).
- Komponenty: `OptionGroup` – kliknięcie/strzałki zmieniają `v-model`; `DesignPanel` – wybór motywu ustawia projekt, późniejsza zmiana czyści zaznaczenie motywu; `useTabs` – strzałki, Home/End, `aria-selected`.
- Canvasa dalej nie testujemy jednostkowo (jsdom).

**E2E (`playwright`)**

- Rozszerzyć scenariusz generatora: wybór motywu „Aurora” → zmiana fontu na „Mocny” → styl kafelków „Polaroid” → wgranie zdjęcia tła (`setInputFiles` z małym PNG z fixtures) → „Pobierz PNG” nadal działa (`waitForEvent('download')`).
- Sprawdzić, że canvas nie jest „brudny” po wgraniu zdjęcia (pobranie się udaje = `toBlob` nie rzucił).
- a11y (`a11y.spec.ts`): zakładki i grupy radio bez naruszeń axe; dodatkowo przebieg z otwartą każdą zakładką.

Na koniec: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm format`.

---

## 10. Decyzje potwierdzone przez właściciela (2026-10-06)

1. **Zapamiętywanie wyglądu – tak** (zmiana względem v1): `PosterDesign` w `localStorage` (`grota:generator-design:v1`, walidacja zod, błąd → `DEFAULT_DESIGN`). **Bez** zdjęcia tła (po przeładowaniu źródło „Zdjęcie” wraca do tła motywu). Wybór gier i napis nadal nie są zapamiętywane.
2. **Domyślny motyw – „Grota”** (papier z winietą, podwójna ramka, font Fascinate Inline, karty).
3. **Font „Grota” – Fascinate Inline** (właściciel nie ma pliku fontu z logo).
4. **Zestaw 7 fontów** z pkt 3.1 – na razie bez zmian.

## Zmiany przy implementacji (2026-10-06)

- **Bez pola `themeId`**: zaznaczony motyw jest wyliczany (`matchingTheme(design)` – głębokie porównanie z motywami). Po dowolnej zmianie zaznaczenie znika samo, bez flag i `watch`.
- **`tone` → `textColor`** (`'auto' | 'dark' | 'light'` = kolor **napisów**, jak w UI). Ton tła wynika z niego odwrotnie.
- `image` w `BackgroundDesign` zawsze obecne (ustawienia zdjęcia), a nie `| null` – prostszy schemat i UI.
- Ton „auto” dla zdjęcia: `pickTextColor(średni kolor)` (ten sam wzór co dla presetów) zamiast progu luminancji 0.4.
- Akcent dla tła własnego i zdjęcia = kolor tekstu (pewny kontrast); przy wymuszonym kolorze napisów niezgodnym z tonem presetu – też.
- Ramka `dice`: kostki 24 px, wcięcie 6, obrót ±6° (32 px przy wcięciu 16 wychodziło poza `FRAME_BAND`).
- Wzory i ramki wybierane chipami (tekst), bez miniatur; miniatury mają presety, motywy (4 kafelki) i style kafelków (2 kafelki – przy 4 były nieczytelne).
- Zapis wyglądu w `src/lib/generator/storage.ts`, schemat w `zod/mini` (mniejszy bundle niż pełny zod).
- Preset `aurora`: ciemniejsze plamy (`#5b4bff`, `#00806e`, `#c2306a`) – jaśniejsze nie miały 3:1 z białym tekstem.

## Poza zakresem (pomysły na później)

- Układ „bento” – pierwsza gra wyróżniona (kafelek 2×2).
- Inne formaty (relacja 1080×1920, 4:5 1080×1350).
- Wybór koloru napisu/akcentu niezależnie od tła.
- Refrakcja krawędzi szkła (wymagałaby WebGL).
- Zapamiętywanie zdjęcia tła (IndexedDB).
