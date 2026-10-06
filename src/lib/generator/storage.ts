/**
 * Zapamiętywanie wyglądu między wizytami (decyzja właściciela 2026-10-06). Bez zdjęcia tła
 * (blob: URL nie przeżywa przeładowania) – wtedy wracamy do tła presetu.
 */
import { GENERATOR_DESIGN_KEY } from '@/config/generator';
import { designSchema, type PosterDesign } from './design';
import { BACKGROUND_PRESETS } from './presets';
import { defaultDesign } from './themes';

/** Odczyt z walidacją: uszkodzony/stary JSON albo zablokowany storage → projekt domyślny. */
export function parseDesign(raw: string | null): PosterDesign {
  if (!raw) return defaultDesign();
  try {
    const result = designSchema.safeParse(JSON.parse(raw));
    if (!result.success) return defaultDesign();
    const design = result.data as PosterDesign;
    if (!BACKGROUND_PRESETS.some((preset) => preset.id === design.background.presetId)) {
      return defaultDesign();
    }
    if (design.background.source === 'image') design.background.source = 'preset';
    return design;
  } catch {
    return defaultDesign();
  }
}

export function loadDesign(): PosterDesign {
  try {
    return parseDesign(localStorage.getItem(GENERATOR_DESIGN_KEY));
  } catch {
    return defaultDesign();
  }
}

export function saveDesign(design: PosterDesign): void {
  try {
    localStorage.setItem(GENERATOR_DESIGN_KEY, JSON.stringify(design));
  } catch {
    // Storage zablokowany/pełny – wygląd po prostu nie zostanie zapamiętany.
  }
}
