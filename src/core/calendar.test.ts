import { describe, expect, it } from '@jest/globals';

import { formatDate, formatDateRange } from './calendar';

describe('formatDate (AD)', () => {
  it('formats with the default and custom patterns', () => {
    expect(formatDate('2025-08-31')).toBe('31 Aug 2025');
    expect(formatDate('2025-01-05', 'AD', 'EEE d MMM')).toBe('Sun 5 Jan');
  });

  it('BS falls through to AD until M5', () => {
    expect(formatDate('2025-08-31', 'BS')).toBe('31 Aug 2025');
  });
});

describe('formatDateRange (AD)', () => {
  it('collapses a shared month', () => {
    expect(formatDateRange('2025-08-12', '2025-08-16')).toBe('12–16 Aug 2025');
  });
  it('keeps both months when they differ', () => {
    expect(formatDateRange('2025-08-30', '2025-09-02')).toBe('30 Aug – 2 Sep 2025');
  });
  it('spells out both when the year differs', () => {
    expect(formatDateRange('2025-12-30', '2026-01-02')).toBe('30 Dec 2025 – 2 Jan 2026');
  });
});
