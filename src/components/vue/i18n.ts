import { inject, provide, type InjectionKey } from 'vue';
import { useTranslations, type Dictionary, type Locale } from '@/i18n';

export interface I18nContext {
  locale: Locale;
  t: Dictionary;
}

/*
 * [Vue] Typowany InjectionKey: `inject(I18N)` zwraca `I18nContext | undefined` bez rzutowań.
 * Słownik zawiera funkcje (odmiana przez liczby), więc NIE da się go przekazać z Astro jako
 * props wyspy (props są serializowane do JSON-a). Wyspa dostaje tylko `locale: 'pl' | 'en'`,
 * a słownik importuje sama i udostępnia potomkom przez provide/inject.
 */
export const I18N: InjectionKey<I18nContext> = Symbol('i18n');

/** Wywoływane w komponencie-korzeniu wyspy. */
export function provideI18n(locale: Locale): I18nContext {
  const context = { locale, t: useTranslations(locale) };
  provide(I18N, context);
  return context;
}

/**
 * W komponentach potomnych. `fallbackLocale` pozwala użyć komponentu także jako
 * samodzielnej wyspy (np. FavoriteButton na stronie gry), gdzie nikt nie zrobił provide.
 */
export function useI18n(fallbackLocale?: Locale): I18nContext {
  const context = inject(I18N, null);
  if (context) return context;
  if (fallbackLocale) return { locale: fallbackLocale, t: useTranslations(fallbackLocale) };
  throw new Error('useI18n(): brak provideI18n() w drzewie i brak fallbackLocale');
}
