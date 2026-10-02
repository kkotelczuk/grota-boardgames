/**
 * Normalizacja tekstu do wyszukiwania: małe litery, bez znaków diakrytycznych.
 * „Złodziej” → „zlodziej”. `ł` nie rozkłada się w NFD, więc obsługujemy je osobno.
 */
export function normalizeForSearch(text: string): string {
  return text
    .toLocaleLowerCase('pl')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/ł/g, 'l')
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim();
}

/** Slug ASCII z dowolnego tytułu: „Star Wars: Outer Rim” → `star-wars-outer-rim`. */
export function slugify(text: string): string {
  return normalizeForSearch(text)
    .replace(/[^a-z0-9 ]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}
