/**
 * Pliki grafik rozkładu. `import.meta.glob` z `?url` daje gotowe adresy (z hashem w nazwie),
 * a Vite sam dopisuje nowe pliki z katalogu – dodanie ikony to plik + wpis w `icons.ts`.
 *
 * Wszystko jest serwowane z tej samej domeny, więc canvas nie zostaje „brudny” (eksport PNG działa).
 */
const urls = (modules: Record<string, string>): Map<string, string> =>
  new Map(
    Object.entries(modules).map(([path, url]) => [
      path
        .split('/')
        .pop()!
        .replace(/\.\w+$/, ''),
      url,
    ]),
  );

const backgrounds = urls(
  import.meta.glob<string>('../../assets/schedule/backgrounds/*.webp', {
    eager: true,
    query: '?url',
    import: 'default',
  }),
);
const cards = urls(
  import.meta.glob<string>('../../assets/schedule/cards/*.webp', {
    eager: true,
    query: '?url',
    import: 'default',
  }),
);
const icons = urls(
  import.meta.glob<string>('../../assets/schedule/icons/*.svg', {
    eager: true,
    query: '?url',
    import: 'default',
  }),
);

function pick(map: Map<string, string>, name: string): string {
  const url = map.get(name);
  if (!url) throw new Error(`Brak grafiki rozkładu: ${name}`);
  return url;
}

export const backgroundUrl = (name: string): string => pick(backgrounds, name);
export const cardUrl = (name: string): string => pick(cards, name);
export const iconUrl = (id: string): string => pick(icons, id);
export const STAMP_URL = pick(icons, 'special-event');
