/**
 * Katalog ikon dni – same metadane (bez plików), żeby logika losowania była testowalna
 * bez Vite. Adresy plików: `assets.ts`.
 */
export type IconSet = 'line' | 'summer';

export interface IconMeta {
  id: string;
  label: string;
  set: IconSet;
  /** Ikony standardowe biorą udział w losowaniu; okolicznościowe wybiera się tylko ręcznie. */
  standard: boolean;
}

export const ICONS = [
  { id: 'meeple', label: 'Meeple', set: 'line', standard: true },
  { id: 'die', label: 'Kostka', set: 'line', standard: true },
  { id: 'cards', label: 'Karty', set: 'line', standard: true },
  { id: 'board', label: 'Plansza', set: 'line', standard: true },
  { id: 'quill-scroll', label: 'Zwój i pióro', set: 'line', standard: true },
  { id: 'meeple-on-die', label: 'Meeple na kostce', set: 'line', standard: true },
  { id: 'meeple-on-board', label: 'Meeple na planszy', set: 'line', standard: true },
  { id: 'star-wars-falcon', label: 'Star Wars', set: 'line', standard: false },
  { id: 'racing', label: 'Wyścigi', set: 'line', standard: false },
  { id: 'crown', label: 'Korona', set: 'line', standard: false },
  { id: 'summer-palm', label: 'Palma', set: 'summer', standard: true },
  { id: 'summer-pawn', label: 'Pionek', set: 'summer', standard: true },
  { id: 'summer-die', label: 'Kostka', set: 'summer', standard: true },
  { id: 'summer-quill-scroll', label: 'Zwój i pióro', set: 'summer', standard: true },
  { id: 'cards-gold-star', label: 'Karty', set: 'summer', standard: true },
  { id: 'summer-death-star', label: 'Gwiazda Śmierci', set: 'summer', standard: false },
] as const satisfies readonly IconMeta[];

export type IconId = (typeof ICONS)[number]['id'];

export const iconsOf = (set: IconSet): IconMeta[] => ICONS.filter((icon) => icon.set === set);

export const isIconOf = (id: string, set: IconSet): boolean =>
  ICONS.some((icon) => icon.id === id && icon.set === set);

/**
 * Losuje ikony na `count` dni z jak najmniejszą liczbą powtórek: tasujemy pulę i rozdajemy
 * ją w kółko (każda ikona pojawi się po raz drugi dopiero, gdy wszystkie były użyte). Na styku
 * dwóch „talii” pilnujemy, żeby sąsiednie dni nie dostały tej samej ikony.
 */
export function dealIcons(
  set: IconSet,
  count: number,
  random: () => number = Math.random,
): IconId[] {
  const pool = ICONS.filter((icon) => icon.set === set && icon.standard).map((icon) => icon.id);
  const dealt: IconId[] = [];
  while (dealt.length < count) {
    const deck = shuffled(pool, random);
    if (deck.length > 1 && deck[0] === dealt.at(-1)) deck.push(deck.shift()!);
    dealt.push(...deck);
  }
  return dealt.slice(0, count);
}

/** Fisher–Yates na kopii. */
function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}
