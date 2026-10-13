import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import BggSearch from '@/components/vue/generator/BggSearch.vue';
import { I18N } from '@/components/vue/i18n';
import { GENERATOR_BGG_TOKEN_KEY } from '@/config/generator';
import { useTranslations } from '@/i18n';
import {
  BggError,
  bggCoverUrl,
  matchScore,
  parseSearch,
  parseThings,
  searchBgg,
} from '@/lib/generator/bgg';
import type { GeneratorGame } from '@/lib/generator/types';

const global = { provide: { [I18N as symbol]: { locale: 'pl', t: useTranslations('pl') } } };

const SEARCH_XML = `<?xml version="1.0" encoding="utf-8"?><items total="3">
  <item type="boardgame" id="110308"><name type="primary" value="7 Wonders: Catan"/><yearpublished value="2011" /></item>
  <item type="boardgame" id="13"><name type="primary" value="Catan"/><yearpublished value="1995" /></item>
  <item type="boardgame" id="13"><name type="alternate" value="Die Siedler von Catan"/></item>
  <item type="boardgame" id="27710"><name type="primary" value="Catan Dice Game"/></item>
</items>`;

const thing = (id: string, name: string, rated: number, image = true) => `
  <item type="boardgame" id="${id}">
    ${image ? `<thumbnail>https://cf.geekdo-images.com/${id}_small.jpg</thumbnail><image>https://cf.geekdo-images.com/${id}.jpg</image>` : ''}
    <name type="alternate" sortindex="1" value="Alt ${name}" />
    <name type="primary" sortindex="1" value="${name}" />
    <yearpublished value="2000" />
    <statistics><ratings><usersrated value="${rated}" /></ratings></statistics>
  </item>`;
const THINGS_XML = `<?xml version="1.0" encoding="utf-8"?><items>${thing('110308', '7 Wonders: Catan', 900)}${thing('13', 'Catan', 120000)}${thing('27710', 'Catan Dice Game', 4000, false)}</items>`;

const xmlResponse = (body: string, status = 200) => new Response(body, { status });

describe('BGG parsing', () => {
  it('parses search hits, deduplicating ids', () => {
    expect(parseSearch(SEARCH_XML)).toEqual([
      { id: '110308', name: '7 Wonders: Catan' },
      { id: '13', name: 'Catan' },
      { id: '27710', name: 'Catan Dice Game' },
    ]);
  });

  it('parses things with the primary name, images and rating count', () => {
    const [, catan, dice] = parseThings(THINGS_XML);
    expect(catan).toEqual({
      id: '13',
      name: 'Catan',
      year: 2000,
      thumbnail: 'https://cf.geekdo-images.com/13_small.jpg',
      image: 'https://cf.geekdo-images.com/13.jpg',
      usersRated: 120000,
    });
    expect(dice).toMatchObject({ thumbnail: null, image: null });
  });

  it('scores exact > prefix > word prefix > rest, ignoring case and diacritics', () => {
    expect(matchScore('Catan', 'catan')).toBe(0);
    expect(matchScore('Catan Dice Game', 'catan')).toBe(1);
    expect(matchScore('7 Wonders: Catan', 'catan')).toBe(2);
    expect(matchScore('Złodziej', 'zlodziej')).toBe(0);
    expect(matchScore('Scatan', 'catan')).toBe(3);
  });

  it('routes covers through the CORS image proxy', () => {
    const url = new URL(bggCoverUrl('https://cf.geekdo-images.com/a/pic1.jpg'));
    expect(url.origin).toBe('https://images.weserv.nl');
    expect(url.searchParams.get('url')).toBe('cf.geekdo-images.com/a/pic1.jpg');
    expect(url.searchParams.get('w')).toBe('480');
  });
});

describe('searchBgg', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sends the token and ranks by relevance, then popularity', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(xmlResponse(SEARCH_XML))
      .mockResolvedValueOnce(xmlResponse(THINGS_XML));
    vi.stubGlobal('fetch', fetchMock);

    const games = await searchBgg('catan', 'secret');
    expect(games.map((g) => g.name)).toEqual(['Catan', 'Catan Dice Game', '7 Wonders: Catan']);

    const [searchUrl, init] = fetchMock.mock.calls[0]!;
    expect(String(searchUrl)).toContain('/xmlapi2/search?query=catan&type=boardgame');
    expect(init.headers).toEqual({ Authorization: 'Bearer secret' });
    const thingUrl = new URL(String(fetchMock.mock.calls[1]![0]));
    expect(thingUrl.searchParams.get('id')).toBe('13,27710,110308');
    expect(thingUrl.searchParams.get('type')).toBe('boardgame');
  });

  it('skips the thing request when nothing was found', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(xmlResponse('<items total="0"></items>'));
    vi.stubGlobal('fetch', fetchMock);
    expect(await searchBgg('zzz', 't')).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    [401, 'unauthorized'],
    [429, 'rate-limit'],
  ])('maps HTTP %i to a %s error', async (status, kind) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(xmlResponse('', status)));
    await expect(searchBgg('catan', 't')).rejects.toEqual(new BggError(kind as never));
  });
});

describe('BggSearch', () => {
  const catalogGame: GeneratorGame = {
    id: '13',
    title: 'Catan (PL)',
    subtitle: null,
    search: 'catan',
    cover: '/_astro/catan.webp',
    thumb: '/_astro/catan-96.webp',
  };
  const mountSearch = (selected: string[] = []) =>
    mount(BggSearch, {
      props: {
        query: 'catan',
        catalog: new Map([['13', catalogGame]]),
        selectedKeys: new Set(selected),
        disabled: false,
      },
      global,
    });

  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it('asks for a token first and remembers it', async () => {
    const wrapper = mountSearch();
    expect(wrapper.text()).toContain('Token BGG XML API');
    await wrapper.find('input[type="password"]').setValue(' abc ');
    await wrapper.find('form').trigger('submit');
    expect(localStorage.getItem(GENERATOR_BGG_TOKEN_KEY)).toBe('abc');
    expect(wrapper.find('button').text()).toBe('Szukaj „catan” w BoardGameGeek');
  });

  it('shows results with covers and adds a BGG game via the proxy', async () => {
    localStorage.setItem(GENERATOR_BGG_TOKEN_KEY, 'abc');
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(xmlResponse(SEARCH_XML))
        .mockResolvedValueOnce(xmlResponse(THINGS_XML)),
    );
    const wrapper = mountSearch();
    await wrapper.find('button').trigger('click');
    await flushPromises();

    const results = wrapper.findAll('li button');
    expect(results).toHaveLength(3);
    expect(results[0]!.text()).toContain('w kolekcji');
    expect(results[1]!.find('img').exists()).toBe(false); // Catan Dice Game – brak okładki
    expect(results[2]!.find('img').attributes('src')).toBe(
      'https://cf.geekdo-images.com/110308_small.jpg',
    );

    await results[2]!.trigger('click');
    expect(wrapper.emitted('add')![0]![0]).toEqual({
      key: 'bgg:110308',
      source: 'bgg',
      title: '7 Wonders: Catan',
      cover: bggCoverUrl('https://cf.geekdo-images.com/110308.jpg'),
    });

    // Gra z kolekcji – dodajemy wersję z kolekcji (polski tytuł, okładka z naszej domeny).
    await results[0]!.trigger('click');
    expect(wrapper.emitted('add')![1]![0]).toEqual({
      key: '13',
      source: 'catalog',
      title: 'Catan (PL)',
      cover: '/_astro/catan.webp',
    });
  });

  it('forgets a rejected token and shows the token form again', async () => {
    localStorage.setItem(GENERATOR_BGG_TOKEN_KEY, 'bad');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(xmlResponse('', 401)));
    const wrapper = mountSearch();
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(wrapper.find('[role="alert"]').text()).toContain('odrzucił token');
    expect(localStorage.getItem(GENERATOR_BGG_TOKEN_KEY)).toBeNull();
    expect(wrapper.find('input[type="password"]').exists()).toBe(true);
  });
});
