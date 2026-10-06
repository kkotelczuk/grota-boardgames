/**
 * Łamanie tekstu na canvasie (canvas sam nie zawija linii).
 */
const ELLIPSIS = '…';

/** Łamie tekst po słowach; słowo dłuższe niż linia jest łamane po znakach. */
export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const fits = (s: string) => ctx.measureText(s).width <= maxWidth;
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (fits(candidate)) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = '';
    if (fits(word)) {
      line = word;
      continue;
    }
    for (const char of word) {
      if (line && !fits(line + char)) {
        lines.push(line);
        line = char;
      } else {
        line += char;
      }
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Jak `wrapText`, ale maks. `maxLines` linii – nadmiar ucięty „…” w ostatniej. */
export function clampLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const lines = wrapText(ctx, text, maxWidth);
  if (lines.length <= maxLines) return lines;
  let last = lines.slice(maxLines - 1).join(' ');
  while (last && ctx.measureText(last + ELLIPSIS).width > maxWidth) last = last.slice(0, -1);
  return [...lines.slice(0, maxLines - 1), last.trimEnd() + ELLIPSIS];
}
