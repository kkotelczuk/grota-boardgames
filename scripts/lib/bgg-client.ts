/**
 * Minimalny klient BGG XML API2 z poszanowaniem limitów:
 * paczki po ≤20 id, przerwa między zapytaniami, retry z exponential backoff dla 202/429/5xx.
 * Klucz API idzie wyłącznie w nagłówku – nigdy nie jest logowany.
 */
export const BATCH_SIZE = 20;
const DELAY_BETWEEN_REQUESTS_MS = 5_000;
const MAX_ATTEMPTS = 6;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface BggClientOptions {
  apiUrl: string;
  apiKey: string;
  log?: (message: string) => void;
}

export function createBggClient({ apiUrl, apiKey, log = console.log }: BggClientOptions) {
  let lastRequestAt = 0;

  async function throttle() {
    const wait = lastRequestAt + DELAY_BETWEEN_REQUESTS_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequestAt = Date.now();
  }

  async function fetchThings(ids: number[]): Promise<string> {
    if (ids.length > BATCH_SIZE) throw new Error(`Maks. ${BATCH_SIZE} id na zapytanie`);
    const url = new URL(apiUrl);
    url.searchParams.set('id', ids.join(','));
    url.searchParams.set('stats', '1');

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      await throttle();
      const response = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });

      if (response.status === 200) return response.text();

      const retryable =
        response.status === 202 || response.status === 429 || response.status >= 500;
      if (!retryable || attempt === MAX_ATTEMPTS) {
        throw new Error(`BGG API: HTTP ${response.status} dla id=${ids.join(',')}`);
      }
      const retryAfter = Number(response.headers.get('retry-after'));
      const backoff =
        Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 2_000;
      log(
        `  HTTP ${response.status} – ponawiam za ${Math.round(backoff / 1000)} s (próba ${attempt}/${MAX_ATTEMPTS})`,
      );
      await sleep(backoff);
    }
    throw new Error('unreachable');
  }

  return { fetchThings };
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
