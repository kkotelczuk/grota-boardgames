# Design

## Koncept

Wizualnie wychodzimy z logo Groty: monochromatyczny, „vintage’owy” znak z kośćmi do gry. Stąd:

- ciepły papier zamiast czystej bieli, atrament zamiast czerni,
- krój szeryfowy w nagłówkach (Fraunces), neutralny sans w treści (Inter),
- jeden akcent – ciemna zieleń (kolor sukna stołowego), bez dodatkowych kolorów.

Wszystkie tokeny są w `src/styles/global.css` (zmienne CSS + `@theme` Tailwinda 4).

## Paleta

| Token (CSS)        | Tailwind       | Jasny     | Ciemny    |
| ------------------ | -------------- | --------- | --------- |
| `--paper`          | `paper`        | `#f6f1e7` | `#141311` |
| `--surface`        | `surface`      | `#fffcf5` | `#1d1b18` |
| `--surface-sunken` | `sunken`       | `#efe8da` | `#24211d` |
| `--ink`            | `ink`          | `#1b1916` | `#f2ecdf` |
| `--ink-muted`      | `muted`        | `#5a544a` | `#b4ab9b` |
| `--line`           | `line`         | `#ddd3bf` | `#36322b` |
| `--line-strong`    | `line-strong`  | `#8f8470` | `#756d5e` |
| `--accent`         | `accent`       | `#1e5a44` | `#82c7a6` |
| `--accent-hover`   | `accent-hover` | `#164433` | `#a2d8bd` |
| `--accent-ink`     | `accent-ink`   | `#fffcf5` | `#10231b` |
| `--accent-soft`    | `accent-soft`  | `#dbe9e0` | `#1f3a2e` |
| `--heart`          | `heart`        | `#b3261e` | `#ff8a80` |
| `--focus`          | (obrys fokusa) | `#1e5a44` | `#a2d8bd` |

### Kontrast (WCAG, obliczone ze wzoru względnej luminancji)

| Para                     | Jasny | Ciemny |
| ------------------------ | ----- | ------ |
| `ink` / `paper`          | 15,58 | 15,77  |
| `ink` / `surface`        | 17,12 | 14,60  |
| `muted` / `paper`        | 6,66  | 8,17   |
| `muted` / `surface`      | 7,31  | 7,56   |
| `accent` / `paper`       | 7,17  | 9,43   |
| `accent-ink` / `accent`  | 7,88  | 8,35   |
| `accent` / `accent-soft` | 6,44  | 6,27   |
| `heart` / `paper`        | 5,81  | 8,13   |
| `line-strong` / `paper`  | 3,27  | 3,63   |

Wszystkie pary tekstowe przekraczają 4,5:1 (AA), większość 7:1 (AAA). `line-strong` (obramowania pól, chipów i przycisków ghost) ma ≥ 3:1 względem tła w obu motywach – wymóg WCAG 1.4.11 (kontrast elementów nietekstowych), którego axe nie sprawdza automatycznie. `line` (#ddd3bf / #36322b) służy tylko do dekoracyjnych separatorów. Test axe nie zgłasza naruszeń w obu motywach.

## Typografia

- **Fraunces Variable** – nagłówki `h1`–`h3` (`font-display`), `font-optical-sizing: auto`, `text-wrap: balance`.
- **Inter Variable** – treść i interfejs (`font-sans`), `text-wrap: pretty` w akapitach.
- Fonty są **self-hostowane** (`src/assets/fonts/*.woff2`, z `@fontsource-variable`) – brak zewnętrznych zapytań o fonty.
- Odchudzone skryptem `scripts/subset-fonts.py`: oś wagi 400–700, `latin` + Latin Extended-A (polskie znaki). Ok. 85 KB zamiast ok. 200 KB.
- Dwa pliki na krój (`latin`, `latin-ext`) wybierane przez `unicode-range`; `latin` jest preloadowany w `BaseLayout.astro`. `font-display: swap`.
- Stosy zapasowe: `Iowan Old Style`, `Palatino Linotype`, Georgia / `system-ui`.
- **Wyjątek – generator grafik** (`/generator/`): 6 krojów ozdobnych do napisu na grafice (Fascinate Inline, Bricolage Grotesque, Anton, Special Elite, Caveat, Lobster) z `@fontsource*`, ładowanych przez FontFace API tylko na tej stronie (`src/lib/generator/fonts.ts`), nie w `global.css`.

## Odstępy, promienie, cienie

| Token / wartość                            | Zastosowanie                                                                             |
| ------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Skala odstępów Tailwinda (`gap-*`, `py-*`) | układ; kontener `.container-page` (max 80 rem, `padding-inline: clamp(1rem, 4vw, 2rem)`) |
| `--radius-card` = 1 rem                    | karty, ramka okładki                                                                     |
| `999px`                                    | przyciski, chipy (pill)                                                                  |
| `0.375rem`                                 | badge, obrys fokusa                                                                      |
| `--shadow-card`                            | karta w spoczynku (miękki, ciepły cień)                                                  |
| `--shadow-lift`                            | karta po hoverze / `focus-within`                                                        |
| `--ease-out-soft`                          | `cubic-bezier(0.22, 1, 0.36, 1)` – wspólna krzywa animacji                               |

## Komponenty

Klasy współdzielone przez Astro i Vue (`@layer components` w `global.css`):

| Klasa          | Opis                                                                                          |
| -------------- | --------------------------------------------------------------------------------------------- |
| `.btn`         | pill, `min-height: 2.75rem`, `:active` skaluje do 0,97                                        |
| `.btn-primary` | tło `accent`, tekst `accent-ink`, hover `accent-hover`                                        |
| `.btn-ghost`   | ramka `line-strong`, hover: ramka `ink` + tło `surface`                                       |
| `.icon-btn`    | okrągły 2,75 × 2,75 rem, hover `sunken`                                                       |
| `.chip`        | filtr (pill, ≥ 44 px); aktywny (`aria-pressed` lub zaznaczony `input`) = wypełnienie `accent` |
| `.badge`       | mała etykieta (0,75 rem, tło `sunken`)                                                        |

- **Karta gry** (`GameCard.vue`): `surface`, ramka `line`, `shadow-card`; hover unosi o 2 px i zmienia cień; na mobile układ poziomy (okładka 6,5 rem + treść).
- **Bottom sheet** (`FilterDrawer.vue`): filtry na mobile w natywnym `<dialog>` otwieranym przez `showModal()` (fokus i Esc obsługuje przeglądarka), przeciągany w dół, zamykany klikiem w tło; `Teleport` do `<body>`.

## Ruch

- Subtelny: przejścia 150–300 ms z `--ease-out-soft` (hover, `:active`, unoszenie karty, lekkie powiększenie okładki).
- Cross-document **View Transitions** (`@view-transition { navigation: auto }`): okładka „przelatuje” z karty na stronę gry (`view-transition-name: cover-<id>`). Bez routera JS.
- `prefers-reduced-motion: reduce` – globalnie skraca animacje i przejścia do ~0 ms, a View Transitions są włączane tylko w `prefers-reduced-motion: no-preference`.

## Tryb ciemny

- Zmienne w `[data-theme='dark']`; wariant Tailwinda `dark:` to `@custom-variant dark` oparty na atrybucie (a nie na samej media query), więc działa ręczny przełącznik.
- Inline skrypt w `<head>` (`BaseLayout.astro`, synchroniczny, ok. 300 B) ustawia `data-theme` przed pierwszym malowaniem – bez błysku jasnego tła. Kolejność: wartość z `localStorage` (`grota:theme` = `light` | `dark`), inaczej `prefers-color-scheme`. Zmiana ustawienia systemowego jest śledzona.
- Przełącznik: wyspa Vue `ThemeToggle.vue`.
- Logo: czarny wariant w jasnym, **biały** (`bgp_grota_white.png`) w ciemnym motywie; przełączane CSS-em w `Logo.astro`.
- `<meta name="theme-color">` osobno dla obu schematów; `color-scheme` ustawiony w tokenach.
- Strona `/discord/` (przekierowanie) ma własny minimalny CSS z `prefers-color-scheme`.

## Dostępność

- **Fokus:** `:focus-visible` – obrys 3 px w `--focus`, offset 2 px; kolor zmienia się z motywem.
- **Cele dotykowe:** przyciski, chipy i `icon-btn` mają co najmniej 2,75 rem (44 px).
- **Licznik wyników:** `aria-live="polite"` w `GameExplorer.vue` – czytniki zapowiadają zmianę liczby gier po filtrowaniu.
- **Skip link:** „Przejdź do treści” (`.sr-only-focusable`, widoczny po fokusie) → `<main id="main" tabindex="-1">`.
- `lang` na `<html>` (`pl-PL` / `en`), fragmenty EN oznaczone `lang="en"` (np. opis w fallbacku, 404).
- Strona działa bez JS (lista gier renderowana na serwerze).
- Testy: axe-core WCAG 2.2 AA w trybie jasnym i ciemnym (`tests/e2e/a11y.spec.ts`).
