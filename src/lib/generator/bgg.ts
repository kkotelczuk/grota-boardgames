/**
 * Wyszukiwanie gier spoza kolekcji w BGG XML API2 – prosto z przeglądarki (client-safe).
 *
 * - API wymaga tokenu (`Authorization: Bearer …`) i odpowiada z nagłówkami CORS, więc da się
 *   je wołać z wyspy. Tokenu NIE wkładamy do bundla – użytkownik wpisuje go raz, trzymamy go
 *   w localStorage (patrz `GENERATOR_BGG_TOKEN_KEY`).
 * - Obrazki z cf.geekdo-images.com nie mają nagłówków CORS → narysowane na canvasie „brudzą” go
 *   i eksport PNG pada. Dlatego okładka na grafikę idzie przez proxy images.weserv.nl (dodaje
 *   `Access-Control-Allow-Origin: *` i przy okazji zmniejsza obrazek).
 */
import { normalizeForSearch } from '@/lib/text';

export const BGG_API_URL = 'https://boardgamegeek.com/xmlapi2';
/** BGG pozwala na maks. 20 id w jednym zapytaniu `thing`. */
const THING_BATCH = 20;
const MAX_ATTEMPTS = 3;

export interface BggGame {
  id: string;
  name: string;
  year: number | null;
  /** Mała miniatura (~200 px) – do listy wyników, nie na canvas. */
  thumbnail: string | null;
  /** Oryginalny obrazek – na grafikę tylko przez `bggCoverUrl`. */
  image: string | null;
  /** Liczba ocen – miara popularności do sortowania wyników. */
  usersRated: number;
}

export type BggErrorKind = 'unauthorized' | 'rate-limit' | 'network';

export class BggError extends Error {
  constructor(readonly kind: BggErrorKind) {
    super(`BGG: ${kind}`);
    this.name = 'BggError';
  }
}

interface SearchHit {
  id: string;
  name: string;
}

const parseXml = (xml: string) => new DOMParser().parseFromString(xml, 'application/xml');

const intAttr = (el: Element | null, attr = 'value') => {
  const value = Number.parseInt(el?.getAttribute(attr) ?? '', 10);
  return Number.isFinite(value) ? value : null;
};

/** Wynik `/search`: id + nazwa (główna albo alternatywna, która pasowała do frazy). */
export function parseSearch(xml: string): SearchHit[] {
  const hits = new Map<string, SearchHit>();
  for (const item of parseXml(xml).querySelectorAll('items > item')) {
    const id = item.getAttribute('id');
    const name = item.querySelector('name')?.getAttribute('value');
    if (id && name && !hits.has(id)) hits.set(id, { id, name });
  }
  return [...hits.values()];
}

/** Wynik `/thing?stats=1`: tylko to, czego potrzebuje generator. */
export function parseThings(xml: string): BggGame[] {
  return [...parseXml(xml).querySelectorAll('items > item')].flatMap((item) => {
    const id = item.getAttribute('id');
    const name = item.querySelector('name[type="primary"]')?.getAttribute('value');
    if (!id || !name) return [];
    return [
      {
        id,
        name,
        year: intAttr(item.querySelector('yearpublished')),
        thumbnail: item.querySelector('thumbnail')?.textContent?.trim() || null,
        image: item.querySelector('image')?.textContent?.trim() || null,
        usersRated: intAttr(item.querySelector('ratings > usersrated')) ?? 0,
      },
    ];
  });
}

/**
 * Trafność nazwy względem frazy: 0 = identyczna, 1 = zaczyna się od frazy, 2 = zawiera ją
 * jako początek słowa, 3 = reszta. `/search` zwraca wyniki alfabetycznie, więc bez tego
 * „Catan” ginąłby pod „7 Wonders: Catan”.
 */
export function matchScore(name: string, query: string): number {
  const n = normalizeForSearch(name);
  const q = normalizeForSearch(query);
  if (n === q) return 0;
  if (n.startsWith(q)) return 1;
  if (n.split(/[^\p{L}\p{N}]+/u).some((word) => word.startsWith(q))) return 2;
  return 3;
}

/** Okładka na grafikę: przez proxy z CORS, zmniejszona do 480 px (jak okładki z kolekcji). */
export function bggCoverUrl(image: string): string {
  const url = new URL('https://images.weserv.nl/');
  url.searchParams.set('url', image.replace(/^https?:\/\//, ''));
  url.searchParams.set('w', '480');
  url.searchParams.set('h', '480');
  url.searchParams.set('fit', 'inside');
  url.searchParams.set('output', 'webp');
  return url.toString();
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(signal.reason);
    });
  });

async function request(url: URL, token: string, signal?: AbortSignal): Promise<string> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let response: Response;
    try {
      response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        signal: signal ?? null,
      });
    } catch (error) {
      if (signal?.aborted) throw error;
      throw new BggError('network');
    }
    if (response.ok && response.status !== 202) return response.text();
    if (response.status === 401 || response.status === 403) throw new BggError('unauthorized');
    // 202 = BGG przygotowuje odpowiedź; 429/5xx – chwilowe. Krótko czekamy i ponawiamy.
    const retryable = response.status === 202 || response.status >= 500;
    if (response.status === 429 || !retryable || attempt === MAX_ATTEMPTS) {
      throw new BggError(response.status === 429 ? 'rate-limit' : 'network');
    }
    await sleep(attempt * 1_500, signal);
  }
  throw new BggError('network');
}

/**
 * Szuka gier bazowych w BGG: `/search` → wybór najtrafniejszych → `/thing` (okładki, rok,
 * popularność). Kolejność: trafność nazwy, potem liczba ocen.
 */
export async function searchBgg(
  query: string,
  token: string,
  { limit = 8, signal }: { limit?: number; signal?: AbortSignal } = {},
): Promise<BggGame[]> {
  const searchUrl = new URL(`${BGG_API_URL}/search`);
  searchUrl.searchParams.set('query', query.trim());
  searchUrl.searchParams.set('type', 'boardgame');
  const hits = parseSearch(await request(searchUrl, token, signal));
  if (!hits.length) return [];

  const score = new Map(hits.map((hit) => [hit.id, matchScore(hit.name, query)]));
  // Sortowanie stabilne – w obrębie tej samej trafności zostaje kolejność z BGG.
  const best = hits.toSorted((a, b) => score.get(a.id)! - score.get(b.id)!).slice(0, THING_BATCH);

  const thingUrl = new URL(`${BGG_API_URL}/thing`);
  thingUrl.searchParams.set('id', best.map((hit) => hit.id).join(','));
  thingUrl.searchParams.set('type', 'boardgame'); // bez dodatków
  thingUrl.searchParams.set('stats', '1');
  const games = parseThings(await request(thingUrl, token, signal));

  return games
    .toSorted((a, b) => score.get(a.id)! - score.get(b.id)! || b.usersRated - a.usersRated)
    .slice(0, limit);
}
