import { describe, expect, it } from '@jest/globals';

import { recomputePeriods, type FlowLog } from './periods';

const bleed = (dates: string[]): FlowLog[] => dates.map((date) => ({ date, flow: 'medium' }));

describe('recomputePeriods — run grouping by gap (§4.5 step 2)', () => {
  it('gap 0: a duplicate date collapses to one flow day', () => {
    const periods = recomputePeriods(bleed(['2025-03-01', '2025-03-01']));
    expect(periods).toHaveLength(1);
    expect(periods[0]).toMatchObject({
      start_date: '2025-03-01',
      end_date: '2025-03-01',
      length_days: 1,
    });
  });

  it('gap 1 (consecutive days): one period', () => {
    const periods = recomputePeriods(bleed(['2025-03-01', '2025-03-02']));
    expect(periods).toHaveLength(1);
    expect(periods[0].length_days).toBe(2);
  });

  it('gap 2 (one empty day): stays one period', () => {
    const periods = recomputePeriods(bleed(['2025-03-01', '2025-03-03']));
    expect(periods).toHaveLength(1);
    expect(periods[0]).toMatchObject({
      start_date: '2025-03-01',
      end_date: '2025-03-03',
      length_days: 3,
    });
  });

  it('gap 3 (two empty days): splits into two periods', () => {
    const periods = recomputePeriods(bleed(['2025-03-01', '2025-03-04']));
    expect(periods).toHaveLength(2);
    expect(periods[0]).toMatchObject({ start_date: '2025-03-01', length_days: 1 });
    expect(periods[1]).toMatchObject({ start_date: '2025-03-04', length_days: 1 });
  });
});

describe('recomputePeriods — shape', () => {
  it('a single day of flow is a period of length 1 (§10.4)', () => {
    const periods = recomputePeriods(bleed(['2025-05-09']));
    expect(periods).toEqual([
      {
        start_date: '2025-05-09',
        end_date: '2025-05-09',
        length_days: 1,
        cycle_length: null,
        is_outlier: false,
      },
    ]);
  });

  it('ignores flow === "none" and is order-independent', () => {
    const logs: FlowLog[] = [
      { date: '2025-06-05', flow: 'none' },
      { date: '2025-06-03', flow: 'medium' },
      { date: '2025-06-01', flow: 'light' },
      { date: '2025-06-02', flow: 'heavy' },
    ];
    const periods = recomputePeriods(logs);
    expect(periods).toHaveLength(1);
    expect(periods[0]).toMatchObject({
      start_date: '2025-06-01',
      end_date: '2025-06-03',
      length_days: 3,
    });
  });

  it('covers a period at the very start and very end of the dataset', () => {
    const periods = recomputePeriods(
      bleed(['2025-01-01', '2025-01-02', '2025-01-29', '2025-01-30']),
    );
    expect(periods).toHaveLength(2);
    expect(periods[0].start_date).toBe('2025-01-01'); // first period bounds the dataset start
    expect(periods[1].end_date).toBe('2025-01-30'); // last period bounds the dataset end
    expect(periods[1].cycle_length).toBeNull(); // most recent period has no cycle length
    expect(periods[0].cycle_length).toBe(28); // 01-01 -> 01-29
  });
});

describe('recomputePeriods — outlier flagging on cycle length (§4.5 step 5)', () => {
  const twoPeriods = (secondStart: string) => recomputePeriods(bleed(['2025-01-01', secondStart]));

  it('20 days is an outlier (below 21)', () => {
    expect(twoPeriods('2025-01-21')[0]).toMatchObject({ cycle_length: 20, is_outlier: true });
  });
  it('21 days is valid', () => {
    expect(twoPeriods('2025-01-22')[0]).toMatchObject({ cycle_length: 21, is_outlier: false });
  });
  it('45 days is valid', () => {
    expect(twoPeriods('2025-02-15')[0]).toMatchObject({ cycle_length: 45, is_outlier: false });
  });
  it('46 days is an outlier (above 45)', () => {
    expect(twoPeriods('2025-02-16')[0]).toMatchObject({ cycle_length: 46, is_outlier: true });
  });
});

describe('recomputePeriods — outlier flagging on period length (§4.5 step 4)', () => {
  it('a run longer than 10 days is stored but marked outlier', () => {
    const dates = Array.from({ length: 11 }, (_, i) => `2025-04-${String(i + 1).padStart(2, '0')}`);
    const periods = recomputePeriods(bleed(dates));
    expect(periods[0]).toMatchObject({ length_days: 11, is_outlier: true });
  });
});
