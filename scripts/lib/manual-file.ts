import { parse } from 'yaml';
import { slugify } from '../../src/lib/text.ts';
import type { ManualCandidate } from './build-games.ts';

export const MANUAL_HEADER = `# Gry spoza BGG (albo takie, których nie udało się pobrać z API).
# Plik generuje \`pnpm data:fetch\` – DOPISUJE tylko brakujące wpisy, Twoich zmian nie nadpisuje.
# Uzupełnij pola oznaczone TODO. Puste pola (null) są OK – gra i tak się wyświetli.
# Format opisany w data/README.md.

games:
`;

const yamlString = (value: string) => JSON.stringify(value);

/** Szablon nowego wpisu: dane z CSV wypełnione, reszta `null` z komentarzem TODO. */
export function manualEntryYaml(id: string, { row, reason }: ManualCandidate): string {
  return `
  - id: ${id}
    # Powód: ${reason} (CSV, wiersz ${row.line})
    title: ${yamlString(row.localTitle)}
    originalTitle: null # TODO (opcjonalnie): tytuł oryginalny, jeśli inny
    kind: base # base | expansion
    baseGameId: null # dla dodatku: id gry bazowej z kolekcji (np. "28143")
    copies:
      - localTitle: ${yamlString(row.localTitle)}
        editionLanguage: ${row.editionLanguage}
        hasPolishRules: ${row.hasPolishRules}
    sourceUrl: ${yamlString(row.url)}
    csvComment: ${row.comment ? yamlString(row.comment) : 'null'}
    year: null # TODO
    minPlayers: null # TODO
    maxPlayers: null # TODO
    bestPlayers: [] # TODO (opcjonalnie), np. [3, 4]
    minPlayTime: null # TODO: minuty
    maxPlayTime: null # TODO: minuty
    minAge: null # TODO
    weight: null # TODO (opcjonalnie): złożoność 1–5
    categories: [] # TODO (opcjonalnie): id kategorii BGG, np. [1002] – lista w data/translations/bgg-terms.pl.json
    mechanics: [] # TODO (opcjonalnie): id mechanik BGG
    designers: [] # TODO (opcjonalnie)
    image: null # TODO: nazwa pliku w data/manual-images/, np. "${id}.jpg"
    summary:
      pl: null # TODO: 1–2 zdania
      en: null # TODO: 1–2 zdania
    description:
      pl: null # TODO
      en: null # TODO
`;
}

/** Id wpisów już obecnych w pliku (jeśli istnieje). */
export function existingManualKeys(content: string | null): {
  ids: Set<string>;
  sourceUrls: Set<string>;
} {
  const doc = content
    ? (parse(content) as { games?: { id?: string; sourceUrl?: string }[] } | null)
    : null;
  const games = doc?.games ?? [];
  return {
    ids: new Set(games.flatMap((g) => (g.id ? [g.id] : []))),
    sourceUrls: new Set(games.flatMap((g) => (g.sourceUrl ? [g.sourceUrl] : []))),
  };
}

/** Dopisuje brakujące wpisy do treści pliku. Zwraca nową treść i listę dodanych id. */
export function mergeManualFile(content: string | null, candidates: ManualCandidate[]) {
  const { ids, sourceUrls } = existingManualKeys(content);
  let out = content ?? MANUAL_HEADER;
  const added: string[] = [];

  for (const candidate of candidates) {
    if (sourceUrls.has(candidate.row.url)) continue;
    let id = `manual-${slugify(candidate.row.localTitle) || candidate.row.line}`;
    if (ids.has(id)) id = `${id}-${candidate.row.line}`;
    ids.add(id);
    sourceUrls.add(candidate.row.url);
    out += manualEntryYaml(id, candidate);
    added.push(id);
  }
  return { content: out, added };
}
