# Grota – lista gier planszowych

Statyczna strona (Astro + Vue + Tailwind) z kolekcją gier planszowych Białostockiej Grupy Planszówkowej „Grota” (stowarzyszenie, Białystok). Wyszukiwarka i filtry, strony gier, ulubione (localStorage), wersje PL i EN. Gier nie wypożyczamy – gra się na miejscu.

Adres: https://grota.bialystok.pl/ (GitHub Pages z własną domeną, patrz [Deploy](#deploy)).

## Wymagania i start

- Node ≥ 22.12
- pnpm przez corepack: `corepack enable pnpm`

```bash
pnpm install
pnpm dev       # serwer deweloperski
pnpm build     # statyczny build do dist/
pnpm preview   # podgląd dist/ (http://localhost:4321/)
```

## Skrypty

| Skrypt              | Działanie                                                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`          | `astro dev`                                                                                                                     |
| `pnpm build`        | `astro build` → `dist/`                                                                                                         |
| `pnpm preview`      | `astro preview`                                                                                                                 |
| `pnpm astro`        | bezpośrednio CLI Astro                                                                                                          |
| `pnpm data:fetch`   | pobranie danych z BGG (lokalnie, wymaga `.env`)                                                                                 |
| `pnpm translations` | pomocnik tłumaczeń: `export <dir>`, `import <dir>`, `terms <dir>`                                                               |
| `pnpm lint`         | ESLint                                                                                                                          |
| `pnpm format`       | `prettier --write .`                                                                                                            |
| `pnpm typecheck`    | `astro check` + `vue-tsc --noEmit`                                                                                              |
| `pnpm test`         | testy jednostkowe (Vitest)                                                                                                      |
| `pnpm test:watch`   | Vitest w trybie watch                                                                                                           |
| `pnpm test:e2e`     | Playwright (smoke + axe); sam robi `pnpm build && pnpm preview`. Wcześniej jednorazowo: `pnpm exec playwright install chromium` |

## Dane

Pełny opis formatów i pól: [data/README.md](data/README.md). Raport ostatniego pobrania: `data/fetch-report.md`.

**Build w CI nigdy nie odpytuje BGG** – korzysta wyłącznie z danych commitowanych do repo (`src/data/games.json`, `src/assets/games/`, `data/`).

### Odświeżanie danych z BGG

1. `cp .env.example .env` i uzupełnij `BGG_API_KEY` (`BGG_API_URL` ma domyślną wartość).
2. `pnpm data:fetch`

| Flaga          | Działanie                                            |
| -------------- | ---------------------------------------------------- |
| _(brak)_       | pobiera tylko id, których nie ma w `data/bgg-cache/` |
| `--refresh`    | pobiera wszystko od nowa                             |
| `--id=123,456` | odświeża wskazane id BGG                             |
| `--offline`    | nie łączy się z BGG, przebudowuje JSON z cache       |

### Dodanie gry

1. Dopisz wiersz do `spis-gier.csv` (`Tytuł,Język,URL BGG`).
2. `pnpm data:fetch`.
3. Sprawdź `data/fetch-report.md` – sekcja „Tłumaczenia” pokaże braki opisu PL i podsumowania.
4. Przetłumacz (poniżej), `pnpm build`.

Gry bez strony na BGG trafiają do `data/manual-games.yaml` (skrypt dopisuje brakujące wpisy, nie nadpisuje Twoich zmian). Pola i zasady: [data/README.md](data/README.md#manual-gamesyaml--gry-spoza-bgg).

### Tłumaczenia

```bash
pnpm translations export tmp/tlumaczenia   # paczki z brakującymi/nieaktualnymi pozycjami
# ... tłumaczenie paczek chunk-N.json → out-N.json
pnpm translations import tmp/tlumaczenia   # scala out-*.json do data/translations/
```

`pnpm translations terms <dir>` eksportuje terminy BGG (kategorie, mechaniki) bez polskiej nazwy. Tłumaczenia są kluczowane id gry i mają `sourceHash` opisu EN – po zmianie opisu na BGG tłumaczenie jest uznane za nieaktualne i strona pokazuje opis EN.

## Gdzie co edytować

| Co                               | Gdzie                                                             |
| -------------------------------- | ----------------------------------------------------------------- |
| Zaproszenie na Discorda          | `src/config/site.ts` → `discordInvite` (jedyne miejsce)           |
| Adres, kod pocztowy              | `src/config/site.ts` → `address`                                  |
| FAQ („O Grocie”)                 | `src/config/faq.ts` (`answer: null` = TODO, nie jest publikowane) |
| Teksty interfejsu                | `src/i18n/pl.ts`, `src/i18n/en.ts`                                |
| Kolory, fonty, promienie, cienie | `src/styles/global.css` (opis: [docs/design.md](docs/design.md))  |
| Zmiana ścieżek URL               | `src/i18n/index.ts` (`routes`)                                    |

Wszystkie przyciski „Discord” prowadzą do stałego adresu `/discord/`, który przekierowuje na aktualne zaproszenie – zmiana linku to edycja jednej wartości.

## Deploy

Wariant: **GitHub Pages z własną domeną `grota.bialystok.pl`** przez `.github/workflows/deploy.yml`. Push na `main` uruchamia kolejno:

1. `check` – `pnpm lint`, `prettier --check`, `pnpm typecheck`, `pnpm test`,
2. `build` – `withastro/action`,
3. `deploy` – `actions/deploy-pages`.

**Jednorazowo:** Settings → Pages → Source: **GitHub Actions**.

Domyślne wartości (z `astro.config.ts`): `SITE_URL=https://grota.bialystok.pl`, `BASE_PATH=/`. Można je nadpisać w repo: Settings → Secrets and variables → Actions → **Variables** (`SITE_URL`, `BASE_PATH`). Puste = domyślne.

### Domena

- `public/CNAME` zawiera `grota.bialystok.pl` (przy deployu przez Actions GitHub i tak bierze domenę z ustawień Pages – plik jest dokumentacją i zabezpieczeniem).
- DNS (OVH, strefa `grota.bialystok.pl`):
  - apex: `A` 185.199.108.153 / 185.199.109.153 / 185.199.110.153 / 185.199.111.153 oraz `AAAA` 2606:50c0:8000::153 / 8001::153 / 8002::153 / 8003::153,
  - `www`: `CNAME` → `kkotelczuk.github.io.` (GitHub przekierowuje `www` na apex),
  - `_github-pages-challenge-kkotelczuk`: `TXT` z wartością z GitHub → Settings → Pages → Verified domains (ochrona przed przejęciem domeny).
- Settings → Pages: Custom domain `grota.bialystok.pl`, po wystawieniu certyfikatu zaznacz **Enforce HTTPS**.
- Stary adres `kkotelczuk.github.io/grota-boardgames/` GitHub przekierowuje (301) na domenę.

## Jakość

```bash
pnpm lint && pnpm typecheck && pnpm test
pnpm exec playwright install chromium   # raz
pnpm test:e2e
```

- Lighthouse (mobile, produkcja na GitHub Pages): strona główna – wydajność 93–99 (mediana 96, rozrzut zależy od sieci CDN); strona gry – 100. Lokalnie: „O Grocie” 100, ulubione 98 (SEO 66, bo strona jest celowo `noindex`). Dostępność, Best Practices i SEO: 100.
- Testy e2e zawierają axe-core (WCAG 2.2 AA) w trybie jasnym i ciemnym dla strony głównej, EN, gry, „O Grocie”, ulubionych i 404.

## TODO dla człowieka

- [ ] Odpowiedzi FAQ w `src/config/faq.ts` (opłaty, własna gra, znajomość zasad, członkostwo).
- [ ] Uzupełnić 8 gier ręcznych w `data/manual-games.yaml` (braki wypisuje build jako ostrzeżenia).
- [ ] Po wdrożeniu sprawdzić JSON-LD: https://validator.schema.org i Google Rich Results Test.

## Dokumentacja

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) – architektura, przepływ danych, decyzje
- [docs/vue-notes.md](docs/vue-notes.md) – notatki o wzorcach Vue użytych w projekcie
- [docs/design.md](docs/design.md) – system wizualny
- [data/README.md](data/README.md) – formaty danych
