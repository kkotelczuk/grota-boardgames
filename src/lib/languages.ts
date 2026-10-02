/**
 * Kody języka wydania z CSV i ich etykiety – jedno miejsce mapowania.
 *
 * Konwencja z arkusza (potwierdzona przez właściciela):
 * - `PL`, `EN`, `DE` – język wydania,
 * - `X(PL)` i `X{PL}` – wydanie w języku X z polską instrukcją (różne nawiasy = ta sama informacja),
 * - `??` – traktujemy jak `EN(PL)`.
 */
export interface Edition {
  /** Kod ISO-ish języka wydania, wielkie litery (`PL`, `EN`, `DE`). */
  editionLanguage: string;
  /** Czy da się grać z polską instrukcją – `true` dla wydań PL i `X(PL)`. */
  hasPolishRules: boolean;
}

const WITH_PL_RULES = /^([A-Z]{2})\s*[({]\s*PL\s*[)}]$/;
const PLAIN = /^[A-Z]{2}$/;

export function parseEditionCode(raw: string): Edition {
  const code = raw.trim().toUpperCase();
  if (code === '??' || code === '') return { editionLanguage: 'EN', hasPolishRules: true };

  const withRules = WITH_PL_RULES.exec(code);
  if (withRules?.[1]) return { editionLanguage: withRules[1], hasPolishRules: true };

  if (PLAIN.test(code)) return { editionLanguage: code, hasPolishRules: code === 'PL' };

  throw new Error(`Nieznany kod języka wydania: "${raw}"`);
}

/** Kanoniczny zapis kodu, np. do raportu: `EN(PL)`. */
export function formatEditionCode({ editionLanguage, hasPolishRules }: Edition): string {
  return hasPolishRules && editionLanguage !== 'PL' ? `${editionLanguage}(PL)` : editionLanguage;
}

export type Locale = 'pl' | 'en';

const LANGUAGE_NAMES: Record<Locale, Record<string, string>> = {
  pl: { PL: 'polski', EN: 'angielski', DE: 'niemiecki' },
  en: { PL: 'Polish', EN: 'English', DE: 'German' },
};

export function languageName(code: string, locale: Locale): string {
  return LANGUAGE_NAMES[locale][code] ?? code;
}

/** Pełna etykieta wydania, np. „angielski + polska instrukcja”. */
export function editionLabel(edition: Edition, locale: Locale): string {
  const name = languageName(edition.editionLanguage, locale);
  if (!edition.hasPolishRules || edition.editionLanguage === 'PL') return name;
  return locale === 'pl' ? `${name} + polska instrukcja` : `${name} + Polish rules`;
}
