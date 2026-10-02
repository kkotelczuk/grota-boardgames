import { z } from 'zod';

/** Jeden fizyczny egzemplarz w Grocie (wiersz CSV). */
export const copySchema = z.object({
  localTitle: z.string().min(1),
  editionLanguage: z.string().min(2),
  hasPolishRules: z.boolean(),
});
export type Copy = z.infer<typeof copySchema>;

const termSchema = z.object({ id: z.number().int(), name: z.string() });
export type Term = z.infer<typeof termSchema>;

/** Powiązanie z grą spoza kolekcji (np. gra bazowa, której nie mamy). */
const externalRefSchema = z.object({ bggId: z.number().int(), name: z.string() });

/** Rekord gry pobranej z BGG – zawartość `src/data/games.json`. */
export const bggGameSchema = z.object({
  id: z.string(),
  bggId: z.number().int(),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  kind: z.enum(['base', 'expansion']),
  name: z.string(),
  alternateNames: z.array(z.string()),
  year: z.number().int().nullable(),
  minPlayers: z.number().int().nullable(),
  maxPlayers: z.number().int().nullable(),
  bestPlayers: z.array(z.number().int()),
  recommendedPlayers: z.array(z.number().int()),
  minPlayTime: z.number().int().nullable(),
  maxPlayTime: z.number().int().nullable(),
  minAge: z.number().int().nullable(),
  weight: z.number().nullable(),
  rating: z.number().nullable(),
  bayesRating: z.number().nullable(),
  usersRated: z.number().int(),
  rank: z.number().int().nullable(),
  categories: z.array(termSchema),
  mechanics: z.array(termSchema),
  designers: z.array(z.string()),
  publishers: z.array(z.string()),
  /** Gry bazowe obecne w kolekcji (id rekordów). */
  baseGameIds: z.array(z.string()),
  /** Dodatki obecne w kolekcji (id rekordów). */
  expansionIds: z.array(z.string()),
  /** Gry bazowe dodatku, których nie ma w Grocie. */
  externalBaseGames: z.array(externalRefSchema),
  /** Nazwa pliku w `src/assets/games/` albo `null`. */
  image: z.string().nullable(),
  /** Opis EN z BGG; akapity rozdzielone `\n\n`. */
  description: z.string(),
  /** Hash opisu – do wykrywania nieaktualnych tłumaczeń. */
  descriptionHash: z.string(),
  copies: z.array(copySchema).min(1),
  bggUrl: z.url(),
  source: z.literal('bgg'),
});
export type BggGame = z.infer<typeof bggGameSchema>;

export const bggGamesFileSchema = z.object({
  generatedAt: z.string(),
  games: z.array(bggGameSchema),
});
export type BggGamesFile = z.infer<typeof bggGamesFileSchema>;

/**
 * Wpis z `data/manual-games.yaml`. Celowo pobłażliwy: człowiek uzupełnia go stopniowo,
 * a build ma przejść także na niepełnych danych (braki → ostrzeżenie, nie błąd).
 */
const nullableInt = z.number().int().nullable().optional().default(null);
const localizedText = z
  .object({ pl: z.string().nullable().optional(), en: z.string().nullable().optional() })
  .nullable()
  .optional();

export const manualGameSchema = z.object({
  id: z.string().regex(/^manual-[a-z0-9-]+$/),
  title: z.string().min(1),
  originalTitle: z.string().nullable().optional(),
  kind: z.enum(['base', 'expansion']).catch('base'),
  baseGameId: z.string().nullable().optional(),
  copies: z.array(copySchema).min(1),
  sourceUrl: z.string().nullable().optional(),
  csvComment: z.string().nullable().optional(),
  year: nullableInt,
  minPlayers: nullableInt,
  maxPlayers: nullableInt,
  bestPlayers: z.array(z.number().int()).nullable().optional(),
  minPlayTime: nullableInt,
  maxPlayTime: nullableInt,
  minAge: nullableInt,
  weight: z.number().nullable().optional(),
  categories: z.array(z.number().int()).nullable().optional(),
  mechanics: z.array(z.number().int()).nullable().optional(),
  designers: z.array(z.string()).nullable().optional(),
  image: z.string().nullable().optional(),
  summary: localizedText,
  description: localizedText,
});
export type ManualGame = z.infer<typeof manualGameSchema>;

const localizedTermSchema = z.object({ id: z.number().int(), en: z.string(), pl: z.string() });
export type LocalizedTerm = z.infer<typeof localizedTermSchema>;

/**
 * Ujednolicony model gry używany przez strony – wynik scalenia BGG + plik ręczny + tłumaczenia.
 * To jest schemat kolekcji `games` (src/content.config.ts).
 */
export const gameSchema = z.object({
  id: z.string(),
  slug: z.string(),
  source: z.enum(['bgg', 'manual']),
  kind: z.enum(['base', 'expansion']),
  bggId: z.number().int().nullable(),
  bggUrl: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  /** Tytuł polskiego wydania (pierwszy egzemplarz). */
  titlePl: z.string(),
  /** Tytuł oryginalny (BGG). */
  titleOriginal: z.string(),
  alternateNames: z.array(z.string()),
  year: z.number().int().nullable(),
  minPlayers: z.number().int().nullable(),
  maxPlayers: z.number().int().nullable(),
  bestPlayers: z.array(z.number().int()),
  recommendedPlayers: z.array(z.number().int()),
  minPlayTime: z.number().int().nullable(),
  maxPlayTime: z.number().int().nullable(),
  minAge: z.number().int().nullable(),
  weight: z.number().nullable(),
  rating: z.number().nullable(),
  usersRated: z.number().int(),
  rank: z.number().int().nullable(),
  categories: z.array(localizedTermSchema),
  mechanics: z.array(localizedTermSchema),
  designers: z.array(z.string()),
  publishers: z.array(z.string()),
  baseGameIds: z.array(z.string()),
  expansionIds: z.array(z.string()),
  externalBaseGames: z.array(externalRefSchema),
  /** Klucz obrazu: `games/<plik>` (src/assets/games) albo `manual/<plik>` (data/manual-images). */
  image: z.string().nullable(),
  description: z.object({ pl: z.string().nullable(), en: z.string().nullable() }),
  summary: z.object({ pl: z.string().nullable(), en: z.string().nullable() }),
  copies: z.array(copySchema).min(1),
  /** Lista brakujących pól (gry ręczne) – do ostrzeżeń i ewentualnej adnotacji. */
  missing: z.array(z.string()),
});
export type Game = z.infer<typeof gameSchema>;
