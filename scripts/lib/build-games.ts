import { createHash } from 'node:crypto';
import { slugify } from '../../src/lib/text.ts';
import type { BggGame, Copy } from '../../src/lib/schema.ts';
import type { BggItem } from './bgg-xml.ts';
import type { CsvRow } from './csv.ts';

export interface Overrides {
  versions: Record<string, { gameId: number; note?: string }>;
}

/** Wiersz CSV, którego nie da się powiązać z BGG – trafia do pliku ręcznego. */
export interface ManualCandidate {
  row: CsvRow;
  reason: string;
}

export interface BuildResult {
  games: BggGame[];
  manual: ManualCandidate[];
  /** Id gier BGG wymaganych przez CSV (po rozwiązaniu wersji). */
  duplicates: { bggId: number; titles: string[] }[];
  warnings: string[];
}

export const hashText = (text: string) =>
  createHash('sha256').update(text).digest('hex').slice(0, 12);

/** Rozwiązuje wiersz CSV do id gry BGG (wersje → gra przez overrides). */
export function resolveGameId(row: CsvRow, overrides: Overrides): number | null {
  if (!row.bgg) return null;
  if (row.bgg.urlType === 'boardgameversion')
    return overrides.versions[String(row.bgg.id)]?.gameId ?? null;
  return row.bgg.id;
}

const toCopy = (row: CsvRow): Copy => ({
  localTitle: row.localTitle,
  editionLanguage: row.editionLanguage,
  hasPolishRules: row.hasPolishRules,
});

/**
 * Czysta funkcja: CSV + sparsowane pozycje BGG → rekordy gier.
 * Typ (baza/dodatek) pochodzi z API, nie z URL-a. Powiązania ograniczone do kolekcji.
 */
export function buildGames(
  rows: CsvRow[],
  items: Map<number, BggItem>,
  overrides: Overrides,
): BuildResult {
  const manual: ManualCandidate[] = [];
  const warnings: string[] = [];
  const rowsById = new Map<number, CsvRow[]>();

  for (const row of rows) {
    if (!row.bgg) {
      manual.push({ row, reason: 'brak linku do BGG' });
      continue;
    }
    const id = resolveGameId(row, overrides);
    if (id === null) {
      manual.push({ row, reason: `nie udało się ustalić gry dla wersji BGG ${row.bgg.id}` });
      continue;
    }
    if (!items.has(id)) {
      manual.push({ row, reason: `BGG nie zwróciło danych dla id ${id}` });
      continue;
    }
    rowsById.set(id, [...(rowsById.get(id) ?? []), row]);
  }

  const duplicates = [...rowsById]
    .filter(([, group]) => group.length > 1)
    .map(([bggId, group]) => ({
      bggId,
      titles: group.map((r) => `${r.localTitle} [${r.rawLanguage}]`),
    }));

  // Slug z nazwy BGG; kolizje rozwiązujemy dopisaniem id, deterministycznie dla wszystkich kolidujących.
  const slugCounts = new Map<string, number>();
  for (const id of rowsById.keys()) {
    const base = slugify(items.get(id)!.name) || `game-${id}`;
    slugCounts.set(base, (slugCounts.get(base) ?? 0) + 1);
  }

  const inCollection = (bggId: number) => rowsById.has(bggId);

  /**
   * BGG podaje jako „bazę” dodatku także inne dodatki, których wymaga (np. Wind Gambit → Invaders from Afar).
   * Do grupowania chcemy gry bazowe; dodatki-bazy tylko wtedy, gdy żadnej gry bazowej nie ma w kolekcji.
   */
  const collectionBaseIds = (item: BggItem): string[] => {
    const linked = item.baseGames.filter((g) => inCollection(g.bggId));
    const roots = linked.filter((g) => items.get(g.bggId)?.type === 'boardgame');
    return (roots.length ? roots : linked).map((g) => String(g.bggId));
  };

  const games = [...rowsById].map(([bggId, group]): BggGame => {
    const item = items.get(bggId)!;
    const baseSlug = slugify(item.name) || `game-${bggId}`;
    const description = item.description;

    return {
      id: String(bggId),
      bggId,
      slug: slugCounts.get(baseSlug)! > 1 ? `${baseSlug}-${bggId}` : baseSlug,
      kind: item.type === 'boardgameexpansion' ? 'expansion' : 'base',
      name: item.name,
      alternateNames: item.alternateNames,
      year: item.year,
      minPlayers: item.minPlayers,
      maxPlayers: item.maxPlayers,
      bestPlayers: item.bestPlayers,
      recommendedPlayers: item.recommendedPlayers,
      minPlayTime: item.minPlayTime,
      maxPlayTime: item.maxPlayTime,
      minAge: item.minAge,
      weight: item.weight,
      rating: item.rating,
      bayesRating: item.bayesRating,
      usersRated: item.usersRated,
      rank: item.rank,
      categories: item.categories,
      mechanics: item.mechanics,
      designers: item.designers,
      publishers: item.publishers.slice(0, 12),
      baseGameIds: collectionBaseIds(item),
      expansionIds: [],
      externalBaseGames:
        item.type === 'boardgameexpansion'
          ? item.baseGames.filter((g) => !inCollection(g.bggId))
          : [],
      image: null,
      description,
      descriptionHash: hashText(description),
      copies: group.map(toCopy),
      bggUrl: `https://boardgamegeek.com/${item.type}/${bggId}`,
      source: 'bgg',
    };
  });

  // Dodatki podpinamy od strony dodatku (link inbound) – to źródło jest pewniejsze niż lista dodatków gry bazowej.
  const byId = new Map(games.map((g) => [g.id, g]));
  for (const game of games) {
    if (game.kind !== 'expansion') continue;
    for (const baseId of game.baseGameIds) byId.get(baseId)?.expansionIds.push(game.id);
    if (game.baseGameIds.length === 0 && game.externalBaseGames.length === 0) {
      warnings.push(`Dodatek „${game.name}” (${game.id}) nie ma w BGG powiązanej gry bazowej`);
    }
  }

  games.sort((a, b) => a.name.localeCompare(b.name, 'en'));
  return { games, manual, duplicates, warnings };
}
