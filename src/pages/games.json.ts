import type { APIRoute } from 'astro';
import { site } from '@/config/site';
import { gamePath, getAllGames } from '@/lib/data/games';

/**
 * Publiczny, maszynowo czytelny katalog kolekcji (GEO / integracje).
 * Bez pełnych opisów – tylko fakty i krótkie podsumowania; linki absolutne.
 */
export const GET: APIRoute = async ({ site: siteUrl }) => {
  const abs = (path: string) => new URL(path, siteUrl).toString();
  const games = await getAllGames();

  return Response.json({
    organization: {
      name: site.name,
      address: `${site.address.street}, ${site.address.city}, ${site.address.country}`,
      discord: site.discordInvite,
      note: 'Games are played on site at Grota; they are not lent out.',
    },
    count: games.length,
    games: games.map((g) => ({
      id: g.id,
      title: { pl: g.titlePl, original: g.titleOriginal },
      kind: g.kind,
      url: { pl: abs(gamePath(g, 'pl')), en: abs(gamePath(g, 'en')) },
      bgg: g.bggUrl,
      year: g.year,
      players: { min: g.minPlayers, max: g.maxPlayers, best: g.bestPlayers },
      playTime: { min: g.minPlayTime, max: g.maxPlayTime },
      minAge: g.minAge,
      weight: g.weight,
      rating: g.rating,
      categories: g.categories.map((c) => c.en),
      mechanics: g.mechanics.map((m) => m.en),
      summary: g.summary,
      copies: g.copies,
      baseGameIds: g.baseGameIds,
      expansionIds: g.expansionIds,
    })),
  });
};
