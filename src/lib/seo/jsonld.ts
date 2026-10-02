/**
 * Buildery JSON-LD (schema.org). Jedno źródło danych organizacji: src/config/site.ts (spójny NAP).
 */
import { site } from '@/config/site';
import type { Locale } from '@/lib/languages';
import type { Game } from '@/lib/schema';

type JsonLd = Record<string, unknown>;

export const absoluteUrl = (path: string, base: URL | string) => new URL(path, base).toString();

const orgId = (siteUrl: string) => `${siteUrl}#organization`;

export function organizationLd(
  siteUrl: string,
  homeUrl: string,
  logoUrl: string,
  locale: Locale,
): JsonLd {
  return {
    '@type': ['Organization', 'NGO'],
    '@id': orgId(siteUrl),
    name: site.name,
    alternateName: [site.shortName, 'BGP Grota', 'Białostocka Grupa Planszówkowa'],
    description:
      locale === 'pl'
        ? 'Stowarzyszenie z Białegostoku, w którym gra się na miejscu w gry planszowe, karciane, wojenne i imprezowe.'
        : 'An association in Białystok, Poland, where people meet to play board games, card games, wargames and party games on site.',
    url: homeUrl,
    logo: logoUrl,
    address: {
      '@type': 'PostalAddress',
      streetAddress: site.address.street,
      addressLocality: site.address.city,
      addressRegion: site.address.region,
      addressCountry: site.address.country,
      ...(site.address.postalCode ? { postalCode: site.address.postalCode } : {}),
    },
    sameAs: [site.discordInvite],
  };
}

export function websiteLd(siteUrl: string, homeUrl: string, locale: Locale): JsonLd {
  return {
    '@type': 'WebSite',
    '@id': `${siteUrl}#website`,
    name: locale === 'pl' ? 'Gry w Grocie' : 'Games at Grota',
    url: homeUrl,
    inLanguage: locale === 'pl' ? 'pl-PL' : 'en',
    publisher: { '@id': orgId(siteUrl) },
  };
}

export function itemListLd(items: { name: string; url: string }[]): JsonLd {
  return {
    '@type': 'ItemList',
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: item.url,
    })),
  };
}

export function breadcrumbLd(items: { name: string; url: string }[]): JsonLd {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function gameLd(
  game: Game,
  {
    name,
    url,
    description,
    image,
    locale,
    siteUrl,
  }: {
    name: string;
    url: string;
    description: string;
    image: string | null;
    locale: Locale;
    siteUrl: string;
  },
): JsonLd {
  return {
    '@type': 'Game',
    name,
    ...(game.titleOriginal !== name ? { alternateName: game.titleOriginal } : {}),
    url,
    description,
    inLanguage: locale === 'pl' ? 'pl-PL' : 'en',
    ...(image ? { image } : {}),
    ...(game.year ? { datePublished: String(game.year) } : {}),
    ...(game.minPlayers || game.maxPlayers
      ? {
          numberOfPlayers: {
            '@type': 'QuantitativeValue',
            ...(game.minPlayers ? { minValue: game.minPlayers } : {}),
            ...(game.maxPlayers ? { maxValue: game.maxPlayers } : {}),
          },
        }
      : {}),
    ...(game.minAge ? { typicalAgeRange: `${game.minAge}-` } : {}),
    ...(game.designers.length
      ? { author: game.designers.map((d) => ({ '@type': 'Person', name: d })) }
      : {}),
    ...(game.publishers.length
      ? { publisher: { '@type': 'Organization', name: game.publishers[0] } }
      : {}),
    ...(game.bggUrl ? { sameAs: game.bggUrl } : {}),
    genre: game.categories.map((c) => c[locale]),
    // Gdzie można zagrać: Grota (spójne @id organizacji).
    provider: { '@id': orgId(siteUrl) },
  };
}

export function faqPageLd(items: { question: string; answer: string }[]): JsonLd {
  return {
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}

/** Graf JSON-LD w jednym <script> – encje mogą się wzajemnie referować przez @id. */
export const graph = (nodes: JsonLd[]) => ({ '@context': 'https://schema.org', '@graph': nodes });
