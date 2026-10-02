import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { MANUAL_HEADER, mergeManualFile } from '../../scripts/lib/manual-file.ts';
import type { ManualCandidate } from '../../scripts/lib/build-games.ts';
import { parseEditionCode } from '../../src/lib/languages.ts';

function candidate(
  title: string,
  url: string,
  line: number,
  comment: string | null = null,
): ManualCandidate {
  return {
    reason: 'brak linku do BGG',
    row: {
      line,
      localTitle: title,
      rawLanguage: 'EN(PL)',
      ...parseEditionCode('EN(PL)'),
      url,
      bgg: null,
      comment,
    },
  };
}

type Doc = { games: Record<string, unknown>[] };

describe('mergeManualFile', () => {
  const candidates = [
    candidate('Gra "Domowa"', 'https://example.com/a', 5, 'Uwaga: test, z przecinkiem'),
    candidate('Inna gra', 'https://example.com/b', 9),
  ];

  it('creates the header and entries when there is no file yet', () => {
    const { content, added } = mergeManualFile(null, candidates);
    expect(content.startsWith(MANUAL_HEADER)).toBe(true);
    expect(added).toEqual(['manual-gra-domowa', 'manual-inna-gra']);
  });

  it('produces valid YAML with the expected fields', () => {
    const doc = parse(mergeManualFile(null, candidates).content) as Doc;
    expect(doc.games).toHaveLength(2);
    expect(doc.games[0]).toMatchObject({
      id: 'manual-gra-domowa',
      title: 'Gra "Domowa"',
      kind: 'base',
      sourceUrl: 'https://example.com/a',
      csvComment: 'Uwaga: test, z przecinkiem',
      copies: [{ localTitle: 'Gra "Domowa"', editionLanguage: 'EN', hasPolishRules: true }],
      bestPlayers: [],
      summary: { pl: null, en: null },
    });
    expect(doc.games[1]).toMatchObject({ csvComment: null });
  });

  it('does not duplicate entries already present when re-run on its own output', () => {
    const first = mergeManualFile(null, candidates);
    const second = mergeManualFile(first.content, candidates);
    expect(second.added).toEqual([]);
    expect(second.content).toBe(first.content);
  });

  it('appends only new candidates to an existing file', () => {
    const first = mergeManualFile(null, candidates.slice(0, 1));
    const second = mergeManualFile(first.content, candidates);
    expect(second.added).toEqual(['manual-inna-gra']);
    expect((parse(second.content) as Doc).games).toHaveLength(2);
  });

  it('disambiguates ids that collide with different urls', () => {
    const { added } = mergeManualFile(null, [
      candidate('Ta sama', 'https://example.com/1', 3),
      candidate('Ta sama', 'https://example.com/2', 8),
    ]);
    expect(added).toEqual(['manual-ta-sama', 'manual-ta-sama-8']);
  });
});
