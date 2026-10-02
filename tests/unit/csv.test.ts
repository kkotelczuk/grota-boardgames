import { describe, expect, it } from 'vitest';
import { parseBggUrl, parseGamesCsv } from '../../scripts/lib/csv.ts';

describe('parseBggUrl', () => {
  it('parses boardgame, expansion and version urls', () => {
    expect(parseBggUrl('https://boardgamegeek.com/boardgame/13/catan')).toEqual({
      urlType: 'boardgame',
      id: 13,
    });
    expect(parseBggUrl('https://www.boardgamegeek.com/boardgameexpansion/926/x')).toEqual({
      urlType: 'boardgameexpansion',
      id: 926,
    });
    expect(parseBggUrl(' https://boardgamegeek.com/boardgameversion/123456 ')).toEqual({
      urlType: 'boardgameversion',
      id: 123456,
    });
  });

  it('returns null for non-BGG or empty urls', () => {
    expect(parseBggUrl('https://example.com/boardgame/13')).toBeNull();
    expect(parseBggUrl('https://boardgamegeek.com/boardgamedesigner/13')).toBeNull();
    expect(parseBggUrl('')).toBeNull();
  });
});

describe('parseGamesCsv', () => {
  const csv = [
    'Tytuł,Język ,BGG,',
    'Catan  ,PL,https://boardgamegeek.com/boardgame/13/catan,',
    '',
    'Terraformacja Marsa ,EN(PL),https://boardgamegeek.com/boardgame/167791/x,"Brak figurek, uszkodzone pudełko"',
    'Gra domowa,??,,',
    'Wersja,DE{PL},https://boardgamegeek.com/boardgameversion/55,',
    '',
  ].join('\r\n');

  const rows = parseGamesCsv(csv);

  it('skips the header and empty lines', () => {
    expect(rows.map((r) => r.localTitle)).toEqual([
      'Catan',
      'Terraformacja Marsa',
      'Gra domowa',
      'Wersja',
    ]);
  });

  it('trims titles and handles CRLF', () => {
    expect(rows[0]).toMatchObject({
      localTitle: 'Catan',
      rawLanguage: 'PL',
      url: 'https://boardgamegeek.com/boardgame/13/catan',
      bgg: { urlType: 'boardgame', id: 13 },
      comment: null,
    });
  });

  it('keeps a quoted comment containing a comma', () => {
    expect(rows[1]?.comment).toBe('Brak figurek, uszkodzone pudełko');
  });

  it('parses edition codes and missing urls', () => {
    expect(rows[1]).toMatchObject({ editionLanguage: 'EN', hasPolishRules: true });
    expect(rows[2]).toMatchObject({
      editionLanguage: 'EN',
      hasPolishRules: true,
      bgg: null,
      url: '',
    });
    expect(rows[3]).toMatchObject({ editionLanguage: 'DE', hasPolishRules: true });
    expect(rows[3]?.bgg).toEqual({ urlType: 'boardgameversion', id: 55 });
  });

  it('reports physical 1-based file line numbers (header = 1, empty line skipped but counted)', () => {
    // skip_empty_lines drops blank rows before indexing, so lines are record-based.
    expect(rows.map((r) => r.line)).toEqual([2, 4, 5, 6]);
  });
});
