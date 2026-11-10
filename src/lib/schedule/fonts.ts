/**
 * Fonty napisów na rozkładzie – ładowane tylko na tej stronie (FontFace API), jak w generatorze.
 * Każda waga ma własną nazwę rodziny: `ensureFont` pamięta załadowane fonty po nazwie.
 */
import type { FontSpec } from '@/lib/generator/fonts';
import loraLatin from '@fontsource/lora/files/lora-latin-700-normal.woff2?url';
import loraLatinExt from '@fontsource/lora/files/lora-latin-ext-700-normal.woff2?url';
import alegreyaLatin from '@fontsource/alegreya-sc/files/alegreya-sc-latin-700-normal.woff2?url';
import alegreyaLatinExt from '@fontsource/alegreya-sc/files/alegreya-sc-latin-ext-700-normal.woff2?url';
import poppins500Latin from '@fontsource/poppins/files/poppins-latin-500-normal.woff2?url';
import poppins500LatinExt from '@fontsource/poppins/files/poppins-latin-ext-500-normal.woff2?url';
import poppins600Latin from '@fontsource/poppins/files/poppins-latin-600-normal.woff2?url';
import poppins600LatinExt from '@fontsource/poppins/files/poppins-latin-ext-600-normal.woff2?url';

export const SERIF: FontSpec = {
  family: 'Rozklad Lora',
  weight: 700,
  files: { latin: loraLatin, latinExt: loraLatinExt },
  fallback: 'Georgia, serif',
};
export const SMALL_CAPS: FontSpec = {
  family: 'Rozklad Alegreya SC',
  weight: 700,
  files: { latin: alegreyaLatin, latinExt: alegreyaLatinExt },
  fallback: 'Georgia, serif',
};
export const SANS: FontSpec = {
  family: 'Rozklad Poppins Medium',
  weight: 500,
  files: { latin: poppins500Latin, latinExt: poppins500LatinExt },
  fallback: 'system-ui, sans-serif',
};
export const SANS_BOLD: FontSpec = {
  family: 'Rozklad Poppins SemiBold',
  weight: 600,
  files: { latin: poppins600Latin, latinExt: poppins600LatinExt },
  fallback: 'system-ui, sans-serif',
};
