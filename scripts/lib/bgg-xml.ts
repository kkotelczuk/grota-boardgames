import { XMLParser } from 'fast-xml-parser';
import he from 'he';

/** Surowe dane jednej pozycji z BGG XML API2 – przed dopasowaniem do kolekcji. */
export interface BggItem {
  bggId: number;
  type: 'boardgame' | 'boardgameexpansion';
  name: string;
  alternateNames: string[];
  year: number | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  bestPlayers: number[];
  recommendedPlayers: number[];
  minPlayTime: number | null;
  maxPlayTime: number | null;
  minAge: number | null;
  weight: number | null;
  rating: number | null;
  bayesRating: number | null;
  usersRated: number;
  rank: number | null;
  categories: { id: number; name: string }[];
  mechanics: { id: number; name: string }[];
  designers: string[];
  publishers: string[];
  /** Linki `boardgameexpansion` bez `inbound` – dodatki do tej gry. */
  expansions: { bggId: number; name: string }[];
  /** Linki `boardgameexpansion` z `inbound="true"` – gry bazowe tego dodatku. */
  baseGames: { bggId: number; name: string }[];
  imageUrl: string | null;
  description: string;
}

type Attr = Record<string, string>;
type Node = Record<string, unknown>;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  // Encje dekodujemy sami przez `he`: BGG koduje opis dwa razy (XML + HTML, np. `&amp;rsquo;`).
  processEntities: false,
  parseAttributeValue: false,
  parseTagValue: false,
  isArray: (name, _jpath, _isLeaf, isAttribute) =>
    !isAttribute &&
    ['item', 'name', 'link', 'poll', 'poll-summary', 'result', 'results', 'rank'].includes(name),
});

const asArray = <T>(value: unknown): T[] =>
  Array.isArray(value) ? (value as T[]) : value == null ? [] : [value as T];

function attr(node: unknown, key = 'value'): string | undefined {
  return (node as Attr | undefined)?.[key];
}

function int(node: unknown): number | null {
  const n = Number.parseInt(attr(node) ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function float(node: unknown): number | null {
  const n = Number.parseFloat(attr(node) ?? '');
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

/** „Best with 2–3, 5 players” → [2, 3, 5]. „4+” (ponad maksimum) pomijamy. */
export function parsePlayerSummary(text: string | undefined): number[] {
  const match = /with\s+(.+?)\s+players?/i.exec(text ?? '');
  if (!match?.[1]) return [];
  const result = new Set<number>();
  for (const part of match[1].split(',')) {
    const [from, to] = part
      .trim()
      .split(/[–-]/)
      .map((v) => Number.parseInt(v, 10));
    if (from === undefined || !Number.isFinite(from)) continue;
    const end = to !== undefined && Number.isFinite(to) ? to : from;
    for (let n = from; n <= end; n++) result.add(n);
  }
  return [...result].sort((a, b) => a - b);
}

/** Opis BGG: encje HTML zdekodowane, akapity (`&#10;`) zachowane jako `\n\n`. */
export function cleanDescription(raw: string): string {
  return he
    .decode(he.decode(raw))
    .replace(/\r/g, '')
    .split(/\n\s*\n|\n/)
    .map((p) => p.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n\n');
}

function parseItem(item: Node): BggItem | null {
  const type = attr(item, 'type');
  if (type !== 'boardgame' && type !== 'boardgameexpansion') return null;

  const names = asArray<Attr>(item['name']);
  const links = asArray<Attr>(item['link']);
  const linksOf = (linkType: string) => links.filter((l) => l['type'] === linkType);
  const ref = (l: Attr) => ({ bggId: Number(l['id']), name: he.decode(l['value'] ?? '') });

  const summary = asArray<Node>(item['poll-summary']).find(
    (p) => attr(p, 'name') === 'suggested_numplayers',
  );
  const summaryResults = asArray<Attr>(summary?.['result']);
  const summaryText = (name: string) => summaryResults.find((r) => r['name'] === name)?.['value'];

  const ratings = ((item['statistics'] as Node | undefined)?.['ratings'] ?? {}) as Node;
  const ranks = asArray<Attr>((ratings['ranks'] as Node | undefined)?.['rank']);
  const overallRank = ranks.find((r) => r['name'] === 'boardgame');

  return {
    bggId: Number(attr(item, 'id')),
    type,
    name: he.decode(names.find((n) => n['type'] === 'primary')?.['value'] ?? ''),
    alternateNames: names
      .filter((n) => n['type'] === 'alternate')
      .map((n) => he.decode(n['value'] ?? '')),
    year: int(item['yearpublished']),
    minPlayers: int(item['minplayers']),
    maxPlayers: int(item['maxplayers']),
    bestPlayers: parsePlayerSummary(summaryText('bestwith')),
    // BGG ma literówkę w nazwie pola: „recommmendedwith”.
    recommendedPlayers: parsePlayerSummary(
      summaryText('recommmendedwith') ?? summaryText('recommendedwith'),
    ),
    minPlayTime: int(item['minplaytime']) ?? int(item['playingtime']),
    maxPlayTime: int(item['maxplaytime']) ?? int(item['playingtime']),
    minAge: int(item['minage']),
    weight: float(ratings['averageweight']),
    rating: float(ratings['average']),
    bayesRating: float(ratings['bayesaverage']),
    usersRated: int(ratings['usersrated']) ?? 0,
    rank: overallRank ? int(overallRank) : null,
    categories: linksOf('boardgamecategory').map((l) => ({
      id: Number(l['id']),
      name: he.decode(l['value'] ?? ''),
    })),
    mechanics: linksOf('boardgamemechanic').map((l) => ({
      id: Number(l['id']),
      name: he.decode(l['value'] ?? ''),
    })),
    designers: linksOf('boardgamedesigner').map((l) => he.decode(l['value'] ?? '')),
    publishers: linksOf('boardgamepublisher').map((l) => he.decode(l['value'] ?? '')),
    expansions: linksOf('boardgameexpansion')
      .filter((l) => l['inbound'] !== 'true')
      .map(ref),
    baseGames: linksOf('boardgameexpansion')
      .filter((l) => l['inbound'] === 'true')
      .map(ref),
    imageUrl: typeof item['image'] === 'string' ? item['image'].trim() : null,
    description: cleanDescription(
      typeof item['description'] === 'string' ? item['description'] : '',
    ),
  };
}

export function parseBggXml(xml: string): BggItem[] {
  const doc = parser.parse(xml) as { items?: { item?: Node[] } };
  return (doc.items?.item ?? []).flatMap((item) => parseItem(item) ?? []);
}

/** Dzieli odpowiedź z wieloma `<item>` na osobne dokumenty XML – do cache per id. */
export function splitItems(xml: string): Map<number, string> {
  const out = new Map<number, string>();
  for (const match of xml.matchAll(/<item\b[^>]*\bid="(\d+)"[\s\S]*?<\/item>/g)) {
    out.set(
      Number(match[1]),
      `<?xml version="1.0" encoding="utf-8"?>\n<items>${match[0]}</items>\n`,
    );
  }
  return out;
}
