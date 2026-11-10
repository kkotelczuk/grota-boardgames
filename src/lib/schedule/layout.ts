/**
 * Układ kart na grafice 1920×1080. Czysta geometria (bez canvasa) – testowalna jednostkowo.
 */
import type { DayKind } from './plan';

export const WIDTH = 1920;
export const HEIGHT = 1080;

export interface Slot {
  kind: DayKind;
  /** Środek karty. */
  cx: number;
  cy: number;
  /** Szerokość karty; wysokość wynika z proporcji grafiki karty w motywie. */
  width: number;
  /** Obrót w radianach (tylko dzień „additional”). */
  rotation: number;
}

export interface RowLayout {
  /** Pas, w którym mieszczą się karty. */
  left: number;
  right: number;
  centerY: number;
  gap: number;
  /** Szerokość karty nieaktywnej. */
  inactiveWidth: number;
  /** Górny limit karty aktywnej – przy 1–3 aktywnych dniach karty nie rosną w nieskończoność. */
  maxActiveWidth: number;
  /**
   * Karta dnia dopisanego na ostatnią chwilę: obrót (radiany) oraz uniesienie i przesunięcie
   * w prawo jako ułamki jej wysokości/szerokości. Obrócona karta wystaje poza swoje miejsce –
   * uniesienie sprawia, że jej dolny róg mija godziny sąsiedniego dnia.
   */
  additionalRotation: number;
  additionalLift: number;
  additionalShift: number;
  /** `true` = wszystkie karty tej samej wielkości (motyw letni). */
  uniform: boolean;
}

/**
 * Karty w jednym rzędzie, równo rozłożone i wyśrodkowane. Dni aktywne dzielą między siebie
 * miejsce, które zostaje po (mniejszych) kartach nieaktywnych.
 *
 * Dzień „additional” zajmuje w rzędzie tyle miejsca, co nieaktywny: dzięki temu po dopisaniu
 * dnia pozostałe karty nie przesuwają się względem opublikowanej wcześniej grafiki. Sama karta
 * jest rysowana w rozmiarze aktywnej, przekrzywiona, na wierzchu.
 */
export function computeSlots(
  kinds: readonly DayKind[],
  row: RowLayout,
  /** Wysokość / szerokość karty aktywnej (potrzebna do uniesienia karty dopisanej). */
  ratio: number,
): Slot[] {
  const available = row.right - row.left - row.gap * (kinds.length - 1);
  const activeCount = kinds.filter((kind) => kind === 'active').length;
  const narrowCount = kinds.length - activeCount;
  const activeWidth = row.uniform
    ? available / kinds.length
    : Math.min(
        row.maxActiveWidth,
        activeCount
          ? (available - narrowCount * row.inactiveWidth) / activeCount
          : row.maxActiveWidth,
      );
  const slotWidth = (kind: DayKind) =>
    row.uniform || kind === 'active' ? activeWidth : row.inactiveWidth;

  const total =
    kinds.reduce((sum, kind) => sum + slotWidth(kind), 0) + row.gap * (kinds.length - 1);
  let x = (row.left + row.right - total) / 2;

  return kinds.map((kind) => {
    const width = slotWidth(kind);
    const cx = x + width / 2;
    x += width + row.gap;
    if (kind !== 'additional') return { kind, cx, cy: row.centerY, width, rotation: 0 };

    const height = activeWidth * ratio;
    // Połowa szerokości obrysu obróconej karty – pilnujemy, żeby nie wyszła poza grafikę.
    const reach =
      (activeWidth * Math.cos(row.additionalRotation) + height * Math.sin(row.additionalRotation)) /
      2;
    return {
      kind,
      cx: clamp(cx + activeWidth * row.additionalShift, EDGE + reach, WIDTH - EDGE - reach),
      cy: row.centerY - height * row.additionalLift,
      width: activeWidth,
      rotation: row.additionalRotation,
    };
  });
}

/** Minimalny odstęp obróconej karty od krawędzi grafiki. */
const EDGE = 8;
const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/** Kolejność rysowania: nieaktywne pod spodem, aktywne na nich, dopisane na samym wierzchu. */
export function paintOrder(slots: readonly Slot[]): number[] {
  const rank: Record<DayKind, number> = { inactive: 0, active: 1, additional: 2 };
  return slots
    .map((_, i) => i)
    .sort((a, b) => rank[slots[a]!.kind] - rank[slots[b]!.kind] || a - b);
}

/** Największy rozmiar mieszczący obraz `w×h` w polu `maxW×maxH` (jak CSS `object-fit: contain`). */
export function contain(
  w: number,
  h: number,
  maxW: number,
  maxH: number,
): { w: number; h: number } {
  const scale = Math.min(maxW / w, maxH / h);
  return { w: w * scale, h: h * scale };
}
