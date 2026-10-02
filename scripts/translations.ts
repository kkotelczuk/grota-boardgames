/**
 * Pomocnik do tłumaczeń (opisy PL, podsumowania PL/EN, słownik terminów BGG).
 *
 *   pnpm translations export <dir> [--chunks=8]   paczki z brakującymi/nieaktualnymi pozycjami
 *   pnpm translations import <dir>                scala `out-*.json` z katalogu do data/translations/
 *   pnpm translations terms <dir>                 eksport terminów BGG bez polskiej nazwy
 *
 * Format paczki wejściowej (`chunk-N.json`): `[{ id, name, localTitles, kind, sourceHash, description }]`.
 * Format wyniku (`out-N.json`): `{ "<id>": { sourceHash, description, summaryPl, summaryEn } }`.
 * Terminy: wejście `terms.json` `{ "<id>": "English" }`, wynik `terms-out.json` `{ "<id>": "polski" }`.
 */
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { bggGamesFileSchema, type BggGame } from '../src/lib/schema.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const paths = {
  games: path.join(ROOT, 'src/data/games.json'),
  pl: path.join(ROOT, 'data/translations/pl.json'),
  summaries: path.join(ROOT, 'data/translations/summaries.json'),
  terms: path.join(ROOT, 'data/translations/bgg-terms.pl.json'),
};

type PlFile = Record<string, { sourceHash: string; description: string }>;
type SummariesFile = Record<string, { sourceHash: string; pl: string; en: string }>;
type TermsFile = Record<string, string>;
interface OutEntry {
  sourceHash: string;
  description: string;
  summaryPl: string;
  summaryEn: string;
}

const readJson = async <T>(file: string, fallback: T): Promise<T> =>
  existsSync(file) ? (JSON.parse(await readFile(file, 'utf8')) as T) : fallback;
const writeJson = (file: string, data: unknown) =>
  writeFile(file, `${JSON.stringify(data, null, 2)}\n`);

/** Klucze posortowane numerycznie – stabilne diffy w gicie. */
const sortById = <T>(record: Record<string, T>) =>
  Object.fromEntries(Object.entries(record).sort(([a], [b]) => Number(a) - Number(b)));

async function loadGames(): Promise<BggGame[]> {
  return bggGamesFileSchema.parse(JSON.parse(await readFile(paths.games, 'utf8'))).games;
}

async function exportChunks(dir: string, chunks: number) {
  const [games, pl, summaries] = await Promise.all([
    loadGames(),
    readJson<PlFile>(paths.pl, {}),
    readJson<SummariesFile>(paths.summaries, {}),
  ]);
  const todo = games.filter(
    (g) =>
      pl[g.id]?.sourceHash !== g.descriptionHash ||
      summaries[g.id]?.sourceHash !== g.descriptionHash,
  );

  // Zachłanne równoważenie paczek wg długości opisu.
  const buckets = Array.from({ length: Math.min(chunks, todo.length) }, () => ({
    size: 0,
    items: [] as unknown[],
  }));
  for (const game of [...todo].sort((a, b) => b.description.length - a.description.length)) {
    const bucket = buckets.reduce((min, b) => (b.size < min.size ? b : min));
    bucket.size += game.description.length;
    bucket.items.push({
      id: game.id,
      name: game.name,
      localTitles: [...new Set(game.copies.map((c) => c.localTitle))],
      kind: game.kind,
      sourceHash: game.descriptionHash,
      description: game.description,
    });
  }

  await mkdir(dir, { recursive: true });
  for (const [i, bucket] of buckets.entries()) {
    await writeJson(path.join(dir, `chunk-${i + 1}.json`), bucket.items);
    console.log(`chunk-${i + 1}.json: ${bucket.items.length} gier, ${bucket.size} znaków`);
  }
}

async function exportTerms(dir: string) {
  const [games, terms] = await Promise.all([loadGames(), readJson<TermsFile>(paths.terms, {})]);
  const missing: TermsFile = {};
  for (const game of games) {
    for (const term of [...game.categories, ...game.mechanics]) {
      if (!terms[term.id]) missing[term.id] = term.name;
    }
  }
  await mkdir(dir, { recursive: true });
  await writeJson(path.join(dir, 'terms.json'), sortById(missing));
  console.log(`terms.json: ${Object.keys(missing).length} terminów`);
}

async function importDir(dir: string) {
  const [games, pl, summaries, terms] = await Promise.all([
    loadGames(),
    readJson<PlFile>(paths.pl, {}),
    readJson<SummariesFile>(paths.summaries, {}),
    readJson<TermsFile>(paths.terms, {}),
  ]);
  const byId = new Map(games.map((g) => [g.id, g]));
  const problems: string[] = [];
  let imported = 0;

  for (const file of (await readdir(dir)).filter((f) => /^out-\d+\.json$/.test(f))) {
    const out = JSON.parse(await readFile(path.join(dir, file), 'utf8')) as Record<
      string,
      OutEntry
    >;
    for (const [id, entry] of Object.entries(out)) {
      const game = byId.get(id);
      if (!game) problems.push(`${file}: nieznane id ${id}`);
      else if (entry.sourceHash !== game.descriptionHash)
        problems.push(`${file}: ${id} – hash nie pasuje`);
      else if (!entry.description?.trim() || !entry.summaryPl?.trim() || !entry.summaryEn?.trim())
        problems.push(`${file}: ${id} – puste pole`);
      else {
        pl[id] = { sourceHash: entry.sourceHash, description: entry.description.trim() };
        summaries[id] = {
          sourceHash: entry.sourceHash,
          pl: entry.summaryPl.trim(),
          en: entry.summaryEn.trim(),
        };
        imported++;
      }
    }
  }

  const termsOut = path.join(dir, 'terms-out.json');
  if (existsSync(termsOut)) Object.assign(terms, await readJson<TermsFile>(termsOut, {}));

  await mkdir(path.dirname(paths.pl), { recursive: true });
  await Promise.all([
    writeJson(paths.pl, sortById(pl)),
    writeJson(paths.summaries, sortById(summaries)),
    writeJson(paths.terms, sortById(terms)),
  ]);

  const missing = games.filter((g) => !pl[g.id] || !summaries[g.id]).map((g) => g.id);
  console.log(`Zaimportowano: ${imported}. Brakuje: ${missing.length} ${missing.join(', ')}`);
  for (const problem of problems) console.warn(`⚠ ${problem}`);
}

const [command, dir, ...rest] = process.argv.slice(2);
const chunks = Number(rest.find((a) => a.startsWith('--chunks='))?.slice(9) ?? 8);

if (!dir || !['export', 'import', 'terms'].includes(command ?? '')) {
  console.error('Użycie: pnpm translations <export|import|terms> <katalog> [--chunks=8]');
  process.exit(1);
}
await (command === 'export'
  ? exportChunks(dir, chunks)
  : command === 'terms'
    ? exportTerms(dir)
    : importDir(dir));
