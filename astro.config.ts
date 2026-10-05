import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// `site` i `base` z env, żeby przejście na własną domenę było zmianą konfiguracji, a nie kodu.
// Repo: github.com/kkotelczuk/grota-boardgames (GitHub Pages z własną domeną, patrz public/CNAME).
// `||`, nie `??`: nieustawiona zmienna repo w GitHub Actions trafia do env jako pusty string.
const site = process.env.SITE_URL || 'https://grota.bialystok.pl';
const base = process.env.BASE_PATH || '/';

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
      i18n: { defaultLocale: 'pl', locales: { pl: 'pl-PL', en: 'en' } },
      // Bez przekierowania, stron ulubionych (noindex – treść zależy od localStorage) i generatora
      // grafik (strona za hasłem, tylko dla części osób).
      filter: (page) => !/\/(discord|ulubione|favorites|generator)\/$/.test(page),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
