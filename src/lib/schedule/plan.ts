/**
 * Stan rozkładu na jeden tydzień. Moduł client-safe i bez DOM – jedno źródło prawdy dla
 * formularza, renderera i zapisu w localStorage.
 */
import * as z from 'zod/mini';
import { SCHEDULE_CAPTION_MAX } from '@/config/schedule';
import { dealIcons, isIconOf, type IconSet } from './icons';

export const THEME_IDS = ['autumn', 'winter', 'spring', 'summer', 'classic'] as const;
export type ThemeId = (typeof THEME_IDS)[number];

/** Zestaw ikon motywu – tu, a nie w `themes.ts`, bo potrzebuje go logika stanu. */
export const ICON_SET: Record<ThemeId, IconSet> = {
  autumn: 'line',
  winter: 'line',
  spring: 'line',
  summer: 'summer',
  classic: 'line',
};

export const DAY_NAMES = [
  'Poniedziałek',
  'Wtorek',
  'Środa',
  'Czwartek',
  'Piątek',
  'Sobota',
  'Niedziela',
] as const;
/** Skróty na kartach dni nieaktywnych. */
export const DAY_ABBREVIATIONS = ['PN.', 'WT.', 'ŚR.', 'CZW.', 'PT.', 'SB.', 'ND.'] as const;

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const time = z.union([z.literal(''), z.string().check(z.regex(TIME))]);

const daySchema = z.object({
  /** `HH:MM` albo pusty. Dzień jest aktywny dopiero, gdy podane są obie godziny. */
  from: time,
  to: time,
  /** Dzień dopisany na ostatnią chwilę – karta przekrzywiona, reszta układu bez zmian. */
  additional: z.boolean(),
  icon: z.string(),
  /** Własny obrazek zamiast ikony (okładka z kolekcji/BGG albo wgrany plik jako data: URL). */
  image: z.nullable(z.object({ title: z.string(), src: z.string() })),
  /** Pieczątka „Special event”. */
  stamp: z.boolean(),
  caption: z.string().check(z.maxLength(SCHEDULE_CAPTION_MAX)),
});

export const planSchema = z.object({
  /** Poniedziałek tygodnia, `YYYY-MM-DD` (rozkład zawsze zaczyna się od poniedziałku). */
  monday: z.string().check(z.regex(ISO_DATE)),
  theme: z.enum(THEME_IDS),
  days: z.array(daySchema).check(z.length(7)),
});

export type DayPlan = z.infer<typeof daySchema>;
export type WeekPlan = z.infer<typeof planSchema>;
export type DayKind = 'active' | 'inactive' | 'additional';

export const isActive = (day: DayPlan): boolean => !!day.from && !!day.to;

export function dayKind(day: DayPlan): DayKind {
  if (!isActive(day)) return 'inactive';
  return day.additional ? 'additional' : 'active';
}

// ---------- Daty (liczymy w UTC – bez niespodzianek przy zmianie czasu) ----------

const toIso = (date: Date): string => date.toISOString().slice(0, 10);
const fromIso = (iso: string): Date => new Date(`${iso}T00:00:00Z`);

export function addDays(iso: string, days: number): string {
  const date = fromIso(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return toIso(date);
}

/** Poniedziałek tygodnia, w którym leży `iso`. Nieprawidłowa data → `null`. */
export function mondayOf(iso: string): string | null {
  if (!ISO_DATE.test(iso) || Number.isNaN(fromIso(iso).getTime())) return null;
  const weekday = (fromIso(iso).getUTCDay() + 6) % 7; // 0 = poniedziałek
  return addDays(iso, -weekday);
}

/** Domyślny tydzień nowego rozkładu: najbliższy poniedziałek (dziś, jeśli jest poniedziałek). */
export function upcomingMonday(today = new Date()): string {
  const local = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const monday = mondayOf(local)!;
  return monday === local ? monday : addDays(monday, 7);
}

const dayMonth = (iso: string): string => `${iso.slice(8, 10)}.${iso.slice(5, 7)}`;

/** „09.11–15.11” – zakres pon.–niedz. w nagłówku grafiki. */
export const weekRange = (monday: string): string =>
  `${dayMonth(monday)}–${dayMonth(addDays(monday, 6))}`;

/** Jednolity zapis godzin na każdej grafice: „18:00–22:00”. */
export const formatHours = (day: DayPlan): string => `${day.from}–${day.to}`;

// ---------- Tworzenie i zmiany ----------

const emptyDay = (icon: string): DayPlan => ({
  from: '',
  to: '',
  additional: false,
  icon,
  image: null,
  stamp: false,
  caption: '',
});

export function createPlan(monday: string, theme: ThemeId, random?: () => number): WeekPlan {
  return { monday, theme, days: dealIcons(ICON_SET[theme], 7, random).map(emptyDay) };
}

/**
 * „Nowy rozkład”: wszystko wyzerowane, ikony wylosowane od nowa. Tydzień to następny po
 * zapisanym, ale nigdy miniony – po przerwie (zapisany rozkład sprzed miesiąca) zaczynamy
 * od najbliższego poniedziałku. Daty ISO porównuje się poprawnie jako zwykłe napisy.
 */
export function nextWeek(plan: WeekPlan, today = new Date(), random?: () => number): WeekPlan {
  const following = addDays(plan.monday, 7);
  const upcoming = upcomingMonday(today);
  return createPlan(following > upcoming ? following : upcoming, plan.theme, random);
}

export function withIcons(plan: WeekPlan, random?: () => number): WeekPlan {
  const icons = dealIcons(ICON_SET[plan.theme], 7, random);
  return { ...plan, days: plan.days.map((day, i) => ({ ...day, icon: icons[i]! })) };
}

/** Zmiana motywu. Gdy nowy motyw ma inny zestaw ikon, stare ikony nie istnieją – losujemy nowe. */
export function withTheme(plan: WeekPlan, theme: ThemeId, random?: () => number): WeekPlan {
  const next = { ...plan, theme };
  return ICON_SET[theme] === ICON_SET[plan.theme] ? next : withIcons(next, random);
}

/** Odczyt z walidacją: brak/uszkodzony/stary JSON → pusty rozkład na najbliższy tydzień. */
export function parsePlan(raw: string | null, today = new Date()): WeekPlan {
  const fallback = () => createPlan(upcomingMonday(today), 'autumn');
  if (!raw) return fallback();
  try {
    const result = planSchema.safeParse(JSON.parse(raw));
    if (!result.success || mondayOf(result.data.monday) !== result.data.monday) return fallback();
    const plan = result.data;
    const set = ICON_SET[plan.theme];
    // Ikona usunięta z katalogu w nowszej wersji strony → losujemy cały zestaw od nowa.
    return plan.days.every((day) => isIconOf(day.icon, set)) ? plan : withIcons(plan);
  } catch {
    return fallback();
  }
}
