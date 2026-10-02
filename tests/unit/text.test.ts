import { describe, expect, it } from 'vitest';
import { normalizeForSearch, slugify } from '@/lib/text.ts';

describe('normalizeForSearch', () => {
  it('strips Polish diacritics, including ł', () => {
    expect(normalizeForSearch('Złodziej')).toBe('zlodziej');
    expect(normalizeForSearch('ŻÓŁĆ')).toBe('zolc');
  });

  it('collapses punctuation and whitespace into single spaces', () => {
    expect(normalizeForSearch('  Catan:  Miasta   i --- Rycerze! ')).toBe('catan miasta i rycerze');
  });
});

describe('slugify', () => {
  it('builds an ASCII slug', () => {
    expect(slugify('Star Wars: Outer Rim – Unfinished Business')).toBe(
      'star-wars-outer-rim-unfinished-business',
    );
    expect(slugify('Złodziej Ćwiczeń')).toBe('zlodziej-cwiczen');
  });

  it('returns an empty string when nothing usable remains', () => {
    expect(slugify('!!! ???')).toBe('');
  });
});
