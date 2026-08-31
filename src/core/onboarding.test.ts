import { describe, expect, it } from '@jest/globals';

import {
  birthYearQuickChoices,
  birthYearRange,
  isSelectableStartDate,
  notSureAnchor,
  parseNumberInput,
  quickDateChoices,
  recentDateOptions,
  reseedPlan,
  resolveOnboarding,
} from './onboarding';

describe('recentDateOptions', () => {
  it('is today back to today − 90, newest first', () => {
    const opts = recentDateOptions('2025-06-15');
    expect(opts).toHaveLength(91);
    expect(opts[0]).toBe('2025-06-15');
    expect(opts[90]).toBe('2025-03-17');
  });
});

describe('isSelectableStartDate', () => {
  it('rejects future dates and anything older than 90 days', () => {
    expect(isSelectableStartDate('2025-06-15', '2025-06-15')).toBe(true);
    expect(isSelectableStartDate('2025-06-15', '2025-03-17')).toBe(true);
    expect(isSelectableStartDate('2025-06-15', '2025-06-16')).toBe(false);
    expect(isSelectableStartDate('2025-06-15', '2025-03-16')).toBe(false);
  });
});

describe('notSureAnchor', () => {
  it('is today minus the reported cycle length', () => {
    expect(notSureAnchor('2025-06-15', 28)).toBe('2025-05-18');
  });
});

describe('birthYearRange', () => {
  it('runs from currentYear − 9 down to currentYear − 60', () => {
    const years = birthYearRange(2026);
    expect(years[0]).toBe(2017);
    expect(years[years.length - 1]).toBe(1966);
    expect(years).toHaveLength(52);
  });
});

describe('resolveOnboarding', () => {
  it('with an explicit date: seeds the reported period, marks complete', () => {
    const result = resolveOnboarding(
      {
        lastPeriodStart: '2025-08-20',
        reportedCycleLength: 30,
        reportedPeriodLength: 4,
        birthYear: 1995,
      },
      '2025-08-31',
    );
    expect(result.anchorDate).toBe('2025-08-20');
    expect(result.seedLogs).toEqual([
      { date: '2025-08-20', flow: 'medium' },
      { date: '2025-08-21', flow: 'medium' },
      { date: '2025-08-22', flow: 'medium' },
      { date: '2025-08-23', flow: 'medium' },
    ]);
    expect(result.settings).toEqual({
      onboarding_complete: true,
      birth_year: 1995,
      reported_cycle_length: 30,
      reported_period_length: 4,
    });
  });

  it('"I\'m not sure": anchors to today − final cycle length', () => {
    const result = resolveOnboarding(
      {
        lastPeriodStart: null,
        reportedCycleLength: 28,
        reportedPeriodLength: 5,
        birthYear: null,
      },
      '2025-08-31',
    );
    expect(result.anchorDate).toBe('2025-08-03'); // 2025-08-31 − 28
    expect(result.seedLogs[0]).toEqual({ date: '2025-08-03', flow: 'medium' });
    expect(result.seedLogs).toHaveLength(5);
    expect(result.settings.birth_year).toBeNull();
  });

  it('clamps out-of-range reported values', () => {
    const result = resolveOnboarding(
      { lastPeriodStart: '2025-08-20', reportedCycleLength: 99, reportedPeriodLength: 0, birthYear: null },
      '2025-08-31',
    );
    expect(result.settings.reported_cycle_length).toBe(45);
    expect(result.settings.reported_period_length).toBe(1);
  });
});

describe('parseNumberInput (§6.1 typed answers)', () => {
  it('accepts a value inside the range', () => {
    expect(parseNumberInput('31', 21, 45)).toEqual({ value: 31, error: null });
  });

  it('tolerates surrounding whitespace', () => {
    expect(parseNumberInput('  5 ', 1, 10)).toEqual({ value: 5, error: null });
  });

  it('reports an empty field without inventing a value', () => {
    expect(parseNumberInput('', 21, 45)).toEqual({ value: null, error: 'empty' });
  });

  it('rejects anything that is not a whole number', () => {
    expect(parseNumberInput('28.5', 21, 45).error).toBe('notANumber');
    expect(parseNumberInput('-3', 21, 45).error).toBe('notANumber');
    expect(parseNumberInput('two', 21, 45).error).toBe('notANumber');
  });

  it('reports out of range rather than clamping', () => {
    expect(parseNumberInput('20', 21, 45)).toEqual({ value: null, error: 'outOfRange' });
    expect(parseNumberInput('46', 21, 45)).toEqual({ value: null, error: 'outOfRange' });
  });

  it('accepts the exact boundaries', () => {
    expect(parseNumberInput('21', 21, 45).value).toBe(21);
    expect(parseNumberInput('45', 21, 45).value).toBe(45);
  });
});

describe('quickDateChoices (§6.1 step 2 chips)', () => {
  it('resolves each offset against today', () => {
    expect(quickDateChoices('2025-08-31')).toEqual([
      { offsetDays: 0, iso: '2025-08-31' },
      { offsetDays: 1, iso: '2025-08-30' },
      { offsetDays: 3, iso: '2025-08-28' },
      { offsetDays: 7, iso: '2025-08-24' },
      { offsetDays: 14, iso: '2025-08-17' },
    ]);
  });

  it('crosses a month boundary correctly', () => {
    expect(quickDateChoices('2025-09-02', [7])).toEqual([{ offsetDays: 7, iso: '2025-08-26' }]);
  });
});

describe('reseedPlan (§6.7 re-seed rule)', () => {
  it('clears the old seeded days and seeds the new range', () => {
    const plan = reseedPlan({ start: '2025-08-01', end: '2025-08-05' }, '2025-08-20', 5);
    expect(plan.clear).toEqual([
      '2025-08-01',
      '2025-08-02',
      '2025-08-03',
      '2025-08-04',
      '2025-08-05',
    ]);
    expect(plan.seed).toHaveLength(5);
    expect(plan.seed[0]).toEqual({ date: '2025-08-20', flow: 'medium' });
    expect(plan.range).toEqual({ start: '2025-08-20', end: '2025-08-24' });
  });

  it('never clears a day the user has touched', () => {
    const plan = reseedPlan({ start: '2025-08-01', end: '2025-08-05' }, '2025-08-20', 5, [
      '2025-08-03',
    ]);
    expect(plan.clear).not.toContain('2025-08-03');
    expect(plan.clear).toHaveLength(4);
  });

  it('does not clear a day the new range will rewrite anyway', () => {
    const plan = reseedPlan({ start: '2025-08-01', end: '2025-08-05' }, '2025-08-03', 5);
    expect(plan.clear).toEqual(['2025-08-01', '2025-08-02']);
    expect(plan.range).toEqual({ start: '2025-08-03', end: '2025-08-07' });
  });

  it('clears nothing when there was no seeded range', () => {
    const plan = reseedPlan(null, '2025-08-20', 1);
    expect(plan.clear).toEqual([]);
    expect(plan.seed).toEqual([{ date: '2025-08-20', flow: 'medium' }]);
    expect(plan.range).toEqual({ start: '2025-08-20', end: '2025-08-20' });
  });

  it('handles the longest valid period', () => {
    const plan = reseedPlan(null, '2025-08-20', 10);
    expect(plan.seed).toHaveLength(10);
    expect(plan.range.end).toBe('2025-08-29');
  });
});

describe('birthYearQuickChoices (§6.1 step 5 chips)', () => {
  it('returns years for each requested age, oldest last', () => {
    expect(birthYearQuickChoices(2025)).toEqual([2010, 2005, 2000, 1995, 1985]);
  });

  it('drops an age outside the allowed 9-60 range', () => {
    expect(birthYearQuickChoices(2025, [5, 15, 70])).toEqual([2010]);
  });
});
