import type { APIRoute } from 'astro';
import { withBase } from '@/i18n';

/** Manifest z adresami zależnymi od `base` (dlatego endpoint, a nie plik w public/). */
export const GET: APIRoute = () =>
  Response.json({
    name: 'Grota – gry planszowe w Białymstoku',
    short_name: 'Grota',
    lang: 'pl',
    start_url: withBase(''),
    scope: withBase(''),
    display: 'standalone',
    background_color: '#f6f1e7',
    theme_color: '#f6f1e7',
    icons: [
      { src: withBase('icon-192.png'), sizes: '192x192', type: 'image/png' },
      { src: withBase('icon-512.png'), sizes: '512x512', type: 'image/png' },
      {
        src: withBase('icon-maskable-512.png'),
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  });
