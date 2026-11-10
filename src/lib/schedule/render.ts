/**
 * Rysowanie rozkładu na canvasie 1920×1080. Funkcja jest synchroniczna i dostaje już
 * załadowane obrazki – ładowanie (asynchroniczne) należy do komponentu podglądu.
 */
import { cssFont, type FontSpec } from '@/lib/generator/fonts';
import { HEIGHT, WIDTH, computeSlots, contain, paintOrder, type Slot } from './layout';
import {
  DAY_ABBREVIATIONS,
  DAY_NAMES,
  dayKind,
  formatHours,
  weekRange,
  type DayPlan,
  type WeekPlan,
} from './plan';
import type { Face, Theme } from './themes';

type Ctx = CanvasRenderingContext2D;
type Picture = HTMLImageElement | null;

export interface ScheduleImages {
  background: Picture;
  active: Picture;
  inactive: Picture;
  stamp: Picture;
  /** Dla każdego z 7 dni: własny obrazek albo ikona. */
  days: readonly Picture[];
}

export function renderSchedule(
  ctx: Ctx,
  plan: WeekPlan,
  theme: Theme,
  images: ScheduleImages,
): void {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  if (images.background) ctx.drawImage(images.background, 0, 0, WIDTH, HEIGHT);
  else {
    ctx.fillStyle = '#3a2a1e';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }
  drawDate(ctx, plan, theme);

  const slots = computeSlots(plan.days.map(dayKind), theme.row, theme.active.ratio);
  for (const index of paintOrder(slots)) {
    drawCard(ctx, theme, slots[index]!, plan.days[index]!, index, images);
  }
}

function drawDate(ctx: Ctx, plan: WeekPlan, theme: Theme): void {
  const { date } = theme;
  ctx.save();
  ctx.font = cssFont(date.font, date.size);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  if (date.shadow) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;
  }
  ctx.fillText(date.prefix + weekRange(plan.monday), date.x, date.cy);
  ctx.restore();
}

function drawCard(
  ctx: Ctx,
  theme: Theme,
  slot: Slot,
  day: DayPlan,
  index: number,
  images: ScheduleImages,
): void {
  const inactive = slot.kind === 'inactive';
  const face = inactive ? theme.inactive : theme.active;
  const picture = inactive ? images.inactive : images.active;
  const w = slot.width;
  const h = w * face.ratio;

  ctx.save();
  // Układ współrzędnych karty: (0,0) = jej lewy górny róg; obrót wokół środka.
  ctx.translate(slot.cx, slot.cy);
  ctx.rotate(slot.rotation);
  ctx.translate(-w / 2, -h / 2);

  ctx.globalAlpha = face.opacity;
  drawFace(ctx, face, picture, w, h, theme.cardShadow, slot.kind === 'additional');

  const name = (face.name.abbreviated ? DAY_ABBREVIATIONS : DAY_NAMES)[index]!;
  drawText(ctx, name.toUpperCase(), theme.fonts.name, face.name, w, h);
  ctx.globalAlpha = 1;

  // Podpis zabiera miejsce ikonie: ikona jest wtedy mniejsza i przesunięta w górę.
  const caption = face.caption ? day.caption.trim() : '';
  const squeeze = caption ? { scale: 0.84, shift: -0.035 } : { scale: 1, shift: 0 };
  const box = day.image ? face.image : face.icon;
  const content = images.days[index];
  if (box && content) {
    const size = contain(
      content.naturalWidth || 1,
      content.naturalHeight || 1,
      box.maxW * w,
      box.maxH * h * squeeze.scale,
    );
    ctx.save();
    if (day.image || theme.iconShadow) {
      ctx.shadowColor = 'rgba(30, 20, 50, 0.32)';
      ctx.shadowBlur = w * 0.05;
      ctx.shadowOffsetX = w * 0.02;
      ctx.shadowOffsetY = w * 0.03;
    }
    ctx.drawImage(
      content,
      (w - size.w) / 2,
      (box.cy + squeeze.shift) * h - size.h / 2,
      size.w,
      size.h,
    );
    ctx.restore();
  }

  if (caption && face.caption) drawText(ctx, caption, theme.fonts.name, face.caption, w, h);

  if (face.hours) {
    if (face.hours.stacked) drawStackedHours(ctx, day, theme.fonts.hours, face.hours, w, h);
    else drawText(ctx, formatHours(day), theme.fonts.hours, face.hours, w, h);
  }

  if (day.stamp && !inactive && images.stamp) drawStamp(ctx, images.stamp, w, h, face, !!caption);
  ctx.restore();
}

function drawFace(
  ctx: Ctx,
  face: Face,
  picture: Picture,
  w: number,
  h: number,
  shadow: boolean,
  lifted: boolean,
): void {
  ctx.save();
  if (face.crop) {
    // Cień rysujemy osobno (pod kształtem), bo `clip()` uciąłby go razem z resztą.
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, face.crop.radius * w);
    ctx.shadowColor = lifted ? 'rgba(0, 0, 0, 0.45)' : 'rgba(0, 0, 0, 0.18)';
    ctx.shadowBlur = lifted ? 26 : 10;
    ctx.shadowOffsetY = lifted ? 12 : 4;
    ctx.fillStyle = '#fffdf0';
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.clip();
    if (picture) ctx.drawImage(picture, ...face.crop.rect, 0, 0, w, h);
  } else if (picture) {
    // Grafika karty ma przezroczystość, więc cień sam układa się po jej (nieregularnym) kształcie.
    if (shadow || lifted) {
      ctx.shadowColor = lifted ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.28)';
      ctx.shadowBlur = lifted ? 30 : 12;
      ctx.shadowOffsetY = lifted ? 14 : 4;
    }
    ctx.drawImage(picture, 0, 0, w, h);
  } else {
    ctx.fillStyle = '#d3d4cb';
    ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
}

interface Spot {
  cy: number;
  size: number;
  maxW: number;
  color: string;
}

/** Napis wyśrodkowany w poziomie; za szeroki dostaje mniejszy font (nigdy nie wychodzi za kartę). */
function drawText(ctx: Ctx, text: string, font: FontSpec, spot: Spot, w: number, h: number): void {
  let size = spot.size * w;
  ctx.font = cssFont(font, size);
  const width = ctx.measureText(text).width;
  if (width > spot.maxW * w) {
    size *= (spot.maxW * w) / width;
    ctx.font = cssFont(font, size);
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = spot.color;
  ctx.fillText(text, w / 2, spot.cy * h);
}

/** Lato: godziny jedna pod drugą, z kreską pomiędzy. */
function drawStackedHours(
  ctx: Ctx,
  day: DayPlan,
  font: FontSpec,
  spot: Spot,
  w: number,
  h: number,
): void {
  const line = spot.size * w * 1.02;
  const at = (offset: number): Spot => ({ ...spot, cy: spot.cy + offset / h });
  drawText(ctx, day.from, font, at(-line), w, h);
  drawText(ctx, '–', font, { ...spot, size: spot.size * 0.8 }, w, h);
  drawText(ctx, day.to, font, at(line), w, h);
}

/** Pieczątka: lekko przekrzywiona, szersza od karty – jak przybita na gotowej grafice. */
function drawStamp(
  ctx: Ctx,
  stamp: HTMLImageElement,
  w: number,
  h: number,
  face: Face,
  hasCaption: boolean,
): void {
  const width = w * 1.06;
  const height = (width * (stamp.naturalHeight || 101)) / (stamp.naturalWidth || 291);
  // Nad godzinami (i nad podpisem, jeśli jest); na karcie letniej – na pasie kwiatów.
  const cy = face.hours?.stacked ? 0.6 : (face.hours?.cy ?? 0.8) - (hasCaption ? 0.27 : 0.2);
  ctx.save();
  ctx.translate(w / 2 + w * 0.02, cy * h);
  ctx.rotate((-5 * Math.PI) / 180);
  ctx.drawImage(stamp, -width / 2, -height / 2, width, height);
  ctx.restore();
}

/** Nazwa pobieranego pliku, np. `rozklad-jazdy-09.11-15.11.png`. */
export const scheduleFileName = (plan: WeekPlan): string =>
  `rozklad-jazdy-${weekRange(plan.monday).replace('–', '-')}.png`;
