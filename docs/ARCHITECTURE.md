# Architektura

Statyczna strona (`output: 'static'`) zbudowana w Astro 7 z wyspami Vue 3.5 i Tailwind 4. Całe HTML powstaje w czasie buildu; Vue dodaje interaktywność tylko tam, gdzie jest potrzebna. Notatki o samych wzorcach Vue: [vue-notes.md](vue-notes.md). System wizualny: [design.md](design.md).

## Przepływ danych

```
spis-gier.csv
     │
     ▼
pnpm data:fetch  (scripts/fetch-bgg.ts, lokalnie – nigdy w CI)
  ├─ data/bgg-cache/*.xml  ◄──► BGG XML API (tylko brakujące id)
  ├─► src/assets/games/*.webp      okładki (max 1000 px)
  ├─► src/data/games.json          gry z BGG (zod)
  ├─► data/manual-games.yaml       gry spoza BGG (uzupełnia człowiek)
  └─► data/fetch-report.md

data/translations/*.json  (pl.json, summaries.json, bgg-terms.pl.json)
     ▲  pnpm translations export / import

─────────────────────────── build (offline) ───────────────────────────
games.json + manual-games.yaml + translations
     │
     ▼
loader kolekcji `games`  (src/content.config.ts → lib/data/load-games.ts, schemat zod `gameSchema`)
     │
     ▼
lib/data/games.ts  (getAllGames, buildIndex → odchudzone GameIndexItem, astro:assets)
     │
     ├─► strony .astro (HTML, JSON-LD, meta)
     ├─► wyspy Vue (propsy: GameIndexItem[], opcje filtrów)
     └─► endpointy: sitemap-index.xml, robots.txt, llms.txt, llms-full.txt,
         games.json, site.webmanifest
     │
     ▼
dist/  → GitHub Pages
```

## Mapa katalogów

| Ścieżka               | Zawartość                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------ |
| `src/pages/`          | trasy: tylko cienkie pliki wywołujące widoki + endpointy (`*.txt.ts`, `*.json.ts`)                     |
| `src/views/`          | widoki współdzielone przez PL i EN: `HomeView`, `GameView`, `FavoritesView`, `AboutView`               |
| `src/layouts/`        | `BaseLayout.astro` (head, motyw, skip link, header, footer)                                            |
| `src/components/`     | komponenty Astro (statyczne): `Seo`, `SiteHeader`, `SiteFooter`, `Logo`, `Breadcrumbs`, `GameMiniCard` |
| `src/components/vue/` | wyspy i komponenty Vue                                                                                 |
| `src/composables/`    | `useFavorites`, `useGameFilters`, `useGameSearch`, `useUrlQueryState`                                  |
| `src/lib/`            | czysta logika: `schema.ts` (zod), `filters.ts`, `game-index.ts`, `text.ts`, `languages.ts`             |
| `src/lib/data/`       | `load-games.ts` (scalanie źródeł), `games.ts` (dostęp do danych w Astro)                               |
| `src/lib/seo/`        | `jsonld.ts`, `llms.ts`                                                                                 |
| `src/i18n/`           | `pl.ts`, `en.ts`, `index.ts` (trasy, `localizedPath`, `withBase`), `plural.ts`                         |
| `src/config/`         | `site.ts` (dane organizacji), `faq.ts`                                                                 |
| `src/data/games.json` | wygenerowane dane z BGG                                                                                |
| `src/assets/`         | `games/` (okładki), `fonts/` (subsety woff2), `brand/` (logo)                                          |
| `data/`               | cache BGG, `manual-games.yaml`, `manual-images/`, `translations/`, raport                              |
| `scripts/`            | `fetch-bgg.ts`, `translations.ts`, `generate-icons.ts`, `subset-fonts.py`                              |
| `tests/`              | `unit/` (Vitest), `e2e/` (Playwright + axe)                                                            |
| `public/`             | favicony, ikony PWA, `og-default.png`                                                                  |

## Model danych

Model `Game` (`src/lib/schema.ts`) jest wynikiem scalenia trzech źródeł; waliduje go zod jako schemat kolekcji.

| Pole / grupa                                   | Uwagi                                                                       |
| ---------------------------------------------- | --------------------------------------------------------------------------- |
| `id`, `slug`                                   | BGG: `id` = id BGG jako string; ręczne: `manual-<slug>`                     |
| `source`                                       | `bgg` albo `manual`                                                         |
| `kind`                                         | `base` albo `expansion`                                                     |
| `titlePl`, `titleOriginal`                     | PL: tytuł polskiego wydania (jeśli jest egzemplarz PL), EN: nazwa z BGG     |
| gracze, czas, wiek, `weight`, `rating`, `rank` | liczby lub `null` (gry ręczne mogą mieć braki)                              |
| `categories`, `mechanics`                      | `{ id, en, pl }` – nazwa PL ze słownika `bgg-terms.pl.json`, fallback EN    |
| `copies[]`                                     | fizyczne egzemplarze: `localTitle`, `editionLanguage`, `hasPolishRules`     |
| `baseGameIds`, `expansionIds`                  | powiązania w obrębie kolekcji; `externalBaseGames` – baza spoza kolekcji    |
| `description`, `summary`                       | `{ pl, en }`; opis PL tylko jeśli `sourceHash` zgadza się z hashem opisu EN |
| `image`                                        | `games/<plik>` (src/assets/games) lub `manual/<plik>` (data/manual-images)  |
| `missing`                                      | lista brakujących pól gry ręcznej                                           |

Zasady scalania (`load-games.ts`):

- Kilka wierszy CSV z tym samym id BGG to jedna gra z wieloma `copies`.
- Dodatek z bazą w kolekcji jest domyślnie schowany pod kartą gry bazowej; dodatek bez bazy jest pozycją samodzielną. Dodatki ręczne są podpinane przez `baseGameId`; nieistniejące id daje ostrzeżenie.
- Wpisy ręczne są pobłażliwe: braki i niepoprawne wpisy dają **ostrzeżenia w logu buildu**, nie błąd (niepoprawny wpis jest pomijany).
- Kolizja sluga gry ręcznej ze slugiem BGG: slug = pełne `id` z prefiksem `manual-`.

## i18n i routing

Języki: `pl` (domyślny, bez prefiksu) i `en` (prefiks `/en/`). Ścieżki są zdefiniowane raz, w `src/i18n/index.ts`, jako para PL/EN pod wspólną nazwą trasy.

| Trasa (nazwa) | PL            | EN                 | Plik(i)                                                              |
| ------------- | ------------- | ------------------ | -------------------------------------------------------------------- |
| `home`        | `/`           | `/en/`             | `pages/index.astro`, `pages/en/index.astro` → `HomeView`             |
| `game`        | `/gry/:slug/` | `/en/games/:slug/` | `pages/gry/[slug].astro`, `pages/en/games/[slug].astro` → `GameView` |
| `favorites`   | `/ulubione/`  | `/en/favorites/`   | `pages/ulubione.astro`, `pages/en/favorites.astro` → `FavoritesView` |
| `about`       | `/o-grocie/`  | `/en/about/`       | `pages/o-grocie.astro`, `pages/en/about.astro` → `AboutView`         |
| `discord`     | `/discord/`   | `/discord/`        | `pages/discord.astro` (wspólna)                                      |
| 404           | `/404.html`   | to samo            | `pages/404.astro` (dwujęzyczna)                                      |

(Ścieżki powyżej względem `base`, domyślnie `/grota-boardgames/`.)

- `localizedPath({ name, params }, locale)` buduje ścieżkę z `base`; `withBase(path)` dokleja `import.meta.env.BASE_URL` (zawsze z końcowym `/`). Nigdy nie wpisujemy ścieżek ręcznie.
- `trailingSlash: 'always'`; `astro.config.ts` ma `i18n` z `prefixDefaultLocale: false`.
- Każda strona przekazuje do `Seo.astro` obiekt `alternates` (`{ pl, en }`) → canonical + `hreflang` (`pl-PL`, `en`, `x-default` = PL) oraz przełącznik języka w headerze.
- Teksty UI: `src/i18n/pl.ts` (typ `Dictionary`) i `en.ts`; wyspy Vue dostają `locale` jako prop.
- Tytuły gier: PL – wydanie polskie, EN – nazwa BGG; drugi tytuł jako podtytuł, gdy się różni.
- 404 jest dwujęzyczna, bo GitHub Pages serwuje jeden `404.html` dla wszystkich ścieżek.

## Granica Astro / Vue

Zasada: **wszystko, co może być statycznym HTML-em, jest w `.astro`**; Vue tylko dla interakcji i stanu.

Statyczne (`.astro`): layout, nagłówek i stopka, SEO/JSON-LD, breadcrumbs, strona gry (opis, dane, podobne gry, dodatki), „O Grocie”, logo, 404, `/discord/`.

Wyspy Vue:

| Wyspa              | Gdzie                 | Dyrektywa     | Dlaczego                                                                                            |
| ------------------ | --------------------- | ------------- | --------------------------------------------------------------------------------------------------- |
| `GameExplorer`     | strona główna (PL/EN) | `client:load` | główna funkcja strony (wyszukiwarka, filtry, sortowanie); HTML i tak jest wyrenderowany na serwerze |
| `FavoritesList`    | strona ulubionych     | `client:load` | treść zależy od localStorage, bez JS jest pusta                                                     |
| `FavoritesCounter` | header                | `client:idle` | niepotrzebny do pierwszego malowania                                                                |
| `ThemeToggle`      | header                | `client:idle` | j.w.; sam motyw ustawia inline script, przełącznik tylko go zmienia                                 |
| `FavoriteButton`   | strona gry            | `client:idle` | j.w.                                                                                                |

`GameCard`, `FilterPanel`, `FilterDrawer`, `SearchBox` i pozostałe komponenty z `components/vue/` są częścią wyspy `GameExplorer`, nie osobnymi wyspami.

Do wysp trafiają **odchudzone `GameIndexItem`** (bez opisów; tylko pola potrzebne do kart, filtrów i wyszukiwania) jako propsy – są serializowane do HTML, więc rozmiar ma znaczenie (dlatego okładki mają tylko 2 szerokości w `srcset`). Kod wysp jest „client-safe”: nie importuje `astro:*` ani `node:fs`.

## Stan

- **Filtry w URL:** `useUrlQueryState` synchronizuje `FilterState` z query stringiem (`?q=&players=&time=&weight=&age=&lang=&plrules=1&cat=&mech=&kind=&fav=1&sort=`). Parser (`stateFromQuery` w `lib/filters.ts`) ignoruje śmieci; zapisywane są tylko wartości niedomyślne. Zapis przez `history.replaceState` z debounce (250 ms), więc „wstecz” z karty gry wraca na przefiltrowaną listę. Odczyt URL-a dopiero w `onMounted`, żeby uniknąć hydration mismatch (HTML z serwera powstaje bez query).
- **Logika filtrów** jest w czystych funkcjach (`lib/filters.ts`) testowanych bez Vue; composables tylko dodają reaktywność. W obrębie grupy filtrów działa OR, między grupami AND.
- **Ulubione:** `useFavorites` trzyma `shallowRef<Set<string>>` na poziomie modułu. Każda wyspa to osobna aplikacja Vue, ale wszystkie importują ten sam moduł ES (wspólny chunk), więc serce na karcie i licznik w headerze współdzielą stan bez Pinii. Persystencja: `localStorage` (`grota:favorites`), synchronizacja między kartami przez zdarzenie `storage`. Serwer zawsze renderuje „brak ulubionych”; odczyt w `onMounted`.
- **Motyw:** `localStorage` (`grota:theme`) + atrybut `data-theme` (patrz [design.md](design.md)).

## SEO i GEO

| Element                 | Realizacja                                                                                                                             |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Canonical i hreflang    | `Seo.astro` z obiektu `alternates`; strony bez odpowiednika (404) – canonical z URL strony                                             |
| Meta i OG/Twitter       | `Seo.astro`; strona gry: `og:type=article`, obraz OG = okładka 1200 px (JPG); reszta: `public/og-default.png`                          |
| `noindex`               | ulubione (treść z localStorage), 404, `/discord/`                                                                                      |
| Sitemap                 | `@astrojs/sitemap` z i18n; wyklucza `/discord/` i ulubione                                                                             |
| robots.txt              | endpoint `robots.txt.ts`: `Allow: /` + adres sitemapy; crawlery AI nie są blokowane                                                    |
| llms.txt, llms-full.txt | endpointy z `lib/seo/llms.ts`: opis organizacji (NAP z `site.ts`), linki, FAQ / pełna lista gier                                       |
| games.json              | maszynowo czytelny katalog (bez pełnych opisów), absolutne URL-e PL i EN                                                               |
| `/discord/`             | stały adres; `meta refresh` + canonical na zaproszenie + widoczny link (statyczny hosting nie robi 301); zaproszenie tylko w `site.ts` |

JSON-LD (`lib/seo/jsonld.ts`, wstrzykiwany jako `@graph`):

| Strona   | Typy                                                                                      |
| -------- | ----------------------------------------------------------------------------------------- |
| Główna   | `Organization` + `NGO`, `WebSite`, `ItemList` (wszystkie gry)                             |
| Gra      | `Game` (m.in. liczba graczy jako `QuantitativeValue`, autorzy, wydawca), `BreadcrumbList` |
| O Grocie | `Organization`, `FAQPage` (tylko pytania z odpowiedzią), `BreadcrumbList`                 |

Pytania FAQ z `answer: null` nie są publikowane ani w treści, ani w JSON-LD ani w llms.txt.

## Wydajność

- **Fonty:** subsety woff2 (latin + Latin Extended-A, oś 400–700), self-hosted, `font-display: swap`, preload plików `latin`; `latin-ext` ładowany przez `unicode-range` tylko przy polskich znakach.
- **Obrazy:** `astro:assets` (`Picture`/`getImage`); na kartach WebP w 2 szerokościach (240 i 480 px) w `srcset`; strona gry ma większe warianty i obraz OG.
- **Motyw:** jedyny blokujący skrypt to inline (ok. 300 B) – bez błysku jasnego motywu.
- **Przejścia stron:** natywne cross-document View Transitions (`@view-transition { navigation: auto }` w CSS, tylko przy `prefers-reduced-motion: no-preference`); okładka ma wspólną `view-transition-name: cover-<id>` na karcie i stronie gry. To zwykła nawigacja MPA bez routera JS, więc wyspy Vue nie są dotknięte.
- **Hydratacja:** `client:load` tylko tam, gdzie konieczne; reszta `client:idle`.
- **Długa lista:** `content-visibility: auto` na kartach (`.card-slot`) – przeglądarka pomija layout/malowanie kart poza ekranem (główny koszt TBT przy ~10 tys. węzłów DOM). Leniwa hydracja kart (Vue 3.5 `hydrateOnVisible`) była testowana i pogorszyła TBT – opis w [vue-notes §23](vue-notes.md).
- **Stopniowe renderowanie listy** (`useProgressiveLimit`): serwer renderuje i klient hydratuje tylko pierwsze 24 karty (`INITIAL_CARDS`), resztę wyspa dokłada porcjami po 12 w `requestIdleCallback` (Safari: `setTimeout`). HTML strony głównej 1,76 MB → 0,65 MB, najdłuższy task hydracji ~670 → ~270 ms (Pixel 7, CPU 4×). Bez JS pozostałe gry są linkami w `<noscript>` (`HomeView.astro`, ta sama kolejność dzięki `defaultResults`); pełna lista jest też w JSON-LD `ItemList` i sitemapie. Przy „wstecz”/odświeżeniu (bez bfcache) renderujemy całą listę od razu i przewijamy na pozycję zapisaną przy `pagehide` (sessionStorage) – przeglądarka przywraca przewinięcie przed hydracją i ucięłaby je do wysokości pierwszych kart.
- Wyniki Lighthouse: patrz [README](../README.md#jakość).

## Testy

| Rodzaj      | Narzędzie                                   | Zakres                                                                                    |
| ----------- | ------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Jednostkowe | Vitest (+ jsdom, Vue Test Utils)            | filtry, parsowanie URL, ulubione, wyszukiwanie, CSV, XML BGG, scalanie danych, komponenty |
| E2E         | Playwright (`pnpm build && pnpm preview`)   | smoke (`smoke.spec.ts`)                                                                   |
| Dostępność  | `@axe-core/playwright`                      | WCAG 2.2 AA, tryb jasny i ciemny: główna, EN, strona gry, „O Grocie”, ulubione, 404       |
| Statyczne   | ESLint, Prettier, `astro check` + `vue-tsc` | w CI (job `check`), poza e2e                                                              |

CI uruchamia lint, `prettier --check`, typecheck i testy jednostkowe; e2e uruchamiane lokalnie.

## Decyzje i kompromisy

| Decyzja                                                    | Powód                                                  | Kompromis                                                                                                        |
| ---------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Dane z BGG commitowane do repo, CI nie odpytuje BGG        | powtarzalny build bez sekretów i limitów API           | odświeżenie wymaga ręcznego `pnpm data:fetch` i commita                                                          |
| Gry spoza BGG w `manual-games.yaml`, scalane przy buildzie | człowiek edytuje wygodny plik; skrypt go nie nadpisuje | niepełne dane dają ostrzeżenia, a nie błąd                                                                       |
| Tłumaczenia kluczowane id gry z `sourceHash`               | wykrywanie nieaktualnych tłumaczeń po zmianie opisu EN | nieaktualny opis PL nie jest pokazywany – wraca opis EN                                                          |
| Content Layer z inline loaderem + zod                      | jedna walidowana kolekcja z wielu źródeł               | brak plików treści per gra                                                                                       |
| Jedna kolekcja i widoki wspólne dla PL/EN                  | brak duplikacji logiki; trasy w jednym miejscu         | pliki w `pages/` są cienkimi wrapperami                                                                          |
| Odchudzony `GameIndexItem` do wysp                         | mały HTML (propsy są serializowane ×N gier)            | opisy tylko na stronie gry                                                                                       |
| Wyspy komunikują się przez singleton modułu                | prosty współdzielony stan bez Pinii                    | działa, bo wszystkie wyspy są w jednym języku/frameworku                                                         |
| Brak routera JS, View Transitions z CSS                    | zero JS na nawigację, wyspy nietknięte                 | efekt tylko w przeglądarkach z obsługą cross-document VT                                                         |
| 404 dwujęzyczna                                            | GitHub Pages ma jeden `404.html`                       | brak lokalizacji na podstawie ścieżki                                                                            |
| `site`/`base` z env (`SITE_URL`, `BASE_PATH`)              | przejście na własną domenę = zmiana konfiguracji       | —                                                                                                                |
| `robots.txt` i `site.webmanifest` jako endpointy           | adresy zależą od `site` i `base`                       | robots.txt na project page poza korzeniem domeny nie działa dla crawlerów – skuteczny dopiero na własnej domenie |
| `/discord/` jako meta refresh                              | statyczny hosting nie ma 301                           | krótki mignięcie strony pośredniej, dlatego widoczny link                                                        |
