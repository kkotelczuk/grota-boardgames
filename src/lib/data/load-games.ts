/**
 * Scalanie źródeł danych w jeden model `Game` – uruchamiane przy buildzie przez loader kolekcji.
 *
 *   src/data/games.json          (BGG, generuje `pnpm data:fetch`)
 * + data/manual-games.yaml       (gry spoza BGG, uzupełnia człowiek)
 * + data/translations/*.json     (opisy PL, podsumowania, terminy)
 *
 * Nigdy nie rzuca błędu z powodu niepełnych danych ręcznych – zwraca ostrzeżenia.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import {
  bggGamesFileSchema,
  manualGameSchema,
  type BggGame,
  type Game,
  type ManualGame,
  type Term,
} from '../schema.ts';

type PlFile = Record<string, { sourceHash: string; description: string }>;
type SummariesFile = Record<string, { sourceHash: string; pl: string; en: string }>;
type TermsFile = Record<string, string>;

export interface LoadResult {
  games: Game[];
  warnings: string[];
}

const readJson = <T>(file: string, fallback: T): T =>
  existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as T) : fallback;

/** Słownik id → nazwa EN, zbudowany z danych BGG – potrzebny dla terminów w grach ręcznych. */
function buildTermIndex(games: BggGame[]) {
  const index = new Map<number, string>();
  for (const game of games) {
    for (const term of [...game.categories, ...game.mechanics]) index.set(term.id, term.name);
  }
  return index;
}

export function loadGames(root = process.cwd()): LoadResult {
  const warnings: string[] = [];
  const bgg = bggGamesFileSchema.parse(
    readJson(path.join(root, 'src/data/games.json'), { generatedAt: '', games: [] }),
  ).games;
  const pl = readJson<PlFile>(path.join(root, 'data/translations/pl.json'), {});
  const summaries = readJson<SummariesFile>(
    path.join(root, 'data/translations/summaries.json'),
    {},
  );
  const termsPl = readJson<TermsFile>(path.join(root, 'data/translations/bgg-terms.pl.json'), {});
  const termIndex = buildTermIndex(bgg);

  const localizeTerm = ({ id, name }: Term) => ({ id, en: name, pl: termsPl[id] ?? name });

  const fromBgg = bgg.map((g): Game => {
    const translation = pl[g.id];
    const summary = summaries[g.id];
    // Nieaktualne tłumaczenie (zmienił się opis EN) – lepiej pokazać aktualny EN niż stary PL.
    const plFresh = translation?.sourceHash === g.descriptionHash;
    if (g.description && !plFresh)
      warnings.push(`Brak aktualnego tłumaczenia PL: ${g.name} (${g.id})`);

    return {
      id: g.id,
      slug: g.slug,
      source: 'bgg',
      kind: g.kind,
      bggId: g.bggId,
      bggUrl: g.bggUrl,
      sourceUrl: null,
      titlePl:
        g.copies.find((c) => c.editionLanguage === 'PL')?.localTitle ?? g.copies[0]!.localTitle,
      titleOriginal: g.name,
      alternateNames: g.alternateNames,
      year: g.year,
      minPlayers: g.minPlayers,
      maxPlayers: g.maxPlayers,
      bestPlayers: g.bestPlayers,
      recommendedPlayers: g.recommendedPlayers,
      minPlayTime: g.minPlayTime,
      maxPlayTime: g.maxPlayTime,
      minAge: g.minAge,
      weight: g.weight,
      rating: g.rating,
      usersRated: g.usersRated,
      rank: g.rank,
      categories: g.categories.map(localizeTerm),
      mechanics: g.mechanics.map(localizeTerm),
      designers: g.designers,
      publishers: g.publishers,
      baseGameIds: g.baseGameIds,
      expansionIds: g.expansionIds,
      externalBaseGames: g.externalBaseGames,
      image: g.image ? `games/${g.image}` : null,
      description: { en: g.description || null, pl: plFresh ? translation.description : null },
      summary: { pl: summary?.pl ?? null, en: summary?.en ?? null },
      copies: g.copies,
      missing: [],
    };
  });

  const fromManual = loadManual(root, warnings).map((m): Game => {
    const termsFor = (ids: number[] | null | undefined) =>
      (ids ?? []).map((id) => localizeTerm({ id, name: termIndex.get(id) ?? String(id) }));
    const required = {
      minPlayers: m.minPlayers,
      minPlayTime: m.minPlayTime,
      minAge: m.minAge,
      image: m.image,
    };
    const missing = [
      ...Object.entries(required)
        .filter(([, v]) => v == null)
        .map(([k]) => k),
      ...(!m.summary?.pl ? ['summary.pl'] : []),
      ...(!m.description?.pl ? ['description.pl'] : []),
    ];
    if (missing.length) warnings.push(`Niepełny wpis ręczny ${m.id}: brak ${missing.join(', ')}`);

    return {
      id: m.id,
      slug: m.id.replace(/^manual-/, ''),
      source: 'manual',
      kind: m.kind,
      bggId: null,
      bggUrl: null,
      sourceUrl: m.sourceUrl ?? null,
      titlePl: m.title,
      titleOriginal: m.originalTitle ?? m.title,
      alternateNames: [],
      year: m.year,
      minPlayers: m.minPlayers,
      maxPlayers: m.maxPlayers ?? m.minPlayers,
      bestPlayers: m.bestPlayers ?? [],
      recommendedPlayers: [],
      minPlayTime: m.minPlayTime,
      maxPlayTime: m.maxPlayTime ?? m.minPlayTime,
      minAge: m.minAge,
      weight: m.weight ?? null,
      rating: null,
      usersRated: 0,
      rank: null,
      categories: termsFor(m.categories),
      mechanics: termsFor(m.mechanics),
      designers: m.designers ?? [],
      publishers: [],
      baseGameIds: m.baseGameId ? [m.baseGameId] : [],
      expansionIds: [],
      externalBaseGames: [],
      image: m.image ? `manual/${m.image}` : null,
      description: { pl: m.description?.pl ?? null, en: m.description?.en ?? null },
      summary: { pl: m.summary?.pl ?? null, en: m.summary?.en ?? null },
      copies: m.copies,
      missing,
    };
  });

  const games = [...fromBgg, ...fromManual];
  const byId = new Map(games.map((g) => [g.id, g]));

  // Dodatki ręczne podpinamy pod gry bazowe; nieistniejące id bazy → samodzielna pozycja.
  for (const game of fromManual) {
    game.baseGameIds = game.baseGameIds.filter((id) => {
      const base = byId.get(id);
      if (!base) warnings.push(`${game.id}: baseGameId „${id}” nie istnieje w kolekcji`);
      else base.expansionIds.push(game.id);
      return Boolean(base);
    });
  }

  // Slugi gier ręcznych mogą kolidować ze slugami BGG – wtedy zostawiamy prefiks.
  const slugs = new Set(fromBgg.map((g) => g.slug));
  for (const game of fromManual) {
    if (slugs.has(game.slug)) game.slug = game.id;
    slugs.add(game.slug);
  }

  return { games, warnings };
}

function loadManual(root: string, warnings: string[]): ManualGame[] {
  const file = path.join(root, 'data/manual-games.yaml');
  if (!existsSync(file)) return [];
  const doc = parseYaml(readFileSync(file, 'utf8')) as { games?: unknown[] } | null;

  return (doc?.games ?? []).flatMap((raw, index) => {
    const result = manualGameSchema.safeParse(raw);
    if (result.success) return [result.data];
    const id = (raw as { id?: string } | null)?.id ?? `#${index + 1}`;
    warnings.push(
      `Pominięto wpis ręczny ${id}: ${result.error.issues.map((i) => `${i.path.join('.')} – ${i.message}`).join('; ')}`,
    );
    return [];
  });
}
