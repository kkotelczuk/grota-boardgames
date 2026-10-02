# Prompt: strona z kolekcją gier stowarzyszenia „Grota”

> Ten plik jest kompletnym zadaniem dla agenta. Źródłowe wymagania: `spec.md`. Tam, gdzie ten plik jest bardziej szczegółowy – obowiązuje ten plik.

---

## 1. Rola i cel

Jesteś senior front-end engineerem (Astro + Vue 3 + TypeScript) z wyczuciem UX/UI i doświadczeniem w SEO. Zbuduj **statyczną, dwujęzyczną (PL/EN) stronę prezentującą kolekcję gier planszowych** stowarzyszenia „Grota”, gotową do deploymentu na **GitHub Pages przez GitHub Actions**.

Strona jest wyłącznie informacyjna: bez logowania, bez backendu, bez bazy danych. Wszystkie dane są przygotowywane na etapie budowania i zapisywane w repozytorium.

Drugi, równie ważny cel: **właściciel projektu uczy się Vue na poziomie seniora** (do nowej pracy). Kod Vue ma być wzorcowy, w najnowszych standardach, i opatrzony materiałami edukacyjnymi (sekcja 10).

---

## 2. Kontekst organizacji (do treści, SEO lokalnego i GEO)

- **Nazwa:** Białostocka Grupa Planszówkowa „Grota” (krótko: Grota). Forma prawna: stowarzyszenie.
- **Czym się zajmuje:** gry bez prądu – głównie planszówki, karcianki, gry wojenne, imprezowe.
- **Miejsce:** ul. Warszawska 44/2 lok. 4, Białystok. Kodu pocztowego **nie znamy** – nie zmyślaj go, zostaw `TODO` w konfiguracji.
- **Jak to działa:** do Groty przychodzi się zagrać na miejscu – są stoły i ludzie. **Gier się nie wypożycza.** Ta strona pokazuje, w co można u nas zagrać.
- **Dni otwarte i społeczność:** Discord – https://discord.gg/Gkc63kgQa. Godzin otwarcia nie podajemy na stronie, tylko odsyłamy na Discorda.
  - **Ten link do zaproszenia nie jest stały** i może się zmienić. Trzymaj go w jednym miejscu (`src/config/site.ts`).
  - Wszystkie przyciski i linki na stronie kieruj na wewnętrzną ścieżkę `/discord/`, która przekierowuje na aktualny link (statyczna strona z `<meta http-equiv="refresh">` + `<link rel="canonical">` + widoczny link awaryjny). Zmiana zaproszenia = edycja jednej wartości, a udostępnione wcześniej linki do strony dalej działają.
  - W JSON-LD (`sameAs`) i w `llms.txt` używaj tego samego, aktualnego linku z konfiguracji.
- **Logo:** `bgp_grota.png` (czarne na przezroczystym tle) i `bgp_grota_white.png` (białe – do ciemnego tła i dark mode). Oba pliki mają 1871×1770 px. Na ich podstawie wygeneruj favicony, apple-touch-icon, manifest i domyślny obraz OG.

Wszystkie dane organizacji (nazwa, adres, Discord, URL strony, TODO-sy) trzymaj w jednym typowanym pliku, np. `src/config/site.ts`.

---

## 3. Pliki wejściowe

| Plik | Opis |
|---|---|
| `spec.md` | Oryginalne wymagania |
| `spis-gier.csv` | 265 wierszy, kolumny: `Tytuł`, `Język ` (ze spacją!), `BGG`, czwarta kolumna bez nagłówka z komentarzem |
| `.env` | `BGG_API_URL` (`https://boardgamegeek.com/xmlapi2/thing`) i `BGG_API_KEY`. **Nigdy nie commituj, nie loguj i nie wysyłaj tego klucza do przeglądarki.** Dodaj `.env` do `.gitignore` i utwórz `.env.example` |
| `bgp_grota*.png` | Logo |

### Pułapki w CSV, które musisz obsłużyć

- Końce linii CRLF, spacje na końcu tytułów i nagłówków (trzeba je przyciąć), pusta 4. kolumna z komentarzem.
- **Kody języka wydania** (potwierdzone przez właściciela):
  - `PL`, `EN`, `DE` – język wydania;
  - `X(PL)` i `X{PL}` znaczą to samo (różne nawiasy to niedokładność przy spisywaniu): wydanie w języku X z polską instrukcją. Normalizuj oba warianty do jednej postaci;
  - `??` – traktuj jak `EN(PL)`, czyli wydanie angielskie z polską instrukcją.

  Model: `editionLanguage` + `hasPolishRules: boolean`. Mapowanie na etykiety PL/EN zrób w jednym miejscu. W filtrze „język” uwzględnij opcję „z polską instrukcją”.
- **Duplikaty:**
  - `Sabotażysta` – ten sam BGG id występuje dwa razy, czyli są 2 egzemplarze.
  - `Race for the Galaxy` – to samo BGG id w wydaniu PL i EN.

  Model danych: jedna gra (BGG id) może mieć wiele „egzemplarzy”, każdy z własnym tytułem lokalnym i językiem.
- **Typy URL BGG:** `/boardgame/`, `/boardgameexpansion/`, `/boardgameversion/` (1 przypadek: „Grzybobranie w Zielonym Gaju” – spróbuj ustalić grę bazową; jeśli się nie da, przenieś grę do pliku ręcznego).
- **Dodatki często mają URL `/boardgame/...`** (np. „Scythe: The Wind Gambit”, „Race for the Galaxy: Rebel vs Imperium”). Typ (gra bazowa czy dodatek) ustalaj **z odpowiedzi API** (`type="boardgameexpansion"` i linki `boardgameexpansion` z `inbound="true"`), a nie z URL-a.
- **8 gier bez linku do BGG** (planszeo, allegro, facebook, strony wydawców): „Kraina zagadek”, „Mrowisko”, „Kibole: wyjazd na mecz”, „4 małe ule i miód”, „Tappi i poziomkowa przygoda”, „STAR WARS: Guessing game”, „Zgroza xD”, „Grzybobranie: Rajd”. Obsługa: sekcja 5.3.

---

## 4. Stack i standardy

- **Astro** (najnowsza stabilna) – SSG, `output: 'static'`, wbudowany routing i18n, `astro:assets` do obrazów, content collections (Content Layer API + schematy `zod`).
- **Vue 3** (najnowsza stabilna, min. 3.5) przez `@astrojs/vue`. Vue odpowiada za **interaktywne wyspy** (lista z filtrami, ulubione, przełącznik motywu, drawer z filtrami). Wszystko, co statyczne, renderuj komponentami `.astro`.
- **TypeScript strict** wszędzie, także w skryptach danych.
- **Tailwind CSS v4** (`@tailwindcss/vite`) z design tokenami w CSS (`@theme`). Dopuszczalne `<style scoped>` w komponentach Vue tam, gdzie to czytelniejsze.
- **VueUse** tam, gdzie upraszcza kod. Pinia tylko wtedy, gdy uzasadnisz ją w `docs/vue-notes.md`. Pamiętaj, że wyspy Astro to osobne aplikacje Vue, więc stan współdzielony między wyspami (np. licznik ulubionych w headerze i serduszka na kartach) wymaga świadomego wyboru: singleton na poziomie modułu, nanostores albo inne rozwiązanie. Wybierz i opisz, dlaczego.
- **pnpm**, ESLint (flat config + `eslint-plugin-vue` + `typescript-eslint`), Prettier, `vue-tsc` / `astro check`.
- **Testy:**
  - Vitest + `@vue/test-utils`: composables, kluczowe komponenty, parser CSV/URL i normalizacja wyszukiwania.
  - Playwright: smoke test (lista, filtr, wejście w szczegóły, zmiana języka, ulubione) – opcjonalnie, ale mile widziany.
- Projekt nie jest jeszcze repozytorium git. Zrób `git init` i dodaj `.gitignore`. **Nie pushuj i nie twórz zdalnego repo bez pytania.**

---

## 5. Pipeline danych (build-time, lokalnie)

### 5.1 Skrypt `scripts/fetch-bgg.ts` (`pnpm data:fetch`)

1. Parsuje CSV porządną biblioteką (np. `csv-parse`), przycina białe znaki i wyciąga z URL-a BGG id i typ.
2. Pobiera dane z `BGG_API_URL`:
   - nagłówek `Authorization: Bearer ${BGG_API_KEY}`;
   - parametr `stats=1`;
   - **paczki po maks. 20 id**;
   - odstęp kilku sekund między zapytaniami;
   - retry z exponential backoff dla odpowiedzi `202` (kolejka BGG), `429` i `5xx`.
3. **Cache:** surowe odpowiedzi XML zapisuje w `data/bgg-cache/`. Kolejne uruchomienia nie odpytują BGG ponownie, chyba że podasz `--refresh` lub `--id=<id>`.
4. Wyciąga pola:
   - nazwa główna i nazwy alternatywne;
   - rok;
   - min/max graczy, rekomendowana i najlepsza liczba graczy (z ankiety `suggested_numplayers`);
   - czas gry (min/max), minimalny wiek;
   - waga (`averageweight`), ocena (`average`, `bayesaverage`), ranking;
   - kategorie, mechaniki, projektanci, wydawcy;
   - powiązania z dodatkami i grą bazową;
   - obraz;
   - opis – zdekodowane encje HTML, zachowane akapity.
5. **Obrazy:** pobiera okładki do `src/assets/games/<bggId>.<ext>`, żeby `astro:assets` generował AVIF/WebP w kilku rozmiarach z poprawnymi `width`/`height`. Okładek nie hotlinkujemy z CDN BGG.
6. Zapisuje `src/data/games.json`, walidowany schematem `zod`, i wypisuje raport: ile gier, ile dodatków, duplikaty, błędy, brakujące tłumaczenia.

### 5.2 Model danych (orientacyjnie)

- Rekord gry: `id` (BGG id albo `manual-<slug>`), `slug`, `kind: 'base' | 'expansion'`, `baseGameIds`, `expansionIds` (tylko te obecne w kolekcji), `copies: { localTitle, editionLanguage }[]`, pola z BGG oraz `source: 'bgg' | 'manual'`.
- **Slug:** tworzony z nazwy BGG, stabilny i unikalny. Ten sam slug w obu językach ułatwia hreflang.

### 5.3 Gry bez BGG → plik do ręcznego uzupełnienia

- Wygeneruj `data/manual-games.json` (lub `.yaml`, jeśli wygodniej dla człowieka) z wpisami dla 8 gier spoza BGG i każdej gry, której nie udało się pobrać z API.
- Wstępnie wypełnij: tytuł, język, link źródłowy, komentarz z CSV. Pozostałe pola (gracze, czas, wiek, opis PL/EN, obrazek w `data/manual-images/`) zostaw jako puste lub `null` z komentarzem `TODO`.
- **Nie uzupełniaj tych danych sam** – zrobi to człowiek.
- Opisz format w `data/README.md`.
- Build **nie może się wywalić** na niepełnym wpisie: gra wyświetla się z tym, co jest, a skrypt wypisuje ostrzeżenie.

### 5.4 Tłumaczenia (jednorazowo, przez Ciebie – agenta)

- Opisy z BGG są po angielsku. **Ty** tłumaczysz je na polski raz, podczas przygotowania danych, i zapisujesz w `data/translations/pl.json`, kluczowane BGG id.
- Do każdego tłumaczenia zapisz hash źródłowego opisu, żeby skrypt wykrywał nieaktualne tłumaczenia.
- Dodatkowo dla każdej gry napisz **krótkie podsumowanie (1–2 zdania) po PL i EN**. Posłuży do kart i `meta description`.
- Przetłumacz słownik kategorii i mechanik BGG (skończony zbiór) do `data/translations/bgg-terms.pl.json`.
- Tłumaczenie ma być naturalne, nie dosłowne. Nazwy własne i tytuły zostaw bez zmian.
- Nowe gry dodane później bez tłumaczenia: fallback na opis EN z dyskretną adnotacją. Skrypt raportuje braki.

### 5.5 Tytuły

- **PL:** tytułem głównym jest tytuł z CSV (polskie wydanie), a tytuł oryginalny z BGG jest pokazywany pod spodem, jeśli się różni.
- **EN:** tytułem głównym jest nazwa z BGG, a polski tytuł wydania jest wymieniony jako informacja dodatkowa.
- Wyszukiwarka działa po obu tytułach i po nazwach alternatywnych.

### 5.6 CI nie odpytuje BGG

Build w GitHub Actions korzysta wyłącznie z danych zacommitowanych w repo. Dzięki temu deploy jest deterministyczny, a klucz API nie jest potrzebny w CI. Odświeżanie danych to lokalna komenda `pnpm data:fetch`, opisana w README.

---

## 6. Strony, routing, i18n

- Astro i18n:
  - `defaultLocale: 'pl'`, PL bez prefiksu, EN pod `/en/`;
  - zlokalizowane ścieżki: `/gry/<slug>/` ↔ `/en/games/<slug>/` (lub podobne);
  - przełącznik języka prowadzi do odpowiednika bieżącej strony.
- Teksty UI w typowanych słownikach `src/i18n/pl.ts` i `src/i18n/en.ts`, przy czym typ EN wymusza komplet kluczy z PL.
- Wszystkie linki budowane z uwzględnieniem `import.meta.env.BASE_URL`, bo strona może działać pod `/<repo>/` na GitHub Pages.

### Strony

1. **Lista gier** (strona główna)
   - Krótkie hero: czym jest Grota, gdzie jesteśmy, CTA „Dołącz na Discordzie”.
   - Pod spodem lista wszystkich gier.
2. **Szczegóły gry**
   - Okładka, tytuł PL i oryginalny, rok.
   - Liczba graczy (z najlepszą liczbą), czas, wiek, waga z czytelną skalą, ocena i ranking BGG.
   - Kategorie, mechaniki, projektanci.
   - Opis.
   - Języki i liczba egzemplarzy w Grocie.
   - Dodatki dostępne w Grocie (gdy to gra bazowa) albo link do gry bazowej (gdy to dodatek). Jeśli gry bazowej nie ma w kolekcji, wyraźnie to zaznacz.
   - Przycisk ulubionych.
   - „Podobne gry w Grocie” (wspólne kategorie/mechaniki).
   - Link do BGG.
   - CTA: „Chcesz zagrać? Sprawdź dni otwarte na Discordzie”.
   - Breadcrumbs.
3. **Ulubione** – lista gier zapisanych w `localStorage`, renderowana po stronie klienta, z pustym stanem.
4. **O Grocie / Jak do nas trafić** – opis stowarzyszenia, adres, link do mapy (OpenStreetMap / Google Maps), Discord, FAQ (np. „Czy trzeba płacić?”, „Czy mogę przynieść swoją grę?”). Odpowiedzi, których nie znamy, oznacz `TODO` do uzupełnienia przez człowieka – nie zmyślaj faktów.
5. **404** w obu językach.

---

## 7. Lista gier – funkcje

- **Wyszukiwarka:**
  - po tytule PL, oryginalnym i alternatywnych;
  - bez wrażliwości na wielkość liter i polskie znaki („zlodziej” znajduje „złodziej”);
  - z debounce.
- **Filtry:**
  - liczba graczy (konkretna liczba, np. „gramy w 5”);
  - czas gry (przedziały);
  - waga / złożoność;
  - minimalny wiek;
  - język wydania;
  - kategorie i mechaniki;
  - typ (gry bazowe / dodatki);
  - „tylko ulubione”.
- **Sortowanie:** A–Z (zgodnie z polską kolejnością alfabetyczną, `Intl.Collator('pl')`), ocena BGG, ranking, rok, czas gry, waga.
- **Dodatki przy grze bazowej:**
  - domyślnie na liście widać gry bazowe z oznaczeniem „+N dodatków”;
  - dodatki są dostępne po rozwinięciu i na stronie szczegółów;
  - dodatki, których gry bazowej nie ma w kolekcji, pokazuj jako samodzielne pozycje.
- **Ulubione:** `localStorage`, serduszko na karcie i na stronie szczegółów, licznik w headerze. Zero hydration mismatch: odczyt z `localStorage` dopiero po zamontowaniu.
- **Stan w URL:** filtry, sortowanie i fraza są zapisane w query params, więc link da się udostępnić, a „wstecz” działa.
- Licznik wyników, „wyczyść filtry”, aktywne filtry jako usuwalne chipy, przyjazny pusty stan.
- **Mobile:** filtry w bottom sheecie / drawerze (Teleport, focus trap, zamykanie Esc i gestem), sticky pasek z wyszukiwarką i przyciskiem filtrów.
- **Karta gry (minimum):** okładka, tytuł, gracze, czas, waga lub wiek, ocena, badge języka, serduszko, liczba dodatków.
- **SEO a wyspa:** cała lista musi być **wyrenderowana w HTML przy buildzie** (SSR wyspy Vue), żeby była widoczna bez JS dla wyszukiwarek i crawlerów AI. Do wyspy przekazuj odchudzony indeks danych, nie pełne opisy.

---

## 8. Design i UX

- **Charakter:** inspiracja logo – monochromatyczny, lekko vintage’owy znak z szeryfowym krojem i kośćmi. Propozycja kierunku:
  - ciepłe „papierowe” tło, głęboka czerń „tuszu”, jeden kolor akcentu (do decyzji, np. butelkowa zieleń albo bordo);
  - display font o szeryfowym, nieco ozdobnym charakterze w nagłówkach, czytelny sans w treści;
  - oba fonty z pełnym wsparciem polskich znaków, self-hostowane (`@fontsource`).

  Zapisz paletę i tokeny w `docs/design.md`.
- Nowoczesny, czysty UI zgodny z aktualnymi standardami:
  - mobile-first;
  - czytelna hierarchia;
  - dużo przestrzeni;
  - przemyślane stany hover/focus/active/empty;
  - subtelne mikrointerakcje z respektowaniem `prefers-reduced-motion`.
- **Dark mode:** domyślnie wg `prefers-color-scheme`, z przełącznikiem zapamiętywanym w `localStorage`, bez mignięcia przy ładowaniu (inline script w `<head>`). W ciemnym motywie użyj białego logo.
- View Transitions Astro między listą a szczegółami (np. morph okładki), jeśli nie psują stanu wysp. Jeśli psują – opisz kompromis.
- **Dostępność WCAG 2.2 AA:**
  - semantyczny HTML i landmarki;
  - skip link;
  - widoczny focus;
  - kontrast;
  - cele dotykowe ≥ 44 px;
  - poprawne etykiety formularzy (`useId()`);
  - `aria-live` dla licznika wyników;
  - pełna obsługa klawiaturą.
- Wymagany przez warunki BGG XML API **„Powered by BGG”** w stopce oraz link do BGG przy danych.

---

## 9. SEO i GEO

### SEO

- Unikalne `title` i `meta description` na każdej stronie w każdym języku (opis gry: na bazie krótkiego podsumowania).
- `canonical`, `hreflang` (pl, en, x-default), `<html lang>`.
- `@astrojs/sitemap` z i18n, `robots.txt`.
- Open Graph i Twitter Card. Dla gry obraz OG z okładką; domyślny OG z logo.
- **JSON-LD:**
  - `WebSite`;
  - `Organization` z adresem (`PostalAddress`), `sameAs` → Discord;
  - `ItemList` na liście;
  - `Game` + `BreadcrumbList` na stronie gry;
  - `FAQPage` na stronie „O Grocie”.
- Wydajność: Lighthouse ≥ 95 we wszystkich kategoriach (mobile), dobre Core Web Vitals, minimalny JS – hydratuj tylko to, co musi być interaktywne. Dobierz `client:load` / `client:idle` / `client:visible` świadomie i uzasadnij wybór w notatkach.

### GEO (Generative Engine Optimization)

- `llms.txt` (kim jest Grota, gdzie, jak przyjść, linki do kluczowych stron) i `llms-full.txt` (pełna lista gier w markdown: tytuł, gracze, czas, krótki opis).
- Publiczny `games.json` z danymi kolekcji, czyli maszynowo czytelny katalog.
- Treść zrozumiała bez JS.
- Jasne, faktograficzne zdania typu „Białostocka Grupa Planszówkowa Grota to stowarzyszenie z Białegostoku (ul. Warszawska 44/2 lok. 4)…”.
- Spójne dane NAP (nazwa, adres, kontakt) na całej stronie.
- `robots.txt` nie blokuje crawlerów AI.

---

## 10. Aspekt edukacyjny – Vue na poziomie seniora

Właściciel projektu będzie zadawał pytania o kod Vue, więc kod ma być wzorcowy i dobrze udokumentowany.

### Wymagane wzorce (tam, gdzie mają sens – nie na siłę)

- `<script setup lang="ts">`, wyłącznie Composition API.
- `defineProps` z typami TS i destrukturyzacją reaktywnych propsów (3.5), `defineEmits` z typowanymi eventami, `defineModel` (np. w kontrolkach filtrów), `withDefaults` tylko gdy potrzebne.
- Generyczne komponenty (`<script setup generic="T">`), np. lista/select.
- **Composables** z czystym API: `useGameFilters`, `useGameSearch`, `useFavorites`, `useUrlQueryState`, `useMediaQuery` / VueUse. Testowalne bez komponentu.
- `computed` vs `watch` vs `watchEffect` – użyte poprawnie. `shallowRef` / `markRaw` dla dużych, niemutowanych danych.
- `useTemplateRef`, `useId`, `provide`/`inject` z typowanym `InjectionKey`, `Teleport`, `Transition` / `TransitionGroup`, slots (w tym scoped slots).
- **SSR i hydracja w wyspach Astro:** unikanie hydration mismatch (`localStorage`, `window`, `matchMedia` dopiero w `onMounted`), `client:*` directives, przekazywanie propsów z Astro do Vue (serializacja).

### Komentarze w kodzie

- Krótkie komentarze „**dlaczego**” z prefiksem `// [Vue]` w kluczowych miejscach (decyzje reaktywności, hydracja, granice wysp).
- Nie komentuj oczywistości i nie komentuj każdej linii.

### `docs/vue-notes.md` – sekcja na każdy użyty koncept

- co to jest;
- gdzie jest użyte (ścieżka pliku i linia);
- dlaczego tak, a nie inaczej;
- alternatywy i ich trade-offy;
- typowe pułapki i pytania rekrutacyjne na poziomie senior.

### Pozostała dokumentacja

`docs/ARCHITECTURE.md`: przepływ danych CSV → BGG → JSON → content collections → strony/wyspy, granica Astro vs Vue, decyzje i trade-offy.

---

## 11. Deployment

- Workflow `.github/workflows/deploy.yml`:
  - `withastro/action` + `actions/deploy-pages`;
  - trigger: push do `main` + `workflow_dispatch`;
  - kroki: lint, typecheck i testy przed buildem.
- **Repozytorium:** `grota-boardgames`. Własnej domeny jeszcze nie ma – na start deploy jako GitHub project page:
  - `base: '/grota-boardgames/'`;
  - `site: 'https://<github-user>.github.io'`, gdzie `<github-user>` to `TODO` w konfiguracji. Nie zgaduj nazwy konta.
- `site` i `base` czytane z env (`SITE_URL`, `BASE_PATH`) z powyższymi wartościami domyślnymi, żeby przejście na własną domenę było zmianą konfiguracji, a nie kodu.
- README opisuje oba warianty: obecny (project page) i przyszły (własna domena: plik `public/CNAME`, `base: '/'`, ustawienia DNS i GitHub Pages).
- Strona musi działać poprawnie z dowolnym `base`: linki, obrazy, sitemap, canonical, `llms.txt`, przekierowanie `/discord/`.

---

## 12. Kolejność pracy i punkty kontrolne

Pracuj etapami. Po każdym etapie krótko podsumuj, co zrobiłeś i co wymaga decyzji człowieka.

1. Scaffold projektu (Astro + Vue + TS + Tailwind + lint + testy), `git init`, `.gitignore`, `.env.example`.
2. Skrypt danych + pierwsze pobranie z BGG + raport. **Zatrzymaj się i pokaż raport** (błędy, duplikaty, dodatki bez gry bazowej, plik ręczny).
3. Tłumaczenia PL i podsumowania PL/EN.
4. Layout, design tokens, komponenty, strony.
5. Interaktywność (wyspy Vue): wyszukiwanie, filtry, sortowanie, ulubione, stan w URL.
6. SEO / GEO / dostępność / wydajność. Uruchom Lighthouse (lub odpowiednik) i podaj wyniki.
7. CI/CD, README (uruchomienie, odświeżanie danych, uzupełnianie pliku ręcznego, deploy), `docs/*`.

### Zasady

- Nie zmyślaj faktów o stowarzyszeniu – brakujące rzeczy oznacz `TODO`.
- Nie przekraczaj limitów BGG API.
- Nie commituj sekretów.
- Nie pushuj bez pytania.

---

## 13. Definition of Done

- [ ] `pnpm install && pnpm build` przechodzi na czystym repo bez `.env` (dane z repo).
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` są zielone.
- [ ] Wszystkie gry z CSV są widoczne: z BGG albo z pliku ręcznego (nawet niekompletne). Duplikaty są scalone w egzemplarze, dodatki podpięte pod gry bazowe.
- [ ] PL i EN kompletne, przełącznik języka działa na każdej stronie, hreflang poprawny.
- [ ] Wyszukiwanie (bez polskich znaków), filtry, sortowanie, ulubione i stan w URL działają. Ulubione przetrwają odświeżenie strony.
- [ ] Strona wygodna na telefonie (360 px) i desktopie, w trybie jasnym i ciemnym.
- [ ] Lighthouse mobile ≥ 95 we wszystkich kategoriach na liście i na stronie gry.
- [ ] Sitemap, robots, JSON-LD (zweryfikowane walidatorem), OG, `llms.txt`, `llms-full.txt`, `games.json`.
- [ ] Workflow GitHub Pages gotowy, README opisuje deploy.
- [ ] `docs/vue-notes.md`, `docs/ARCHITECTURE.md`, `docs/design.md`, `data/README.md` istnieją i są aktualne.
