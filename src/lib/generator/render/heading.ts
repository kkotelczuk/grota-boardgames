/**
 * Napis u góry grafiki: dopasowanie rozmiaru, wyrównanie i efekty (cień, neon, podświetlenie
 * jak „tekst z tłem” na FB/IG, szklana pigułka).
 */
import type { HeadingDesign } from '../design';
import { INK, LIGHT } from '../design';
import { pickTextColor } from '../color';
import { HEADING_FONTS, cssFont, type HeadingFont } from '../fonts';
import { HEADER, HEADING_FONT } from '../layout';
import type { BackgroundLayer } from './background';
import { setShadow, withAlpha } from './canvas';
import { drawGlass } from './glass';
import { clampLines, wrapText } from './text';

/** Marginesy wokół tekstu zależne od efektu (podświetlenie – w em, szkło – stałe). */
function insets(effect: HeadingDesign['effect'], size: number) {
  if (effect === 'highlight') return { x: Math.round(size * 0.35), y: Math.round(size * 0.18) };
  if (effect === 'glass') return { x: 32, y: 20 };
  return { x: 0, y: 0 };
}

const blockHeight = (size: number, lines: number) =>
  size * (1 + HEADING_FONT.lineHeight * (lines - 1));

/**
 * Największy rozmiar (od `max·scale` w dół), przy którym napis mieści się w 2 liniach i w pasie
 * nagłówka. Jeśli nawet przy minimum się nie mieści – druga linia ucięta „…”.
 */
function fit(
  ctx: CanvasRenderingContext2D,
  text: string,
  font: HeadingFont,
  effect: HeadingDesign['effect'],
) {
  const max = Math.round(HEADING_FONT.max * font.scale);
  const min = Math.round(HEADING_FONT.min * font.scale);
  for (let size = max; size >= min; size -= HEADING_FONT.step) {
    const inset = insets(effect, size);
    ctx.font = cssFont(font, size);
    const lines = wrapText(ctx, text, HEADER.width - 2 * inset.x);
    if (
      lines.length <= HEADING_FONT.maxLines &&
      blockHeight(size, lines.length) <= HEADER.height - 2 * inset.y
    ) {
      return { size, lines, inset };
    }
  }
  const inset = insets(effect, min);
  ctx.font = cssFont(font, min);
  const lines = clampLines(ctx, text, HEADER.width - 2 * inset.x, HEADING_FONT.maxLines);
  return { size: min, lines, inset };
}

export function drawHeading(
  ctx: CanvasRenderingContext2D,
  heading: string,
  design: HeadingDesign,
  layer: BackgroundLayer,
  locale: string,
): void {
  const font = HEADING_FONTS[design.font];
  let text = heading.trim();
  if (!text) return;
  if (font.uppercase) text = text.toLocaleUpperCase(locale);

  ctx.save();
  const { size, lines, inset } = fit(ctx, text, font, design.effect);
  const center = design.align === 'center';
  const x = center ? HEADER.x + HEADER.width / 2 : HEADER.x + inset.x;
  const y = HEADER.y + inset.y;
  const lineY = (i: number) => y + i * size * HEADING_FONT.lineHeight;
  const widths = lines.map((line) => ctx.measureText(line).width);
  ctx.textAlign = center ? 'center' : 'left';
  ctx.textBaseline = 'top';

  let color = layer.text;
  switch (design.effect) {
    case 'none':
      // Na gradiencie/zdjęciu tekst dostaje subtelne halo w kolorze przeciwnym.
      if (layer.busy !== 'none') {
        setShadow(ctx, {
          color: withAlpha(color === INK ? LIGHT : INK, layer.busy === 'strong' ? 0.5 : 0.25),
          blur: 8,
          offsetY: 0,
        });
      }
      break;
    case 'shadow':
      setShadow(ctx, {
        color: layer.tone === 'light' ? 'rgba(0,0,0,0.28)' : 'rgba(0,0,0,0.5)',
        blur: 16,
        offsetY: 6,
      });
      break;
    case 'neon':
      color = LIGHT;
      ctx.fillStyle = LIGHT;
      for (const blur of [48, 24, 8]) {
        setShadow(ctx, { color: layer.accent, blur, offsetY: 0 });
        lines.forEach((line, i) => ctx.fillText(line, x, lineY(i)));
      }
      ctx.shadowColor = 'transparent';
      break;
    case 'highlight': {
      // Każda linia na własnym prostokącie w kolorze akcentu; prostokąty na siebie zachodzą.
      ctx.fillStyle = layer.accent;
      lines.forEach((_, i) => {
        const w = widths[i]! + 2 * inset.x;
        const left = center ? x - w / 2 : x - inset.x;
        ctx.beginPath();
        ctx.roundRect(left, lineY(i) - inset.y, w, size + 2 * inset.y, size * 0.25);
        ctx.fill();
      });
      color = pickTextColor(layer.accent);
      break;
    }
    case 'glass': {
      const w = Math.max(...widths) + 2 * inset.x;
      const h = blockHeight(size, lines.length) + 2 * inset.y;
      const left = center ? x - w / 2 : HEADER.x;
      drawGlass(
        ctx,
        { x: left, y: HEADER.y, width: w, height: h },
        32,
        layer.blurred(),
        layer.tone,
      );
      break;
    }
  }

  ctx.fillStyle = color;
  lines.forEach((line, i) => ctx.fillText(line, x, lineY(i)));
  ctx.restore();
}
