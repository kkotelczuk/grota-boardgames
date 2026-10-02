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
