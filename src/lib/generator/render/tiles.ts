/**
 * Kafelki z grami: klasyczny, karta, szkło, polaroid, nakładka.
 * Zasada z UI Apple: promienie koncentryczne – okładka w karcie ma promień
 * `promień karty − margines`, więc rogi okładki i karty są „równoległe”.
 */
import type { SelectedItem } from '../types';
import { INK, LIGHT, RADIUS_RATIO, type Tone, type TilesDesign } from '../design';
import { pickTextColor } from '../color';
import { HEADING_FONTS, LABEL_FONT, cssFont } from '../fonts';
import { LABEL, computeLayout, tileFrameFor, type PosterLayout } from '../layout';
import { hashString } from '../random';
import type { BackgroundLayer } from './background';
import { dropShadow, setShadow, withAlpha, type Shadow } from './canvas';
import { drawGlass } from './glass';
import { clampLines } from './text';

const CARD_COLOR: Record<Tone, string> = { light: '#fffcf5', dark: '#24211d' };
const PLACEHOLDER: Record<Tone, string> = { light: '#efe8da', dark: '#3a352e' };
const POLAROID_MAX_DEG = 2.5;

/** Miękki, dwuwarstwowy cień; mniejszy przy małych kafelkach, mocniejszy na ciemnym tle. */
function shadows(tone: Tone, tile: number): Shadow[] {
  const k = tone === 'dark' ? 1.8 : 1;
  const s = Math.min(1, Math.max(0.45, tile / 240));
  return [
    { color: `rgba(0,0,0,${0.1 * k})`, blur: 6 * s, offsetY: 2 * s },
    { color: `rgba(0,0,0,${0.16 * k})`, blur: 28 * s, offsetY: 12 * s },
  ];
}

/** Okładka przycięta „cover” do kwadratu (środek zachowany), z zaokrąglonymi rogami. */
function drawCover(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  x: number,
  y: number,
  tile: number,
  radius: number,
  placeholder: string,
) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, tile, tile, radius);
  if (image) {
    ctx.clip();
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    const sx = (image.naturalWidth - side) / 2;
    const sy = (image.naturalHeight - side) / 2;
    ctx.drawImage(image, sx, sy, side, side, x, y, tile, tile);
  } else {
    ctx.fillStyle = placeholder;
    ctx.fill();
  }
  ctx.restore();
}

interface LabelStyle {
  font: string;
  fontSize: number;
  color: string;
  halo?: string | undefined;
}

function drawLabel(
  ctx: CanvasRenderingContext2D,
  title: string,
  centerX: number,
  top: number,
  maxWidth: number,
  style: LabelStyle,
) {
  ctx.save();
  ctx.font = style.font;
  ctx.fillStyle = style.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  if (style.halo) setShadow(ctx, { color: style.halo, blur: 6, offsetY: 0 });
  const lines = clampLines(ctx, title, maxWidth, LABEL.lines);
  lines.forEach((line, i) =>
    ctx.fillText(line, centerX, top + i * style.fontSize * LABEL.lineHeight),
  );
  ctx.restore();
}

/** Nazwa na dole okładki, na gradiencie przyciemniającym. */
function drawOverlayLabel(
  ctx: CanvasRenderingContext2D,
  title: string,
  x: number,
  y: number,
  tile: number,
  radius: number,
  fontSize: number,
) {
  const inner = Math.round(tile * 0.06);
  ctx.save();
  ctx.font = cssFont(LABEL_FONT, fontSize);
  const lines = clampLines(ctx, title, tile - 2 * inner, LABEL.lines);
  const textHeight = lines.length * fontSize * LABEL.lineHeight;
  const bottom = y + tile - inner;
  const scrimTop = bottom - textHeight - inner - tile * 0.25;

  ctx.beginPath();
  ctx.roundRect(x, y, tile, tile, radius);
  ctx.clip();
  const scrim = ctx.createLinearGradient(0, Math.max(y, scrimTop), 0, y + tile);
  scrim.addColorStop(0, 'rgba(0,0,0,0)');
  scrim.addColorStop(1, 'rgba(0,0,0,0.72)');
  ctx.fillStyle = scrim;
  ctx.fillRect(x, y, tile, tile);

  ctx.fillStyle = LIGHT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  lines.forEach((line, i) =>
    ctx.fillText(line, x + tile / 2, bottom - textHeight + i * fontSize * LABEL.lineHeight),
  );
  ctx.restore();
}

export function drawTiles(
  ctx: CanvasRenderingContext2D,
  items: readonly SelectedItem[],
  images: ReadonlyMap<string, HTMLImageElement | null>,
  design: TilesDesign,
  layer: BackgroundLayer,
): PosterLayout {
  const layout = computeLayout(items.length, tileFrameFor(design.style, design.labels));
  const { tile, pad, card, labelFontSize } = layout;
  const ratio =
    design.style === 'polaroid'
      ? Math.min(RADIUS_RATIO[design.radius], 0.05)
      : RADIUS_RATIO[design.radius];
  const cardRadius = Math.round(ratio * card.width);
  const coverRadius = pad > 0 ? Math.max(0, cardRadius - pad) : cardRadius;
  const cardShadows = design.shadow ? shadows(layer.tone, tile) : [];
  const placeholder =
    PLACEHOLDER[design.style === 'card' || design.style === 'polaroid' ? 'light' : layer.tone];
  const labelFont = cssFont(LABEL_FONT, labelFontSize);
  const halo =
    layer.busy === 'none'
      ? undefined
      : withAlpha(layer.text === INK ? LIGHT : INK, layer.busy === 'strong' ? 0.6 : 0.3);

  items.forEach((item, i) => {
    const { x, y } = layout.cells[i]!;
    const image = images.get(item.key) ?? null;
    const coverX = x + pad;
    const coverY = y + pad;
    const labelTop = coverY + tile + 10;
    const cardPath = (c: CanvasRenderingContext2D, dx: number) =>
      c.roundRect(x + dx, y, card.width, card.height, cardRadius);

    switch (design.style) {
      case 'classic':
        dropShadow(ctx, cardShadows, (c, dx) => c.roundRect(x + dx, y, tile, tile, coverRadius));
        drawCover(ctx, image, x, y, tile, coverRadius, placeholder);
        if (design.labels) {
          drawLabel(ctx, item.title, x + tile / 2, labelTop, tile, {
            font: labelFont,
            fontSize: labelFontSize,
            color: layer.text,
            halo,
          });
        }
        break;

      case 'card': {
        const color = CARD_COLOR[layer.tone];
        dropShadow(ctx, cardShadows, cardPath);
        ctx.fillStyle = color;
        ctx.beginPath();
        cardPath(ctx, 0);
        ctx.fill();
        drawCover(ctx, image, coverX, coverY, tile, coverRadius, placeholder);
        if (design.labels) {
          drawLabel(ctx, item.title, coverX + tile / 2, labelTop, tile, {
            font: labelFont,
            fontSize: labelFontSize,
            color: pickTextColor(color),
          });
        }
        break;
      }

      case 'glass':
        dropShadow(ctx, cardShadows, cardPath);
        drawGlass(
          ctx,
          { x, y, width: card.width, height: card.height },
          cardRadius,
          layer.blurred(),
          layer.tone,
        );
        drawCover(ctx, image, coverX, coverY, tile, coverRadius, placeholder);
        if (design.labels) {
          drawLabel(ctx, item.title, coverX + tile / 2, labelTop, tile, {
            font: labelFont,
            fontSize: labelFontSize,
            color: layer.text,
          });
        }
        break;

      case 'polaroid': {
        // Obrót z hasha klucza – stały między renderami, różny dla każdej gry.
        const angle =
          (((hashString(item.key) % 1000) / 1000) * 2 - 1) * ((POLAROID_MAX_DEG * Math.PI) / 180);
        ctx.save();
        ctx.translate(x + card.width / 2, y + card.height / 2);
        ctx.rotate(angle);
        ctx.translate(-(x + card.width / 2), -(y + card.height / 2));
        // Karta jest nieprzezroczysta, więc cień można rzucić nią samą (działa też po obrocie).
        ctx.fillStyle = LIGHT;
        for (const shadow of cardShadows) {
          ctx.save();
          setShadow(ctx, shadow);
          ctx.beginPath();
          cardPath(ctx, 0);
          ctx.fill();
          ctx.restore();
        }
        ctx.beginPath();
        cardPath(ctx, 0);
        ctx.fill();
        drawCover(ctx, image, coverX, coverY, tile, coverRadius, placeholder);
        if (design.labels) {
          const handwritten = HEADING_FONTS.handwritten;
          const size = Math.round(labelFontSize * handwritten.scale);
          drawLabel(ctx, item.title, coverX + tile / 2, labelTop - 4, tile, {
            font: cssFont(handwritten, size),
            fontSize: labelFontSize,
            color: INK,
          });
        }
        ctx.restore();
        break;
      }

      case 'overlay':
        dropShadow(ctx, cardShadows, (c, dx) => c.roundRect(x + dx, y, tile, tile, coverRadius));
        drawCover(ctx, image, x, y, tile, coverRadius, placeholder);
        if (design.labels) {
          drawOverlayLabel(ctx, item.title, x, y, tile, coverRadius, labelFontSize);
        }
        break;
    }
  });
  return layout;
}
