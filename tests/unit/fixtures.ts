import type { GameIndexItem } from '@/lib/game-index';
import { normalizeForSearch } from '@/lib/text';

export function makeGame(
  overrides: Partial<GameIndexItem> & { title?: string } = {},
): GameIndexItem {
  const title = overrides.title ?? 'Game';
  return {
    id: overrides.id ?? title.toLowerCase().replace(/\s+/g, '-'),
    href: `/pl/gry/${overrides.id ?? title.toLowerCase().replace(/\s+/g, '-')}/`,
    kind: 'base',
    title,
    subtitle: null,
    search: normalizeForSearch(title),
    minPlayers: 2,
    maxPlayers: 4,
    bestPlayers: [],
    minPlayTime: 30,
    maxPlayTime: 60,
    minAge: 10,
    weight: 2.5,
    rating: 7,
    rank: 100,
    year: 2020,
    languages: ['PL'],
    hasPolishRules: false,
    copies: 1,
    categories: [],
    mechanics: [],
    baseGameIds: [],
    expansionIds: [],
    cover: null,
    ...overrides,
  };
}
