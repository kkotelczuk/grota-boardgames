export type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };

const rulesCache = new Map<string, Intl.PluralRules>();

/**
 * Odmiana przez liczby wg CLDR: PL ma formy one/few/many („1 gra, 2 gry, 5 gier”),
 * EN – one/other. `{n}` w szablonie zastępowane liczbą.
 */
export function plural(locale: string, count: number, forms: PluralForms): string {
  let rules = rulesCache.get(locale);
  if (!rules) {
    rules = new Intl.PluralRules(locale);
    rulesCache.set(locale, rules);
  }
  const template = forms[rules.select(count)] ?? forms.other;
  return template.replace('{n}', String(count));
}
