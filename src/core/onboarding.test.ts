import { describe, expect, it } from '@jest/globals';

import {
  birthYearRange,
  isSelectableStartDate,
  notSureAnchor,
  recentDateOptions,
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
