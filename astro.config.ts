import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// `site` i `base` z env, żeby przejście na własną domenę było zmianą konfiguracji, a nie kodu.
// Repo: github.com/kkotelczuk/grota-boardgames (GitHub project page).
const site = process.env.SITE_URL ?? 'https://kkotelczuk.github.io';
const base = process.env.BASE_PATH ?? '/grota-boardgames/';

export default defineConfig({
  site,
  base,
  output: 'static',
  trailingSlash: 'always',
  i18n: {
    locales: ['pl', 'en'],
    defaultLocale: 'pl',
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    vue(),
    sitemap({
      i18n: { defaultLocale: 'pl', locales: { pl: 'pl-PL', en: 'en-US' } },
      // Bez przekierowania i stron ulubionych (noindex – treść zależy od localStorage).
      filter: (page) => !/\/(discord|ulubione|favorites)\/$/.test(page),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
