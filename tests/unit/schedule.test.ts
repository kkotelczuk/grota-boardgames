import { describe, expect, it } from 'vitest';
import { ICONS, dealIcons, iconsOf } from '@/lib/schedule/icons';
import { WIDTH, computeSlots, contain, paintOrder, type RowLayout } from '@/lib/schedule/layout';
import {
  ICON_SET,
  createPlan,
  dayKind,
  formatHours,
  mondayOf,
  nextWeek,
  parsePlan,
  upcomingMonday,
  weekRange,
  withTheme,
  type DayKind,
  type WeekPlan,
} from '@/lib/schedule/plan';

/** Deterministyczny generator (LCG) – losowanie w testach jest powtarzalne. */
function seeded(seed: number): () => number {
  let state = seed;
  return () => (state = (state * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32;
}

const open = (plan: WeekPlan, index: number, from = '18:00', to = '22:00'): WeekPlan => ({
  ...plan,
  days: plan.days.map((day, i) => (i === index ? { ...day, from, to } : day)),
});

describe('dates', () => {
  it('snaps any day to the Monday of its week', () => {
    expect(mondayOf('2026-11-09')).toBe('2026-11-09'); // poniedziałek
    expect(mondayOf('2026-11-12')).toBe('2026-11-09');
    expect(mondayOf('2026-11-15')).toBe('2026-11-09'); // niedziela należy do tego samego tygodnia
    expect(mondayOf('2026-11-01')).toBe('2026-10-26'); // przez granicę miesiąca
    expect(mondayOf('nope')).toBeNull();
  });

  it('formats the Monday–Sunday range, also across months and years', () => {
    expect(weekRange('2026-11-09')).toBe('09.11–15.11');
    expect(weekRange('2026-10-26')).toBe('26.10–01.11');
    expect(weekRange('2026-12-28')).toBe('28.12–03.01');
  });

  it('defaults to the upcoming Monday (today if it is one)', () => {
    expect(upcomingMonday(new Date(2026, 10, 9))).toBe('2026-11-09');
    expect(upcomingMonday(new Date(2026, 10, 10))).toBe('2026-11-16');
    expect(upcomingMonday(new Date(2026, 10, 15))).toBe('2026-11-16');
  });
});

describe('dealIcons', () => {
  it('gives 7 different standard icons when the pool is big enough', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const icons = dealIcons('line', 7, seeded(seed));
      expect(new Set(icons).size).toBe(7);
    }
  });

  it('never deals occasional icons (Star Wars, racing, crown, Death Star)', () => {
    const special = new Set<string>(ICONS.filter((icon) => !icon.standard).map((icon) => icon.id));
    for (let seed = 1; seed <= 50; seed++) {
      for (const set of ['line', 'summer'] as const) {
        expect(dealIcons(set, 7, seeded(seed)).some((id) => special.has(id))).toBe(false);
      }
    }
  });

  it('with a small pool repeats as little as possible and never on neighbouring days', () => {
    const pool = iconsOf('summer').filter((icon) => icon.standard).length;
    for (let seed = 1; seed <= 200; seed++) {
      const icons = dealIcons('summer', 7, seeded(seed));
      expect(new Set(icons).size).toBe(pool); // każda ikona użyta, zanim którakolwiek się powtórzy
      icons.forEach((icon, i) => expect(icon).not.toBe(icons[i + 1]));
    }
  });
});

describe('plan', () => {
  const plan = createPlan('2026-11-09', 'autumn', seeded(1));

  it('a day is active only with both hours; "additional" needs an active day', () => {
    expect(plan.days.map(dayKind)).toEqual(Array(7).fill('inactive'));
    const half = { ...plan.days[0]!, from: '18:00' };
    expect(dayKind(half)).toBe('inactive');
    expect(dayKind({ ...half, to: '22:00' })).toBe('active');
    expect(dayKind({ ...half, to: '22:00', additional: true })).toBe('additional');
    expect(dayKind({ ...plan.days[0]!, additional: true })).toBe('inactive');
  });

  it('formats hours the same way on every graphic', () => {
    expect(formatHours({ ...plan.days[0]!, from: '17:30', to: '00:00' })).toBe('17:30–00:00');
  });

  it('new schedule: next week, everything cleared, theme kept', () => {
    const edited: WeekPlan = {
      ...open(plan, 2),
      theme: 'winter',
      days: open(plan, 2).days.map((day) => ({ ...day, stamp: true, caption: 'Turniej' })),
    };
    const next = nextWeek(edited, new Date(2026, 10, 10), seeded(2));
    expect(next.monday).toBe('2026-11-16');
    expect(next.theme).toBe('winter');
    expect(next.days.every((d) => !d.from && !d.to && !d.stamp && !d.caption && !d.image)).toBe(
      true,
    );
    expect(new Set(next.days.map((d) => d.icon)).size).toBe(7);
  });

  it('new schedule never lands in the past and keeps going forward when planning ahead', () => {
    expect(nextWeek(plan, new Date(2027, 0, 5)).monday).toBe('2027-01-11');
    expect(nextWeek(plan, new Date(2026, 9, 1)).monday).toBe('2026-11-16');
  });

  it('changing theme re-deals icons only when the icon set changes', () => {
    expect(withTheme(plan, 'winter').days.map((d) => d.icon)).toEqual(plan.days.map((d) => d.icon));
    const summer = withTheme(open(plan, 0), 'summer', seeded(3));
    expect(summer.days[0]!.from).toBe('18:00'); // godziny zostają
    const summerIds = new Set(iconsOf(ICON_SET.summer).map((icon) => icon.id));
    expect(summer.days.every((d) => summerIds.has(d.icon))).toBe(true);
  });

  it('parsePlan round-trips a valid plan and falls back on garbage', () => {
    const today = new Date(2026, 10, 10);
    expect(parsePlan(JSON.stringify(open(plan, 1)), today)).toEqual(open(plan, 1));
    for (const raw of [
      null,
      '',
      '{',
      '{"monday":"2026-11-10"}',
      JSON.stringify({ ...plan, days: [] }),
    ]) {
      const fallback = parsePlan(raw, today);
      expect(fallback.monday).toBe('2026-11-16');
      expect(fallback.days).toHaveLength(7);
    }
    // wtorek jako „poniedziałek” i godzina spoza zakresu też są odrzucane
    expect(parsePlan(JSON.stringify({ ...plan, monday: '2026-11-10' }), today).monday).toBe(
      '2026-11-16',
    );
    expect(parsePlan(JSON.stringify(open(plan, 0, '25:00')), today).days[0]!.from).toBe('');
  });

  it('parsePlan re-deals icons that no longer exist in the catalogue', () => {
    const stale = { ...plan, days: plan.days.map((d) => ({ ...d, icon: 'removed-icon' })) };
    const ids = new Set(iconsOf('line').map((icon) => icon.id));
    expect(parsePlan(JSON.stringify(stale)).days.every((d) => ids.has(d.icon))).toBe(true);
  });
});

describe('computeSlots', () => {
  const row: RowLayout = {
    left: 28,
    right: 1892,
    centerY: 482,
    gap: 6,
    inactiveWidth: 212,
    maxActiveWidth: 310,
    additionalRotation: (14 * Math.PI) / 180,
    additionalLift: 0.15,
    additionalShift: 0.07,
    uniform: false,
  };
  const RATIO = 444 / 322;
  const kinds = (pattern: string): DayKind[] =>
    [...pattern].map((c) => (c === 'A' ? 'active' : c === '+' ? 'additional' : 'inactive'));
  const edges = (slot: { cx: number; width: number }) => [
    slot.cx - slot.width / 2,
    slot.cx + slot.width / 2,
  ];

  it.each(['AAAAAAA', '-AAAA--', 'A------', '-------', 'AAAAA--', '--A-A-A'])(
    '%s: evenly spaced, centred, inside the row, no overlaps',
    (pattern) => {
      const slots = computeSlots(kinds(pattern), row, RATIO);
      expect(slots).toHaveLength(7);
      slots.forEach((slot, i) => {
        if (i) expect(edges(slot)[0]! - edges(slots[i - 1]!)[1]!).toBeCloseTo(row.gap);
        expect(slot.cy).toBe(row.centerY);
        expect(slot.rotation).toBe(0);
      });
      const [first, last] = [edges(slots[0]!)[0]!, edges(slots[6]!)[1]!];
      expect(first).toBeGreaterThanOrEqual(row.left - 0.01);
      expect(last).toBeLessThanOrEqual(row.right + 0.01);
      expect(first - row.left).toBeCloseTo(row.right - last); // wyśrodkowane
    },
  );

  it('active cards are equal, bigger than inactive, and capped when few', () => {
    const full = computeSlots(kinds('AAAAAAA'), row, RATIO);
    expect(new Set(full.map((s) => Math.round(s.width))).size).toBe(1);
    const mixed = computeSlots(kinds('-AAAA--'), row, RATIO);
    expect(mixed[1]!.width).toBeGreaterThan(mixed[0]!.width);
    expect(mixed[0]!.width).toBe(row.inactiveWidth);
    expect(computeSlots(kinds('A------'), row, RATIO)[0]!.width).toBe(row.maxActiveWidth);
  });

  it('adding a last-minute day does not move the other cards', () => {
    const before = computeSlots(kinds('-AAAA--'), row, RATIO);
    const after = computeSlots(kinds('-AAAA+-'), row, RATIO);
    [0, 1, 2, 3, 4, 6].forEach((i) => expect(after[i]).toEqual(before[i]));
    const added = after[5]!;
    expect(added.width).toBe(before[1]!.width); // rozmiar karty aktywnej
    expect(added.rotation).toBeGreaterThan(0);
    expect(added.cy).toBeLessThan(row.centerY); // uniesiona
  });

  it('a rotated last-minute card stays inside the graphic, even on Sunday or Monday', () => {
    for (const pattern of ['AAAAAA+', '+AAAAAA', '------+', '+++++++']) {
      for (const slot of computeSlots(kinds(pattern), row, RATIO)) {
        if (slot.kind !== 'additional') continue;
        const height = slot.width * RATIO;
        const reach = (slot.width * Math.cos(slot.rotation) + height * Math.sin(slot.rotation)) / 2;
        expect(slot.cx - reach).toBeGreaterThanOrEqual(0);
        expect(slot.cx + reach).toBeLessThanOrEqual(WIDTH);
        const rise = (slot.width * Math.sin(slot.rotation) + height * Math.cos(slot.rotation)) / 2;
        expect(slot.cy - rise).toBeGreaterThan(160); // nie wchodzi na datę w nagłówku
      }
    }
  });

  it('uniform rows (summer) give every day the same card', () => {
    const slots = computeSlots(kinds('-AAAA+-'), { ...row, uniform: true }, 327 / 144);
    expect(new Set(slots.map((s) => Math.round(s.width))).size).toBe(1);
  });

  it('paints inactive first, then active, then last-minute cards on top', () => {
    const slots = computeSlots(kinds('A-+A-'.padEnd(7, '-')), row, RATIO);
    expect(paintOrder(slots)).toEqual([1, 4, 5, 6, 0, 3, 2]);
  });
});

describe('contain', () => {
  it('fits an image into a box keeping its proportions', () => {
    expect(contain(200, 100, 100, 100)).toEqual({ w: 100, h: 50 });
    expect(contain(100, 400, 100, 100)).toEqual({ w: 25, h: 100 });
    expect(contain(10, 10, 100, 60)).toEqual({ w: 60, h: 60 }); // małe obrazki są powiększane
  });
});
