/**
 * Gotowe tła. Nazwy w i18n (`t.generator.backgrounds[id]`). Kontrast tekstu z każdym kolorem
 * sprawdza test (≥ 3:1 z każdym kolorem, ≥ 4.5:1 ze średnim).
 */
import type { BackgroundDesign, Fill, Tone } from './design';
import { toneOfFill } from './color';

export interface BackgroundPreset {
  id: string;
  group: 'solid' | 'gradient';
  fill: Fill;
  tone: Tone;
  /** Kolor efektu neon, „podświetlenia” napisu i ozdobnych ramek. */
  accent: string;
}

const solid = (id: string, color: string, tone: Tone, accent: string): BackgroundPreset => ({
  id,
  group: 'solid',
  fill: { kind: 'solid', color },
  tone,
  accent,
});
const gradient = (id: string, fill: Fill, tone: Tone, accent: string): BackgroundPreset => ({
  id,
  group: 'gradient',
  fill,
  tone,
  accent,
});

export const BACKGROUND_PRESETS: readonly BackgroundPreset[] = [
  solid('paper', '#f6f1e7', 'light', '#1e5a44'),
  solid('sage', '#dde7d9', 'light', '#1e5a44'),
  solid('sky', '#dbe8f2', 'light', '#1f3b73'),
  solid('lavender', '#e7e1f2', 'light', '#5b2a86'),
  solid('peach', '#f6d2bd', 'light', '#a8432f'),
  solid('mustard', '#e9b949', 'light', '#1b1916'),
  solid('felt', '#1e5a44', 'dark', '#e8c872'),
  solid('ink', '#1b1916', 'dark', '#e8c872'),
  solid('navy', '#1f2a44', 'dark', '#7fb2ff'),
  solid('burgundy', '#6b1f2a', 'dark', '#f2c48d'),
  solid('terracotta', '#a8432f', 'dark', '#ffd9b0'),
  solid('plum', '#4a2545', 'dark', '#f5a6d6'),

  gradient('paper-glow', { kind: 'radial', colors: ['#fbf7ef', '#e6dbc6'] }, 'light', '#1e5a44'),
  gradient(
    'dawn',
    { kind: 'linear', colors: ['#fde2c8', '#f4b6a6', '#d9b3e0'], angle: 135 },
    'light',
    '#a8432f',
  ),
  gradient(
    'sunset',
    { kind: 'linear', colors: ['#ffb88c', '#ff8a9a', '#e0a3d8'], angle: 135 },
    'light',
    '#6b1f2a',
  ),
  gradient(
    'mint',
    { kind: 'linear', colors: ['#e0f5ec', '#bfe2f0'], angle: 160 },
    'light',
    '#1e5a44',
  ),
  gradient(
    'pastel-mesh',
    {
      kind: 'mesh',
      base: '#fbf6ef',
      blobs: [
        { x: 0.15, y: 0.2, r: 0.6, color: '#ffd1dc' },
        { x: 0.85, y: 0.3, r: 0.6, color: '#c9e4ff' },
        { x: 0.5, y: 0.95, r: 0.7, color: '#d8f5d0' },
      ],
    },
    'light',
    '#5b2a86',
  ),
  gradient('felt-table', { kind: 'radial', colors: ['#2f7a5c', '#0f3326'] }, 'dark', '#e8c872'),
  gradient(
    'ocean',
    { kind: 'linear', colors: ['#1f3b73', '#23798a'], angle: 160 },
    'dark',
    '#9be7ff',
  ),
  gradient('night', { kind: 'radial', colors: ['#3b2f63', '#120f1f'] }, 'dark', '#ff4fd8'),
  gradient(
    'aurora',
    {
      kind: 'mesh',
      base: '#0f1226',
      blobs: [
        { x: 0.2, y: 0.15, r: 0.7, color: '#5b4bff' },
        { x: 0.9, y: 0.4, r: 0.6, color: '#00806e' },
        { x: 0.4, y: 1, r: 0.7, color: '#c2306a' },
      ],
    },
    'dark',
    '#8f7dff',
  ),
];

export const DEFAULT_PRESET_ID = 'paper-glow';

export function presetById(id: string): BackgroundPreset {
  return (
    BACKGROUND_PRESETS.find((preset) => preset.id === id) ??
    BACKGROUND_PRESETS.find((preset) => preset.id === DEFAULT_PRESET_ID)!
  );
}

/**
 * Ton tła bez rysowania (do podpowiedzi w panelu). Dla zdjęcia nie wiadomo – `null`
 * (renderer mierzy go dopiero na pikselach).
 */
export function estimateTone(bg: BackgroundDesign): Tone | null {
  if (bg.textColor !== 'auto') return bg.textColor === 'dark' ? 'light' : 'dark';
  if (bg.source === 'image') return null;
  return bg.source === 'custom' ? toneOfFill(bg.custom) : presetById(bg.presetId).tone;
}
