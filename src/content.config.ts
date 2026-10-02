import { defineCollection } from 'astro:content';
import { gameSchema } from './lib/schema.ts';
import { loadGames } from './lib/data/load-games.ts';

/**
 * Kolekcja `games` – inline loader Content Layer API. Scala BGG + plik ręczny + tłumaczenia
 * (src/lib/data/load-games.ts), a Astro waliduje każdy wpis schematem zod.
 */
const games = defineCollection({
  loader: async () => {
    const { games, warnings } = loadGames();
    // Ostrzeżenia, nie błędy: niepełne dane ręczne nie mogą wywalić buildu.
    if (warnings.length) {
      console.warn(`[games] ${warnings.length} ostrzeżeń dot. danych:`);
      for (const warning of warnings.slice(0, 15)) console.warn(`  - ${warning}`);
      if (warnings.length > 15) console.warn(`  … i ${warnings.length - 15} kolejnych`);
    }
    return games;
  },
  schema: gameSchema,
});

export const collections = { games };
