import { describe, expect, it } from 'vitest';
import { buildGames, type Overrides } from '../../scripts/lib/build-games.ts';
import type { BggItem } from '../../scripts/lib/bgg-xml.ts';
import { parseBggUrl, type CsvRow } from '../../scripts/lib/csv.ts';
import { parseEditionCode } from '../../src/lib/languages.ts';

let line = 1;
function row(title: string, lang: string, url: string): CsvRow {
  return {
    line: ++line,
    localTitle: title,
    rawLanguage: lang,
    ...parseEditionCode(lang),
    url,
    bgg: parseBggUrl(url),
    comment: null,
  };
}
const gameRow = (title: string, id: number, lang = 'PL') =>
  row(title, lang, `https://boardgamegeek.com/boardgame/${id}/x`);

function item(bggId: number, name: string, extra: Partial<BggItem> = {}): BggItem {
  return {
    bggId,
    type: 'boardgame',
    name,
    alternateNames: [],
    year: 2020,
    minPlayers: 2,
    maxPlayers: 4,
    bestPlayers: [],
    recommendedPlayers: [],
    minPlayTime: 30,
    maxPlayTime: 60,
    minAge: 10,
    weight: null,
    rating: null,
    bayesRating: null,
    usersRated: 0,
    rank: null,
    categories: [],
    mechanics: [],
    designers: [],
    publishers: [],
    expansions: [],
    baseGames: [],
    imageUrl: null,
    description: 'desc',
    ...extra,
  };
}

const noOverrides: Overrides = { versions: {} };
const toMap = (...items: BggItem[]) => new Map(items.map((i) => [i.bggId, i]));

describe('buildGames', () => {
  it('merges duplicate ids into copies and reports them', () => {
    const rows = [gameRow('Catan', 13, 'PL'), gameRow('Catan DE', 13, 'DE')];
    const { games, duplicates } = buildGames(rows, toMap(item(13, 'Catan')), noOverrides);

    expect(games).toHaveLength(1);
    expect(games[0]?.copies).toEqual([
      { localTitle: 'Catan', editionLanguage: 'PL', hasPolishRules: true },
      { localTitle: 'Catan DE', editionLanguage: 'DE', hasPolishRules: false },
    ]);
    expect(duplicates).toEqual([{ bggId: 13, titles: ['Catan [PL]', 'Catan DE [DE]'] }]);
  });

  it('links expansions to bases present in the collection', () => {
    const rows = [gameRow('Baza', 1), gameRow('Dodatek', 2)];
    const items = toMap(
      item(1, 'Base', { expansions: [{ bggId: 2, name: 'Exp' }] }),
      item(2, 'Exp', { type: 'boardgameexpansion', baseGames: [{ bggId: 1, name: 'Base' }] }),
    );
    const { games, warnings } = buildGames(rows, items, noOverrides);
    const base = games.find((g) => g.id === '1')!;
    const exp = games.find((g) => g.id === '2')!;

    expect(exp.kind).toBe('expansion');
    expect(exp.baseGameIds).toEqual(['1']);
    expect(exp.externalBaseGames).toEqual([]);
    expect(base.expansionIds).toEqual(['2']);
    expect(warnings).toEqual([]);
  });

  it('keeps bases outside the collection as externalBaseGames', () => {
    const items = toMap(
      item(2, 'Exp', { type: 'boardgameexpansion', baseGames: [{ bggId: 99, name: 'Away' }] }),
    );
    const { games } = buildGames([gameRow('Dodatek', 2)], items, noOverrides);

    expect(games[0]?.baseGameIds).toEqual([]);
    expect(games[0]?.externalBaseGames).toEqual([{ bggId: 99, name: 'Away' }]);
  });

  it('warns about expansions with no base game at all', () => {
    const items = toMap(item(2, 'Exp', { type: 'boardgameexpansion' }));
    const { warnings } = buildGames([gameRow('Dodatek', 2)], items, noOverrides);
    expect(warnings).toHaveLength(1);
  });

  it('sends rows without a BGG url to manual', () => {
    const { games, manual } = buildGames([row('Domowa', 'PL', '')], new Map(), noOverrides);
    expect(games).toEqual([]);
    expect(manual).toHaveLength(1);
    expect(manual[0]?.reason).toMatch(/brak linku/);
  });

  it('resolves version urls through overrides', () => {
    const rows = [row('Wersja', 'DE(PL)', 'https://boardgamegeek.com/boardgameversion/555')];
    const overrides: Overrides = { versions: { '555': { gameId: 13 } } };
    const { games, manual } = buildGames(rows, toMap(item(13, 'Catan')), overrides);

    expect(manual).toEqual([]);
    expect(games[0]?.id).toBe('13');
    expect(games[0]?.copies[0]).toMatchObject({ editionLanguage: 'DE', hasPolishRules: true });
  });

  it('sends version urls without override to manual', () => {
    const rows = [row('Wersja', 'PL', 'https://boardgamegeek.com/boardgameversion/555')];
    const { games, manual } = buildGames(rows, toMap(item(13, 'Catan')), noOverrides);
    expect(games).toEqual([]);
    expect(manual[0]?.reason).toMatch(/555/);
  });

  it('sends ids missing from the fetched items to manual', () => {
    const { games, manual } = buildGames([gameRow('Zguba', 404)], new Map(), noOverrides);
    expect(games).toEqual([]);
    expect(manual[0]?.reason).toMatch(/404/);
  });

  it('appends the id to colliding slugs, for every colliding game', () => {
    const rows = [gameRow('A', 1), gameRow('B', 2), gameRow('C', 3)];
    const { games } = buildGames(
      rows,
      toMap(item(1, 'Same Name'), item(2, 'Same Name'), item(3, 'Other')),
      noOverrides,
    );
    const slugs = Object.fromEntries(games.map((g) => [g.id, g.slug]));
    expect(slugs).toEqual({ '1': 'same-name-1', '2': 'same-name-2', '3': 'other' });
  });

  it('takes kind from the item type, not the url type', () => {
    const rows = [row('Dodatek', 'PL', 'https://boardgamegeek.com/boardgame/2/x')];
    const items = toMap(
      item(2, 'Exp', { type: 'boardgameexpansion', baseGames: [{ bggId: 1, name: 'B' }] }),
    );
    const { games } = buildGames(rows, items, noOverrides);
    expect(games[0]?.kind).toBe('expansion');
    expect(games[0]?.bggUrl).toBe('https://boardgamegeek.com/boardgameexpansion/2');
  });
});
