# Dane kolekcji

Wszystkie dane są przygotowywane **lokalnie** i commitowane do repo. Build w CI nie odpytuje BGG.

```
spis-gier.csv ──► pnpm data:fetch ──► data/bgg-cache/*.xml      (surowe odpowiedzi BGG, cache)
                                  ├─► src/assets/games/*.webp   (okładki, max 1000 px)
                                  ├─► src/data/games.json       (gry z BGG, walidowane zod)
                                  ├─► data/manual-games.yaml    (gry spoza BGG – uzupełnia człowiek)
                                  └─► data/fetch-report.md      (raport ostatniego uruchomienia)

data/translations/*.json  ──► scalane przy buildzie (content collection)
data/manual-games.yaml    ──► scalane przy buildzie
```

## `pnpm data:fetch`

Wymaga `.env` z `BGG_API_URL` i `BGG_API_KEY` (wzór: `.env.example`).

| Flaga          | Działanie                                            |
| -------------- | ---------------------------------------------------- |
| _(brak)_       | pobiera tylko id, których nie ma w `data/bgg-cache/` |
| `--refresh`    | pobiera wszystko od nowa (XML i okładki)             |
| `--id=123,456` | odświeża wskazane id BGG                             |
| `--offline`    | nie łączy się z BGG – przebudowuje JSON z cache      |

Limity BGG: paczki po maks. 20 id, 5 s przerwy między zapytaniami, ponawianie z exponential backoff dla 202/429/5xx.

### Dodanie nowej gry

1. Dopisz wiersz do `spis-gier.csv` (`Tytuł,Język,URL BGG`).
2. `pnpm data:fetch`.
3. Sprawdź `data/fetch-report.md` – sekcja „Tłumaczenia” pokaże brak opisu PL i podsumowania. Do czasu uzupełnienia strona wyświetla opis EN z adnotacją.

### Kody języka w CSV

| W CSV              | Znaczenie                                                   |
| ------------------ | ----------------------------------------------------------- |
| `PL`, `EN`, `DE`   | język wydania                                               |
| `EN(PL)`, `EN{PL}` | wydanie EN z polską instrukcją (oba nawiasy znaczą to samo) |
| `??`               | traktowane jak `EN(PL)`                                     |

Mapowanie i etykiety: `src/lib/languages.ts`.

### Wersje BGG (`/boardgameversion/…`)

API nie pozwala ustalić gry na podstawie id wersji, więc mapowanie jest ręczne w `data/bgg-overrides.json` (`versions`). Wersja bez wpisu trafia do pliku ręcznego.

## `manual-games.yaml` – gry spoza BGG

Skrypt **dopisuje** brakujące wpisy (rozpoznaje je po `sourceUrl`) i nigdy nie nadpisuje Twoich zmian. Puste pola (`null`, `[]`) są w porządku: gra wyświetli się z tym, co jest, a build wypisze ostrzeżenie.

| Pole                                                                       | Typ                   | Opis                                                                   |
| -------------------------------------------------------------------------- | --------------------- | ---------------------------------------------------------------------- |
| `id`                                                                       | string                | `manual-<slug>`, nie zmieniaj (to też slug URL-a)                      |
| `title`                                                                    | string                | tytuł polskiego wydania                                                |
| `originalTitle`                                                            | string \| null        | tytuł oryginalny, jeśli inny                                           |
| `kind`                                                                     | `base` \| `expansion` |                                                                        |
| `baseGameId`                                                               | string \| null        | dla dodatku: `id` gry bazowej z kolekcji (np. `"28143"`)               |
| `copies`                                                                   | lista                 | egzemplarze: `localTitle`, `editionLanguage`, `hasPolishRules`         |
| `sourceUrl`                                                                | string                | link z CSV                                                             |
| `csvComment`                                                               | string \| null        | komentarz z CSV (nie jest publikowany)                                 |
| `year`, `minPlayers`, `maxPlayers`, `minPlayTime`, `maxPlayTime`, `minAge` | number \| null        |                                                                        |
| `bestPlayers`                                                              | number[]              | np. `[3, 4]`                                                           |
| `weight`                                                                   | number \| null        | złożoność 1–5                                                          |
| `categories`, `mechanics`                                                  | number[]              | id terminów BGG (słownik: `translations/bgg-terms.pl.json`)            |
| `designers`                                                                | string[]              |                                                                        |
| `image`                                                                    | string \| null        | nazwa pliku w `data/manual-images/` (jpg/png/webp, najlepiej ≥ 600 px) |
| `summary.pl`, `summary.en`                                                 | string \| null        | 1–2 zdania – karta i `meta description`                                |
| `description.pl`, `description.en`                                         | string \| null        | akapity rozdzielone pustą linią                                        |

## Tłumaczenia (`data/translations/`)

| Plik                | Zawartość                                                                          |
| ------------------- | ---------------------------------------------------------------------------------- |
| `pl.json`           | `{ "<id>": { "sourceHash": "…", "description": "…" } }` – polskie opisy gier z BGG |
| `summaries.json`    | `{ "<id>": { "sourceHash": "…", "pl": "…", "en": "…" } }` – krótkie podsumowania   |
| `bgg-terms.pl.json` | `{ "<id terminu>": "polska nazwa" }` – kategorie i mechaniki BGG                   |

`sourceHash` to hash opisu EN (`descriptionHash` w `games.json`). Gdy BGG zmieni opis, raport pokaże tłumaczenie jako nieaktualne.
