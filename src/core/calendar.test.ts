import { describe, expect, it } from '@jest/globals';

import {
  addMonth,
  BS_MONTH_NAMES,
  currentBsMonth,
  currentBsYear,
  daysUntilMonth,
  formatDate,
  formatDateRange,
  getMonthGrid,
} from './calendar';

describe('formatDate (AD)', () => {
  it('formats with the default and custom patterns', () => {
    expect(formatDate('2025-08-31')).toBe('31 Aug 2025');
    expect(formatDate('2025-01-05', 'AD', 'EEE d MMM')).toBe('Sun 5 Jan');
  });
});

describe('formatDate (BS) — §9 known AD↔BS pairs', () => {
  it('converts Nepali New Year: AD 2026-04-14 is Baisakh 1, 2083', () => {
    expect(formatDate('2026-04-14', 'BS')).toBe('1 Bai 2083');
    expect(formatDate('2026-04-14', 'BS', 'd MMMM yyyy')).toBe('1 Baisakh 2083');
  });

  it('converts AD 2026-08-31 to Bhadra 15, 2083', () => {
    expect(formatDate('2026-08-31', 'BS', 'd MMMM yyyy')).toBe('15 Bhadra 2083');
  });

  it('uses the §9 transliteration, not the library spelling', () => {
    // The library spells these "Asar" and "Aswin"; §9 mandates "Ashadh" and "Ashwin".
    expect(BS_MONTH_NAMES[2]).toBe('Ashadh');
    expect(BS_MONTH_NAMES[5]).toBe('Ashwin');
    // Ashadh 1, 2083 = AD 2026-06-15.
    expect(formatDate('2026-06-15', 'BS', 'd MMMM yyyy')).toBe('1 Ashadh 2083');
  });

  it('differs from the AD date it was converted from', () => {
    // Regression guard: BS must not silently fall through to AD (the pre-M5 behaviour).
    expect(formatDate('2026-08-31', 'BS')).not.toBe(formatDate('2026-08-31', 'AD'));
  });
});

describe('formatDateRange', () => {
  it('collapses a shared month in AD', () => {
    expect(formatDateRange('2025-08-12', '2025-08-16')).toBe('12–16 Aug 2025');
  });
  it('keeps both months when they differ', () => {
    expect(formatDateRange('2025-08-30', '2025-09-02')).toBe('30 Aug – 2 Sep 2025');
  });
  it('spells out both when the year differs', () => {
    expect(formatDateRange('2025-12-30', '2026-01-02')).toBe('30 Dec 2025 – 2 Jan 2026');
  });
  it('spells out both ends in BS', () => {
    expect(formatDateRange('2026-04-14', '2026-04-20', 'BS')).toBe('1 Bai 2083 – 7 Bai 2083');
  });
});

describe('getMonthGrid (AD)', () => {
  it('is always 42 cells and starts on a Sunday', () => {
    const grid = getMonthGrid(2026, 8, 'AD', '2026-08-31');
    expect(grid.cells).toHaveLength(42);
    expect(grid.cells[0].weekday).toBe(0);
    expect(grid.cells.every((c, i) => c.weekday === i % 7)).toBe(true);
  });

  it('places 1 August 2026 (a Saturday) in the last column of row 1', () => {
    const grid = getMonthGrid(2026, 8, 'AD', '2026-08-31');
    const first = grid.cells.findIndex((c) => !c.fill);
    expect(first).toBe(6); // Sat = index 6
    expect(grid.cells[first]).toMatchObject({ iso: '2026-08-01', day: 1, fill: false });
  });

  it('contains every day of the month exactly once, in order', () => {
    const grid = getMonthGrid(2026, 8, 'AD', '2026-08-31');
    const real = grid.cells.filter((c) => !c.fill);
    expect(real).toHaveLength(31); // August
    expect(real.map((c) => c.day)).toEqual(Array.from({ length: 31 }, (_, i) => i + 1));
    expect(real[30].iso).toBe('2026-08-31');
  });

  it('handles a leap February', () => {
    const grid = getMonthGrid(2024, 2, 'AD', '2024-02-15');
    expect(grid.cells.filter((c) => !c.fill)).toHaveLength(29);
  });

  it('titles the month and marks the current one', () => {
    expect(getMonthGrid(2026, 8, 'AD', '2026-08-31').title).toBe('August 2026');
    expect(getMonthGrid(2026, 8, 'AD', '2026-08-31').isCurrentMonth).toBe(true);
    expect(getMonthGrid(2026, 7, 'AD', '2026-08-31').isCurrentMonth).toBe(false);
  });

  it('fill cells carry the real neighbouring dates, not blanks', () => {
    const grid = getMonthGrid(2026, 8, 'AD', '2026-08-31');
    // The six leading fills are 26–31 July 2026.
    expect(grid.cells.slice(0, 6).map((c) => c.iso)).toEqual([
      '2026-07-26',
      '2026-07-27',
      '2026-07-28',
      '2026-07-29',
      '2026-07-30',
      '2026-07-31',
    ]);
  });
});

describe('getMonthGrid (BS) — §9 re-gridding, not relabelling', () => {
  it('re-grids to the BS month length: Ashadh 2083 has 32 days', () => {
    const grid = getMonthGrid(2083, 3, 'BS', '2026-08-31');
    const real = grid.cells.filter((c) => !c.fill);
    expect(real).toHaveLength(32);
    expect(real.map((c) => c.day)).toEqual(Array.from({ length: 32 }, (_, i) => i + 1));
  });

  it('a 32-day BS month spans two AD months', () => {
    const grid = getMonthGrid(2083, 3, 'BS', '2026-08-31');
    const real = grid.cells.filter((c) => !c.fill);
    expect(real[0].iso).toBe('2026-06-15');
    expect(real[31].iso).toBe('2026-07-16');
    expect(grid.title).toBe('Ashadh 2083');
    // §6.3 — AD range as the subtitle in BS mode.
    expect(grid.subtitle).toBe('15 Jun – 16 Jul 2026');
  });

  it('BS month lengths vary (29–32), unlike a relabelled Gregorian grid', () => {
    const lengths = Array.from(
      { length: 12 },
      (_, i) => getMonthGrid(2083, i + 1, 'BS', '2026-08-31').cells.filter((c) => !c.fill).length,
    );
    expect(lengths).toEqual([31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30]);
    expect(Math.min(...lengths)).toBeGreaterThanOrEqual(29);
    expect(Math.max(...lengths)).toBeLessThanOrEqual(32);
  });

  it('is 42 cells and Sunday-aligned like the AD grid', () => {
    const grid = getMonthGrid(2083, 1, 'BS', '2026-08-31');
    expect(grid.cells).toHaveLength(42);
    expect(grid.cells.every((c, i) => c.weekday === i % 7)).toBe(true);
  });

  it('Baisakh 1, 2083 is AD 2026-04-14, a Tuesday', () => {
    const grid = getMonthGrid(2083, 1, 'BS', '2026-08-31');
    const first = grid.cells.find((c) => !c.fill);
    expect(first).toMatchObject({ iso: '2026-04-14', day: 1, weekday: 2 });
  });

  it('cell ISO dates are consecutive across the whole month', () => {
    const real = getMonthGrid(2083, 3, 'BS', '2026-08-31').cells.filter((c) => !c.fill);
    for (let i = 1; i < real.length; i++) {
      const prev = new Date(real[i - 1].iso).getTime();
      const cur = new Date(real[i].iso).getTime();
      expect(cur - prev).toBe(86_400_000);
    }
  });

  it('marks the BS month the user is currently in', () => {
    // AD 2026-08-31 is Bhadra (month 5) 2083.
    expect(currentBsMonth('2026-08-31')).toBe(5);
    expect(currentBsYear('2026-08-31')).toBe(2083);
    expect(getMonthGrid(2083, 5, 'BS', '2026-08-31').isCurrentMonth).toBe(true);
    expect(getMonthGrid(2083, 4, 'BS', '2026-08-31').isCurrentMonth).toBe(false);
  });

  it('refuses an unsupported year or month rather than rendering nonsense', () => {
    expect(() => getMonthGrid(2083, 13, 'BS', '2026-08-31')).toThrow();
    expect(() => getMonthGrid(2083, 0, 'BS', '2026-08-31')).toThrow();
    expect(() => getMonthGrid(1900, 1, 'BS', '2026-08-31')).toThrow();
  });
});

describe('addMonth', () => {
  it('steps forward and back across a year boundary', () => {
    expect(addMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(addMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
    expect(addMonth(2026, 8, 0)).toEqual({ year: 2026, month: 8 });
    expect(addMonth(2026, 8, 3)).toEqual({ year: 2026, month: 11 });
    expect(addMonth(2026, 11, 3)).toEqual({ year: 2027, month: 2 });
  });

  it('works the same for BS year numbers', () => {
    expect(addMonth(2083, 12, 1)).toEqual({ year: 2084, month: 1 });
    expect(addMonth(2083, 1, -1)).toEqual({ year: 2082, month: 12 });
  });
});

describe('daysUntilMonth', () => {
  it('is negative for a past month and positive for a future one (AD)', () => {
    expect(daysUntilMonth('2026-08-31', 2026, 8, 'AD')).toBe(-30);
    expect(daysUntilMonth('2026-08-31', 2026, 9, 'AD')).toBe(1);
  });

  it('measures to the first AD day of a BS month', () => {
    // Baisakh 1, 2083 = AD 2026-04-14, which is before 2026-08-31.
    expect(daysUntilMonth('2026-04-14', 2083, 1, 'BS')).toBe(0);
    expect(daysUntilMonth('2026-04-13', 2083, 1, 'BS')).toBe(1);
  });
});
