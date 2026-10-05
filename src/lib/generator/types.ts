/**
 * Typy generatora grafik. Moduł „client-safe” (bez astro:*, node:*) – używany i w Astro, i w wyspie.
 */
export interface GeneratorGame {
  id: string;
  /** PL: tytuł polskiego wydania, EN: tytuł z BGG. */
  title: string;
  /** Tytuł drugorzędny – tylko do listy wyników wyszukiwania. */
  subtitle: string | null;
  /** Znormalizowane tytuły + nazwy alternatywne (jak w `GameIndexItem.search`). */
  search: string;
  /** Okładka 480 px WebP z tej samej domeny (canvas nie zostaje „brudny”). */
  cover: string | null;
}

/** Pozycja na grafice: gra z kolekcji albo spoza niej (obrazek z urządzenia). */
export type SelectedItem =
  | { key: string; source: 'catalog'; title: string; cover: string | null }
  | { key: string; source: 'custom'; title: string; /** `blob:` URL */ cover: string };
