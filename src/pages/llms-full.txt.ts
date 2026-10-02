import type { APIRoute } from 'astro';
import { getAllGames } from '@/lib/data/games';
import { llmsFullTxt } from '@/lib/seo/llms';

export const GET: APIRoute = async ({ site }) =>
  new Response(llmsFullTxt(site!, await getAllGames()), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
