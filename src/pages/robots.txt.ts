import type { APIRoute } from 'astro';
import { withBase } from '@/i18n';

/**
 * Generowany (a nie w public/), bo adres sitemapy zależy od `site` + `base`.
 * Nie blokujemy crawlerów AI (GPTBot, ClaudeBot, PerplexityBot…) – zależy nam na GEO.
 * Crawlery czytają robots.txt tylko z korzenia domeny – działa, bo serwujemy z własnej domeny (`base: '/'`).
 */
export const GET: APIRoute = ({ site }) => {
  const sitemap = new URL(withBase('sitemap-index.xml'), site).toString();
  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${sitemap}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
