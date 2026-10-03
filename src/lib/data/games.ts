/**
 * Dostęp do danych gier po stronie Astro (build-time). Nie importować w komponentach Vue.
 */
import path from 'node:path';
import sharp from 'sharp';
import { getCollection } from 'astro:content';
import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';
import { localizedPath, type Locale } from '@/i18n';
import { languageName } from '@/lib/languages';
import { normalizeForSearch } from '@/lib/text';
import type { Game } from '@/lib/schema';
import type { CoverImage, FilterOptions, GameIndexItem, TermOption } from '@/lib/game-index';

// Okładki z BGG i obrazy dodane ręcznie – rozwiązywane przez Vite, żeby astro:assets je optymalizował.
const bggCovers = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/games/*.{webp,jpg,png}',
  {
    eager: true,
  },
);
const manualCovers = import.meta.glob<{ default: ImageMetadata }>(
  '/data/manual-images/*.{webp,jpg,jpeg,png}',
  {
    eager: true,
  },
);

export function coverImage(game: Pick<Game, 'image'>): ImageMetadata | null {
  if (!game.image) return null;
  const [folder, file] = game.image.split('/');
  const module =
    folder === 'games'
      ? bggCovers[`/src/assets/games/${file}`]
      : manualCovers[`/data/manual-images/${file}`];
  return module?.default ?? null;
}

let cache: Game[] | undefined;

/** Wszystkie gry, posortowane po polskim tytule (stabilna kolejność w HTML). */
export async function getAllGames(): Promise<Game[]> {
  if (!cache) {
    const collator = new Intl.Collator('pl');
    cache = (await getCollection('games'))
      .map((entry) => entry.data)
      .sort((a, b) => collator.compare(a.titlePl, b.titlePl));
  }
  return cache;
}

export async function getGamesById(): Promise<Map<string, Game>> {
  return new Map((await getAllGames()).map((g) => [g.id, g]));
}

/** PL: tytuł polskiego wydania; EN: nazwa z BGG. */
export function gameTitle(game: Game, locale: Locale): string {
  return locale === 'pl' ? game.titlePl : game.titleOriginal;
}

/** Tytuł drugorzędny – pokazywany tylko, gdy różni się od głównego. */
export function gameSubtitle(game: Game, locale: Locale): string | null {
  const other = locale === 'pl' ? game.titleOriginal : game.titlePl;
  return normalizeForSearch(other) === normalizeForSearch(gameTitle(game, locale)) ? null : other;
}

export const gamePath = (game: Pick<Game, 'slug'>, locale: Locale) =>
  localizedPath({ name: 'game', params: { slug: game.slug } }, locale);

/** Do wyszukiwania bierzemy tylko nazwy alternatywne w alfabecie łacińskim – reszta tylko puchnie w HTML. */
const LATIN = /^[\p{Script=Latin}\p{Number}\p{Punctuation}\p{Symbol}\s]+$/u;

/** Plik źródłowy okładki na dysku (build-time) – do wyliczenia koloru placeholdera. */
function coverSourcePath(game: Pick<Game, 'image'>): string | null {
  if (!game.image) return null;
  const [folder, file] = game.image.split('/');
  return folder === 'games'
    ? path.join(process.cwd(), 'src/assets/games', file!)
    : path.join(process.cwd(), 'data/manual-images', file!);
}

const colorCache = new Map<string, Promise<string>>();

/** Średni kolor okładki (obraz zmniejszony do 1×1 px). Liczony raz na plik, wspólny dla obu języków. */
function averageColor(file: string): Promise<string> {
  let color = colorCache.get(file);
  if (!color) {
    color = sharp(file)
      .removeAlpha()
      .resize(1, 1)
      .raw()
      .toBuffer()
      .then((rgb) => `#${[...rgb].map((v) => v.toString(16).padStart(2, '0')).join('')}`);
    colorCache.set(file, color);
  }
  return color;
}

export async function cardCover(game: Game): Promise<CoverImage | null> {
  const image = coverImage(game);
  const file = coverSourcePath(game);
  if (!image || !file) return null;
  // Na mobile okładka ma 104 px CSS → przy DPR 2–3 przeglądarka bierze 320w; na desktopie
  // (≤ 240 px CSS) 320w/480w. Każdy wpis w srcset to dodatkowe bajty w zserializowanych
  // propsach wyspy, powielone ×252 – stąd tylko dwie szerokości na format.
  const widths = [320, 480];
  const [webp, avif, color] = await Promise.all([
    getImage({ src: image, widths, width: 320, format: 'webp' }),
    getImage({ src: image, widths, width: 320, format: 'avif' }),
    averageColor(file),
  ]);
  return {
    src: webp.src,
    srcset: webp.srcSet.attribute,
    avifSrcset: avif.srcSet.attribute,
    width: Number(webp.attributes['width']),
    height: Number(webp.attributes['height']),
    color,
  };
}

export async function toIndexItem(game: Game, locale: Locale): Promise<GameIndexItem> {
  const titles = [game.titlePl, game.titleOriginal, ...game.copies.map((c) => c.localTitle)];
  const alternates = game.alternateNames.filter((name) => LATIN.test(name));
  const search = [...new Set([...titles, ...alternates].map(normalizeForSearch))].join(' | ');

  return {
    id: game.id,
    href: gamePath(game, locale),
    kind: game.kind,
    title: gameTitle(game, locale),
    subtitle: gameSubtitle(game, locale),
    search,
    minPlayers: game.minPlayers,
    maxPlayers: game.maxPlayers,
    bestPlayers: game.bestPlayers,
    minPlayTime: game.minPlayTime,
    maxPlayTime: game.maxPlayTime,
    minAge: game.minAge,
    weight: game.weight,
    rating: game.rating,
    rank: game.rank,
    year: game.year,
    languages: [...new Set(game.copies.map((c) => c.editionLanguage))],
    hasPolishRules: game.copies.some((c) => c.hasPolishRules),
    copies: game.copies.length,
    categories: game.categories.map((t) => t.id),
    mechanics: game.mechanics.map((t) => t.id),
    baseGameIds: game.baseGameIds,
    expansionIds: game.expansionIds,
    cover: await cardCover(game),
  };
}

export async function buildIndex(locale: Locale, games?: Game[]): Promise<GameIndexItem[]> {
  return Promise.all((games ?? (await getAllGames())).map((g) => toIndexItem(g, locale)));
}

export function buildFilterOptions(games: Game[], locale: Locale): FilterOptions {
  const collator = new Intl.Collator(locale);
  const terms = (pick: (g: Game) => Game['categories']): TermOption[] => {
    const map = new Map<number, TermOption>();
    for (const term of games.flatMap(pick)) {
      const option = map.get(term.id) ?? { id: term.id, label: term[locale], count: 0 };
      option.count++;
      map.set(term.id, option);
    }
    // Najpierw najczęstsze – w UI pokazujemy pierwsze kilkanaście, resztę po „Pokaż więcej”.
    return [...map.values()].sort(
      (a, b) => b.count - a.count || collator.compare(a.label, b.label),
    );
  };

  const languageCounts = new Map<string, number>();
  for (const game of games) {
    for (const code of new Set(game.copies.map((c) => c.editionLanguage))) {
      languageCounts.set(code, (languageCounts.get(code) ?? 0) + 1);
    }
  }

  return {
    languages: [...languageCounts]
      .sort((a, b) => b[1] - a[1])
      .map(([code, count]) => ({ code, label: languageName(code, locale), count })),
    categories: terms((g) => g.categories.filter((t) => t.id !== 1042)), // 1042 = „Expansion for Base-game”
    mechanics: terms((g) => g.mechanics),
  };
}

/** „Podobne gry w Grocie”: wspólne kategorie i mechaniki (mechaniki ważą więcej), bez dodatków tej gry. */
export function similarGames(game: Game, games: Game[], limit = 6): Game[] {
  const categories = new Set(game.categories.map((t) => t.id));
  const mechanics = new Set(game.mechanics.map((t) => t.id));
  const related = new Set([game.id, ...game.expansionIds, ...game.baseGameIds]);

  return games
    .filter((other) => !related.has(other.id) && other.kind === 'base')
    .map((other) => ({
      other,
      score:
        other.categories.filter((t) => categories.has(t.id)).length +
        other.mechanics.filter((t) => mechanics.has(t.id)).length * 1.5,
    }))
    .filter(({ score }) => score >= 3)
    .sort((a, b) => b.score - a.score || (b.other.rating ?? 0) - (a.other.rating ?? 0))
    .slice(0, limit)
    .map(({ other }) => other);
}
