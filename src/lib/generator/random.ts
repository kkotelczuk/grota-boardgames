/**
 * Deterministyczna losowość: ten sam `seed` → ten sam rozrzut kostek, szum, kolory.
 * Dzięki temu przerysowanie grafiki (np. po dodaniu gry) nie „przetasowuje” tła.
 */

/** mulberry32 – mały, szybki PRNG 32-bitowy. Zwraca liczby z [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a – stabilny hash tekstu (np. klucza gry → kąt obrotu polaroidu). */
export function hashString(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export const randomSeed = (): number => Math.floor(Math.random() * 2 ** 32);

/** Liczba z [min, max). */
export const between = (rng: () => number, min: number, max: number): number =>
  min + rng() * (max - min);

export const pick = <T>(rng: () => number, items: readonly T[]): T =>
  items[Math.floor(rng() * items.length)]!;
