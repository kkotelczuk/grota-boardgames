/**
 * `pnpm data:fetch` – pipeline danych (lokalnie, nigdy w CI):
 * CSV → BGG XML API (z cache) → okładki → src/data/games.json + data/manual-games.yaml + raport.
 *
 * Flagi:
 *   --refresh        pobierz wszystko od nowa (ignoruj cache XML i okładek)
 *   --id=1,2,3       odśwież tylko wskazane id BGG
 *   --offline        nie odpytuj BGG – zbuduj JSON z samego cache
 */
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { bggGamesFileSchema } from '../src/lib/schema.ts';
import { formatEditionCode } from '../src/lib/languages.ts';
import { BATCH_SIZE, chunk, createBggClient } from './lib/bgg-client.ts';
import { parseBggXml, splitItems, type BggItem } from './lib/bgg-xml.ts';
import { buildGames, resolveGameId, type Overrides } from './lib/build-games.ts';
import { parseGamesCsv } from './lib/csv.ts';
import { mergeManualFile } from './lib/manual-file.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const paths = {
  csv: path.join(ROOT, 'spis-gier.csv'),
  overrides: path.join(ROOT, 'data/bgg-overrides.json'),
  cache: path.join(ROOT, 'data/bgg-cache'),
  images: path.join(ROOT, 'src/assets/games'),
  gamesJson: path.join(ROOT, 'src/data/games.json'),
  manual: path.join(ROOT, 'data/manual-games.yaml'),
  translationsPl: path.join(ROOT, 'data/translations/pl.json'),
  summaries: path.join(ROOT, 'data/translations/summaries.json'),
  report: path.join(ROOT, 'data/fetch-report.md'),
};

/** Okładki skalujemy lokalnie – oryginały z BGG potrafią mieć kilka MB. Astro i tak generuje warianty. */
const IMAGE_MAX_EDGE = 1000;

const args = process.argv.slice(2);
const refreshAll = args.includes('--refresh');
const offline = args.includes('--offline');
const refreshIds = new Set(
  args
    .find((a) => a.startsWith('--id='))
    ?.slice(5)
    .split(',')
    .map(Number)
    .filter(Number.isFinite) ?? [],
);

const readJson = async <T>(file: string, fallback: T): Promise<T> =>
  existsSync(file) ? (JSON.parse(await readFile(file, 'utf8')) as T) : fallback;

const cacheFile = (id: number) => path.join(paths.cache, `${id}.xml`);

async function fetchMissing(ids: number[]) {
  const toFetch = ids.filter(
    (id) => refreshAll || refreshIds.has(id) || !existsSync(cacheFile(id)),
  );
  if (toFetch.length === 0) return { fetched: 0, notReturned: [] as number[] };
  if (offline) {
    console.warn(`⚠ --offline: pomijam ${toFetch.length} id bez cache`);
    return { fetched: 0, notReturned: [] };
  }

  const apiUrl = process.env['BGG_API_URL'];
  const apiKey = process.env['BGG_API_KEY'];
  if (!apiUrl || !apiKey)
    throw new Error('Brak BGG_API_URL / BGG_API_KEY w .env (patrz .env.example)');

  const client = createBggClient({ apiUrl, apiKey });
  const batches = chunk(toFetch, BATCH_SIZE);
  const notReturned: number[] = [];

  for (const [index, batch] of batches.entries()) {
    console.log(`BGG: paczka ${index + 1}/${batches.length} (${batch.length} id)`);
    const xml = await client.fetchThings(batch);
    const items = splitItems(xml);
    for (const id of batch) {
      const itemXml = items.get(id);
      if (itemXml) await writeFile(cacheFile(id), itemXml);
      else notReturned.push(id);
    }
  }
  return { fetched: toFetch.length - notReturned.length, notReturned };
}

async function loadCachedItems(ids: number[]) {
  const items = new Map<number, BggItem>();
  for (const id of ids) {
    if (!existsSync(cacheFile(id))) continue;
    const [item] = parseBggXml(await readFile(cacheFile(id), 'utf8'));
    if (item) items.set(id, item);
  }
  return items;
}

async function downloadImage(id: number, url: string): Promise<string | null> {
  const fileName = `${id}.webp`;
  const target = path.join(paths.images, fileName);
  if (existsSync(target) && !refreshAll && !refreshIds.has(id)) return fileName;
  if (offline) return null;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  await sharp(buffer)
    .resize({
      width: IMAGE_MAX_EDGE,
      height: IMAGE_MAX_EDGE,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .toFile(target);
  await new Promise((resolve) => setTimeout(resolve, 300));
  return fileName;
}

async function main() {
  await Promise.all(
    [paths.cache, paths.images, path.dirname(paths.gamesJson)].map((d) =>
      mkdir(d, { recursive: true }),
    ),
  );

  const rows = parseGamesCsv(await readFile(paths.csv, 'utf8'));
  const overrides = await readJson<Overrides>(paths.overrides, { versions: {} });
  const ids = [...new Set(rows.flatMap((row) => resolveGameId(row, overrides) ?? []))];

  const { fetched, notReturned } = await fetchMissing(ids);
  const items = await loadCachedItems(ids);
  const result = buildGames(rows, items, overrides);

  const imageErrors: string[] = [];
  for (const game of result.games) {
    const url = items.get(game.bggId)?.imageUrl;
    if (!url) continue;
    try {
      game.image = await downloadImage(game.bggId, url);
    } catch (error) {
      imageErrors.push(`${game.name} (${game.id}): ${(error as Error).message}`);
    }
  }

  const file = bggGamesFileSchema.parse({
    generatedAt: new Date().toISOString(),
    games: result.games,
  });
  await writeFile(paths.gamesJson, `${JSON.stringify(file, null, 2)}\n`);

  const manualBefore = existsSync(paths.manual) ? await readFile(paths.manual, 'utf8') : null;
  const manual = mergeManualFile(manualBefore, result.manual);
  await writeFile(paths.manual, manual.content);

  // Raport braków tłumaczeń (tłumaczenia są osobnym krokiem – patrz data/README.md).
  const translations = await readJson<Record<string, { sourceHash: string }>>(
    paths.translationsPl,
    {},
  );
  const summaries = await readJson<Record<string, { sourceHash: string }>>(paths.summaries, {});
  const missingTranslation = file.games.filter((g) => g.description && !translations[g.id]);
  const staleTranslation = file.games.filter(
    (g) => translations[g.id] && translations[g.id]?.sourceHash !== g.descriptionHash,
  );
  const missingSummary = file.games.filter((g) => !summaries[g.id]);

  const games = file.games;
  const expansions = games.filter((g) => g.kind === 'expansion');
  const orphanExpansions = expansions.filter((g) => g.baseGameIds.length === 0);
  const urlKindMismatch = rows.filter((row) => {
    const id = resolveGameId(row, overrides);
    const game = games.find((g) => g.bggId === id);
    return (
      row.bgg && game && (row.bgg.urlType === 'boardgameexpansion') !== (game.kind === 'expansion')
    );
  });
  const languageCounts = rows.reduce<Record<string, number>>((acc, row) => {
    const key = `${formatEditionCode(row)}${row.rawLanguage !== formatEditionCode(row) ? ` (w CSV: ${row.rawLanguage})` : ''}`;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const cachedCount = (await readdir(paths.cache)).filter((f) => f.endsWith('.xml')).length;

  const lines = [
    `# Raport pobrania danych BGG`,
    ``,
    `Wygenerowano: ${file.generatedAt}`,
    ``,
    `## Podsumowanie`,
    ``,
    `- Wiersze CSV: **${rows.length}**`,
    `- Gry z BGG (unikalne id): **${games.length}** – bazowe: ${games.length - expansions.length}, dodatki: ${expansions.length}`,
    `- Egzemplarze z BGG: ${games.reduce((n, g) => n + g.copies.length, 0)}`,
    `- Pobrane teraz z API: ${fetched} (w cache: ${cachedCount})`,
    `- Do pliku ręcznego: **${result.manual.length}** (nowo dopisane: ${manual.added.length})`,
    `- Okładki: ${games.filter((g) => g.image).length}/${games.length}`,
    ``,
    `## Języki wydań`,
    ``,
    ...Object.entries(languageCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([code, n]) => `- ${code}: ${n}`),
    ``,
    `## Duplikaty (scalone w egzemplarze)`,
    ``,
    ...(result.duplicates.length
      ? result.duplicates.map((d) => `- ${d.bggId}: ${d.titles.join(' · ')}`)
      : ['- brak']),
    ``,
    `## Dodatki bez gry bazowej w kolekcji (pokazywane jako samodzielne pozycje)`,
    ``,
    ...(orphanExpansions.length
      ? orphanExpansions.map(
          (g) =>
            `- ${g.copies[0]?.localTitle} → ${g.name} (${g.id}); baza w BGG: ${g.externalBaseGames.map((b) => `${b.name} (${b.bggId})`).join(', ') || '—'}`,
        )
      : ['- brak']),
    ``,
    `## Typ z API różny od typu z URL-a`,
    ``,
    ...(urlKindMismatch.length
      ? urlKindMismatch.map(
          (r) =>
            `- ${r.localTitle}: URL \`${r.bgg?.urlType}\`, API: ${games.find((g) => g.bggId === resolveGameId(r, overrides))?.kind}`,
        )
      : ['- brak']),
    ``,
    `## Plik ręczny (data/manual-games.yaml)`,
    ``,
    ...(result.manual.length
      ? result.manual.map((m) => `- ${m.row.localTitle} – ${m.reason}`)
      : ['- brak']),
    ``,
    `## Błędy i ostrzeżenia`,
    ``,
    ...[
      ...notReturned.map((id) => `- BGG nie zwróciło id ${id}`),
      ...imageErrors.map((e) => `- Okładka: ${e}`),
      ...result.warnings.map((w) => `- ${w}`),
    ],
    ...(notReturned.length + imageErrors.length + result.warnings.length === 0 ? ['- brak'] : []),
    ``,
    `## Tłumaczenia`,
    ``,
    `- Brak tłumaczenia opisu PL: ${missingTranslation.length}`,
    `- Nieaktualne tłumaczenia (zmienił się opis EN): ${staleTranslation.length}${staleTranslation.length ? ` – ${staleTranslation.map((g) => g.id).join(', ')}` : ''}`,
    `- Brak podsumowania PL/EN: ${missingSummary.length}`,
    ``,
  ];

  await writeFile(paths.report, lines.join('\n'));
  console.log(`\n${lines.join('\n')}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
