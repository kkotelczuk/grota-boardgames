/**
 * Rozmycie całego canvasa (tło pod szkłem, zdjęcie tła).
 *
 * `ctx.filter` działa w Chrome i Firefoksie, ale nie we wszystkich Safari – tam pomniejszamy
 * obraz i powiększamy go z wygładzaniem. Przy dużych promieniach (szkło: 28 px) efekt jest
 * prawie nie do odróżnienia.
 */
import { context2d, createCanvas } from './canvas';

let filterSupport: boolean | undefined;

function supportsFilter(): boolean {
  if (filterSupport === undefined) {
    const ctx = context2d(createCanvas(1));
    filterSupport = typeof ctx.filter === 'string';
    if (filterSupport) {
      ctx.filter = 'blur(1px)';
      filterSupport = ctx.filter === 'blur(1px)';
    }
  }
  return filterSupport;
}

/** Nowy canvas z rozmytą kopią `source`; `radius` w pikselach `source`. */
export function blurred(source: HTMLCanvasElement, radius: number): HTMLCanvasElement {
  const { width, height } = source;
  const out = createCanvas(width, height);
  const ctx = context2d(out);
  if (radius <= 0) {
    ctx.drawImage(source, 0, 0);
    return out;
  }
  // Obraz rysowany odrobinę powiększony – inaczej brzegi rozmycia „wciągają” przezroczystość
  // i ciemnieją.
  const margin = radius * 2;
  if (supportsFilter()) {
    ctx.filter = `blur(${radius}px)`;
    ctx.drawImage(source, -margin, -margin, width + 2 * margin, height + 2 * margin);
    ctx.filter = 'none';
    return out;
  }
  // Dwa kroki pomniejszenia – jeden duży krok dałby „schodki” zamiast miękkiego rozmycia.
  const factor = Math.max(2, radius / 2);
  const mid = createCanvas(width / Math.min(4, factor), height / Math.min(4, factor));
  const small = createCanvas(width / factor, height / factor);
  for (const [target, src] of [
    [mid, source],
    [small, mid],
  ] as const) {
    const c = context2d(target);
    c.imageSmoothingQuality = 'high';
    c.drawImage(src, 0, 0, target.width, target.height);
  }
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(small, -margin, -margin, width + 2 * margin, height + 2 * margin);
  return out;
}
