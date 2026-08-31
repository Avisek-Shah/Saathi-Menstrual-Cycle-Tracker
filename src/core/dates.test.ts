import { describe, expect, it } from '@jest/globals';

import { addDays, daysBetween, isIsoDate } from './dates';

describe('addDays', () => {
  it('is identity at offset 0 (regression: no UTC round-trip)', () => {
    // The old `new Date(iso).toISOString().slice(0,10)` returned 2025-12-31 here in UTC+.
    expect(addDays('2026-01-01', 0)).toBe('2026-01-01');
    expect(addDays('2025-07-15', 0)).toBe('2025-07-15');
  });

  it('crosses month and year boundaries', () => {
    expect(addDays('2025-01-31', 1)).toBe('2025-02-01');
    expect(addDays('2025-12-31', 1)).toBe('2026-01-01');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29'); // leap year
    expect(addDays('2025-02-28', 1)).toBe('2025-03-01');
  });

  it('goes backwards', () => {
    expect(addDays('2025-03-01', -1)).toBe('2025-02-28');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2025-06-10', -28)).toBe('2025-05-13');
  });

  it('rejects malformed input', () => {
    expect(() => addDays('2025-1-1', 0)).toThrow();
    expect(() => addDays('not-a-date', 0)).toThrow();
  });
});

describe('daysBetween', () => {
  it('counts whole calendar days, sign follows direction', () => {
    expect(daysBetween('2025-01-01', '2025-01-01')).toBe(0);
    expect(daysBetween('2025-01-01', '2025-01-02')).toBe(1);
    expect(daysBetween('2025-01-02', '2025-01-01')).toBe(-1);
    expect(daysBetween('2025-01-01', '2025-02-15')).toBe(45);
    expect(daysBetween('2025-01-06', '2025-03-03')).toBe(56); // two 28-day cycles
  });
});

describe('isIsoDate', () => {
  it('accepts YYYY-MM-DD only', () => {
    expect(isIsoDate('2025-08-31')).toBe(true);
    expect(isIsoDate('2025-13-01')).toBe(false);
    expect(isIsoDate('2025-8-1')).toBe(false);
    expect(isIsoDate('2025/08/31')).toBe(false);
  });
});
