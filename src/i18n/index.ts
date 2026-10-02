import type { Locale } from '@/lib/languages';
import { en } from './en.ts';
import { pl, type Dictionary } from './pl.ts';

export type { Dictionary, Locale };
export const locales: Locale[] = ['pl', 'en'];
export const defaultLocale: Locale = 'pl';

const dictionaries: Record<Locale, Dictionary> = { pl, en };
export const useTranslations = (locale: Locale): Dictionary => dictionaries[locale];

export const htmlLang: Record<Locale, string> = { pl: 'pl-PL', en: 'en' };
export const ogLocale: Record<Locale, string> = { pl: 'pl_PL', en: 'en_US' };

/**
 * Zlokalizowane ścieżki (bez `base`). Ta sama nazwa trasy w obu językach → przełącznik języka
 * i hreflang zawsze wiedzą, gdzie jest odpowiednik bieżącej strony.
 */
const routes = {
  home: { pl: '', en: 'en/' },
  game: { pl: 'gry/:slug/', en: 'en/games/:slug/' },
  favorites: { pl: 'ulubione/', en: 'en/favorites/' },
  about: { pl: 'o-grocie/', en: 'en/about/' },
  discord: { pl: 'discord/', en: 'discord/' },
} as const satisfies Record<string, Record<Locale, string>>;

export type RouteName = keyof typeof routes;
export interface RouteRef {
  name: RouteName;
  params?: { slug?: string };
}

/** `import.meta.env.BASE_URL` zawsze z końcowym `/` – strona może żyć pod `/<repo>/`. */
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  return `${base}${path.replace(/^\//, '')}`;
}

export function localizedPath({ name, params }: RouteRef, locale: Locale): string {
  const pattern: string = routes[name][locale];
  return withBase(pattern.replace(':slug', params?.slug ?? ''));
}

export const otherLocale = (locale: Locale): Locale => (locale === 'pl' ? 'en' : 'pl');
