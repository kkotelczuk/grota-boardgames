import { parse } from 'csv-parse/sync';
import { parseEditionCode, type Edition } from '../../src/lib/languages.ts';

export type BggUrlType = 'boardgame' | 'boardgameexpansion' | 'boardgameversion';

export interface BggRef {
  id: number;
  /** Typ z URL-a – tylko informacyjnie. Faktyczny typ (baza/dodatek) ustala odpowiedź API. */
  urlType: BggUrlType;
}

export interface CsvRow extends Edition {
  /** Numer wiersza w pliku (1 = nagłówek), do komunikatów. */
  line: number;
  localTitle: string;
  rawLanguage: string;
  url: string;
  bgg: BggRef | null;
  comment: string | null;
}

const BGG_URL =
  /^https?:\/\/(?:www\.)?boardgamegeek\.com\/(boardgame|boardgameexpansion|boardgameversion)\/(\d+)/i;

export function parseBggUrl(url: string): BggRef | null {
  const match = BGG_URL.exec(url.trim());
  if (!match?.[1] || !match[2]) return null;
  return { urlType: match[1].toLowerCase() as BggUrlType, id: Number(match[2]) };
}

/**
 * Parsuje `spis-gier.csv`. Kolumny są brane pozycyjnie, bo nagłówki są niechlujne
 * (`Język ` ze spacją, czwarta kolumna bez nazwy).
 */
export function parseGamesCsv(content: string): CsvRow[] {
  // Typy csv-parse nie zawężają wyniku dla `info: true`, stąd jawne rzutowanie.
  const records = parse(content, {
    bom: true,
    info: true,
    relax_column_count: true,
    skip_empty_lines: true,
    trim: true,
  }) as unknown as { record: string[]; info: { lines: number } }[];

  return records.slice(1).flatMap(({ record, info }) => {
    const [title = '', language = '', url = '', comment = ''] = record;
    if (!title) return [];
    return [
      {
        line: info.lines,
        localTitle: title,
        rawLanguage: language,
        ...parseEditionCode(language),
        url,
        bgg: parseBggUrl(url),
        comment: comment || null,
      },
    ];
  });
}
