/**
 * Dane dla generatora grafik (build-time, Astro). Nie importować w komponentach Vue.
 */
import { getImage } from 'astro:assets';
import type { Locale } from '@/i18n';
import type { GeneratorGame } from '@/lib/generator/types';
import logoBlack from '@/assets/brand/bgp_grota.png';
import { coverImage, gameSubtitle, gameTitle, getAllGames, searchText } from './games';

/**
 * Tylko gry bazowe, odchudzone do tego, czego potrzebuje generator (bez srcsetów i filtrów
 * z `GameIndexItem`). Okładki z `getImage`, a nie z BGG: obrazki z tej samej domeny nie
 * „brudzą” canvasa (tainted canvas blokuje `toBlob`, czyli eksport PNG).
 */
export async function buildGeneratorIndex(locale: Locale): Promise<GeneratorGame[]> {
  const games = (await getAllGames()).filter((game) => game.kind === 'base');
  const collator = new Intl.Collator(locale);
  const items = await Promise.all(
    games.map(async (game): Promise<GeneratorGame> => {
      const image = coverImage(game);
      return {
        id: game.id,
        title: gameTitle(game, locale),
        subtitle: gameSubtitle(game, locale),
        search: searchText(game),
        cover: image ? (await getImage({ src: image, width: 480, format: 'webp' })).src : null,
      };
    }),
  );
  return items.sort((a, b) => collator.compare(a.title, b.title));
}

/** Czarne logo (jasne tło grafiki) – PNG z przezroczystością. */
export async function generatorLogoUrl(): Promise<string> {
  return (await getImage({ src: logoBlack, width: 320, format: 'png' })).src;
}
