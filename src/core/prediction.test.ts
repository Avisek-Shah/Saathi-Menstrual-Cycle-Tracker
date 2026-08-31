import { describe, expect, it } from '@jest/globals';

import { addDays } from './dates';
import {
  isIrregular,
  lateState,
  predict,
  standardDeviation,
  weightedAverage,
  type PeriodInput,
  type PredictionSettings,
} from './prediction';

const FUTURE = '2099-01-01';
const REPORTED: PredictionSettings = { reported_cycle_length: 28, reported_period_length: 5 };

/**
 * `cycleLengths` become completed cycles (chronological); a final period with no cycle length
 * is appended, matching how `recomputePeriods` leaves the most recent period.
 */
function periodsFromCycles(
  cycleLengths: number[],
  opts: { periodLength?: number; anchor?: string } = {},
): PeriodInput[] {
  const periodLength = opts.periodLength ?? 5;
  let start = opts.anchor ?? '2025-01-01';
  const periods: PeriodInput[] = [];
  for (const cycleLength of cycleLengths) {
    periods.push({
      start_date: start,
      cycle_length: cycleLength,
      length_days: periodLength,
      is_outlier: cycleLength < 21 || cycleLength > 45,
    });
    start = addDays(start, cycleLength);
  }
  periods.push({ start_date: start, cycle_length: null, length_days: periodLength, is_outlier: false });
  return periods;
}

describe('weightedAverage (§5.2)', () => {
  it('applies descending weights [6,5,4,3,2,1] newest-first', () => {
    // (30*6 + 28*5 + 26*4) / (6+5+4) = 424 / 15
    expect(weightedAverage([30, 28, 26])).toBeCloseTo(424 / 15, 10);
  });
  it('truncates weights to the values available', () => {
    expect(weightedAverage([24])).toBe(24);
    expect(weightedAverage([30, 20])).toBeCloseTo(280 / 11, 10);
  });
  it('only the most recent 6 values count', () => {
    expect(weightedAverage([30, 30, 30, 30, 30, 30, 1, 1, 1])).toBe(30);
  });
});

describe('predict — weighted average + clamping (§5.2)', () => {
  it('rounds the weighted average of recent non-outlier cycles', () => {
    const p = predict(periodsFromCycles([26, 28, 30]), REPORTED, FUTURE);
    expect(p.avgCycleLength).toBe(28); // round(424/15)
    expect(p.cyclesUsed).toBe(3);
  });

  it('clamps a runaway reported value to 21..45 / 1..10', () => {
    const high = predict([], { reported_cycle_length: 99, reported_period_length: 99 }, FUTURE);
    expect(high.avgCycleLength).toBe(45);
    expect(high.avgPeriodLength).toBe(10);
    const low = predict([], { reported_cycle_length: 5, reported_period_length: 0 }, FUTURE);
    expect(low.avgCycleLength).toBe(21);
    expect(low.avgPeriodLength).toBe(1);
  });

  it('clamps the 1-cycle blend', () => {
    // 0.5*45 + 0.5*99 = 72 -> clamp 45
    const p = predict(periodsFromCycles([45]), { reported_cycle_length: 99, reported_period_length: 5 }, FUTURE);
    expect(p.avgCycleLength).toBe(45);
  });
});

describe('predict — cold-start tiers (§5.4)', () => {
  it('0 cycles: uses reported values, low confidence', () => {
    const p = predict([], REPORTED, FUTURE);
    expect(p).toMatchObject({ avgCycleLength: 28, avgPeriodLength: 5, confidence: 'low', cyclesUsed: 0, isIrregular: false });
  });

  it('1 cycle: 50/50 blend of observed and reported, low confidence', () => {
    const p = predict(periodsFromCycles([26]), REPORTED, FUTURE);
    expect(p.avgCycleLength).toBe(27); // round(0.5*26 + 0.5*28)
    expect(p).toMatchObject({ confidence: 'low', cyclesUsed: 1 });
  });

  it('2 cycles: observed weighted average, medium confidence', () => {
    const p = predict(periodsFromCycles([26, 30]), REPORTED, FUTURE);
    expect(p).toMatchObject({ confidence: 'medium', cyclesUsed: 2 });
    expect(p.avgCycleLength).toBe(28); // round((30*6 + 26*5)/11)
  });

  it('3 cycles: still medium confidence', () => {
    expect(predict(periodsFromCycles([26, 28, 30]), REPORTED, FUTURE).confidence).toBe('medium');
  });

  it('4+ regular cycles: high confidence', () => {
    const p = predict(periodsFromCycles([27, 28, 29, 28]), REPORTED, FUTURE);
    expect(p).toMatchObject({ confidence: 'high', cyclesUsed: 4, isIrregular: false });
  });

  it('4+ irregular cycles: drops back to medium confidence', () => {
    const p = predict(periodsFromCycles([24, 40, 25, 41]), REPORTED, FUTURE);
    expect(p).toMatchObject({ confidence: 'medium', cyclesUsed: 4, isIrregular: true });
  });
});

describe('standardDeviation / isIrregular boundaries (§5.5)', () => {
  it('standardDeviation is population (÷N)', () => {
    expect(standardDeviation([21, 35])).toBe(7); // mean 28, |dev| 7
    expect(standardDeviation([21, 36])).toBeGreaterThan(7); // 7.5
    expect(standardDeviation([28, 28, 28])).toBe(0);
  });

  it('sd strictly greater than 7 is irregular (co-fires with the range rule)', () => {
    expect(isIrregular([35, 21], false)).toBe(true); // sd 7.0 not > 7, but range 14 >= 9
    expect(isIrregular([36, 21], false)).toBe(true); // sd 7.5 > 7
  });

  it('range boundary: 8 is regular, 9 is irregular', () => {
    expect(isIrregular([34, 26], false)).toBe(false); // range 8, sd 4
    expect(isIrregular([34, 25], false)).toBe(true); // range 9
  });

  it('fewer than 2 cycles is never irregular by spread', () => {
    expect(isIrregular([30], false)).toBe(false);
    expect(isIrregular([], false)).toBe(false);
  });

  it('any of the last 3 cycles being an outlier forces irregular', () => {
    expect(isIrregular([28, 28], true)).toBe(true);
  });

  it('range boundary flows through predict', () => {
    expect(predict(periodsFromCycles([26, 34]), REPORTED, FUTURE).isIrregular).toBe(false);
    expect(predict(periodsFromCycles([25, 34]), REPORTED, FUTURE).isIrregular).toBe(true);
  });
});

describe('predict — predictionWindow table (§5.5)', () => {
  it('high -> 1, medium -> 3, low -> 5', () => {
    expect(predict(periodsFromCycles([28, 28, 28, 28]), REPORTED, FUTURE).predictionWindow).toBe(1);
    expect(predict(periodsFromCycles([28, 28]), REPORTED, FUTURE).predictionWindow).toBe(3);
    expect(predict([], REPORTED, FUTURE).predictionWindow).toBe(5);
  });

  it('irregular adds 2, capped at 7', () => {
    // medium + irregular: 3 + 2 = 5
    expect(predict(periodsFromCycles([25, 34]), REPORTED, FUTURE).predictionWindow).toBe(5);
    // low + irregular (1 non-outlier cycle, a recent outlier cycle): 5 + 2 = 7 (cap)
    const capped = predict(periodsFromCycles([50, 28]), REPORTED, FUTURE);
    expect(capped).toMatchObject({ confidence: 'low', isIrregular: true, predictionWindow: 7 });
  });
});

describe('predict — fertile window + ovulation (§3)', () => {
  it('ovulation is next start − 14, fertile window is ovulation −5 .. +1', () => {
    const p = predict([], REPORTED, '2025-06-01');
    // 0 cycles: anchor = today, next start = today + 28 = 2025-06-29
    expect(p.nextPeriodStart).toBe('2025-06-29');
    expect(p.ovulationDate).toBe('2025-06-15');
    expect(p.fertileStart).toBe('2025-06-10');
    expect(p.fertileEnd).toBe('2025-06-16');
    expect(p.nextPeriodEnd).toBe('2025-07-03'); // 5-day period, inclusive
  });
});

describe('lateState (§5.7)', () => {
  const base = {
    nextPeriodStart: '2025-06-10',
    predictionWindow: 3,
    lastPeriodStart: '2025-05-13',
    flowLoggedSinceNextStart: false,
  };

  it('before the predicted date: upcoming', () => {
    expect(lateState({ ...base, today: '2025-06-05' })).toEqual({ status: 'upcoming', daysUntil: 5 });
  });

  it('day 1 past .. day = window: expected around now', () => {
    expect(lateState({ ...base, today: '2025-06-11' })).toEqual({ status: 'expectedNow', daysPast: 1 });
    expect(lateState({ ...base, today: '2025-06-13' })).toEqual({ status: 'expectedNow', daysPast: 3 });
  });

  it('day window + 1: late', () => {
    expect(lateState({ ...base, today: '2025-06-14' })).toEqual({ status: 'late', daysPast: 4 });
  });

  it('45 days since the last period start: offer to recalculate', () => {
    expect(lateState({ ...base, today: '2025-06-27' })).toEqual({
      status: 'offerRecalculate',
      daysPast: 17,
      daysSinceLastPeriodStart: 45,
    });
  });

  it('flow logged since the predicted start: period started', () => {
    expect(lateState({ ...base, today: '2025-06-11', flowLoggedSinceNextStart: true })).toEqual({
      status: 'periodStarted',
    });
  });
});
