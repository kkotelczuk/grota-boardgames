import { describe, expect, it } from 'vitest';
import { editionLabel, formatEditionCode, parseEditionCode } from '@/lib/languages.ts';

describe('parseEditionCode', () => {
  it.each([
    ['PL', { editionLanguage: 'PL', hasPolishRules: true }],
    ['EN', { editionLanguage: 'EN', hasPolishRules: false }],
    ['DE', { editionLanguage: 'DE', hasPolishRules: false }],
    ['EN(PL)', { editionLanguage: 'EN', hasPolishRules: true }],
    ['DE{PL}', { editionLanguage: 'DE', hasPolishRules: true }],
    ['de { pl }', { editionLanguage: 'DE', hasPolishRules: true }],
    ['  en  ', { editionLanguage: 'EN', hasPolishRules: false }],
    ['??', { editionLanguage: 'EN', hasPolishRules: true }],
  ])('parses %j', (raw, expected) => {
    expect(parseEditionCode(raw)).toEqual(expected);
  });

  it.each(['XYZ', 'EN(DE)', 'E', 'EN(PL'])('throws for unknown code %j', (raw) => {
    expect(() => parseEditionCode(raw)).toThrow(/Nieznany kod/);
  });
});

describe('formatEditionCode', () => {
  it('formats plain and Polish-rules editions', () => {
    expect(formatEditionCode({ editionLanguage: 'PL', hasPolishRules: true })).toBe('PL');
    expect(formatEditionCode({ editionLanguage: 'EN', hasPolishRules: false })).toBe('EN');
    expect(formatEditionCode({ editionLanguage: 'EN', hasPolishRules: true })).toBe('EN(PL)');
  });

  it('round-trips with parseEditionCode', () => {
    for (const code of ['PL', 'EN', 'DE', 'EN(PL)', 'DE(PL)']) {
      expect(formatEditionCode(parseEditionCode(code))).toBe(code);
    }
  });
});

describe('editionLabel', () => {
  const enPl = { editionLanguage: 'EN', hasPolishRules: true };
  const de = { editionLanguage: 'DE', hasPolishRules: false };
  const pl = { editionLanguage: 'PL', hasPolishRules: true };

  it('labels in Polish', () => {
    expect(editionLabel(enPl, 'pl')).toBe('angielski + polska instrukcja');
    expect(editionLabel(de, 'pl')).toBe('niemiecki');
    expect(editionLabel(pl, 'pl')).toBe('polski');
  });

  it('labels in English', () => {
    expect(editionLabel(enPl, 'en')).toBe('English + Polish rules');
    expect(editionLabel(de, 'en')).toBe('German');
    expect(editionLabel(pl, 'en')).toBe('Polish');
  });

  it('falls back to the raw code for unknown languages', () => {
    expect(editionLabel({ editionLanguage: 'FR', hasPolishRules: false }, 'en')).toBe('FR');
  });
});
