import { describe, expect, it } from '@jest/globals';

import {
  cycleDay,
  cycleRingModel,
  currentPeriod,
  dayCellState,
  estimateTier,
  heroPhase,
  lastPeriodStartOnOrBefore,
  linearStripDays,
  predictionDateRange,
  primaryAction,
} from './home';
import type { LateState, Prediction } from './prediction';

const period = (start_date: string, end_date: string) => ({ start_date, end_date });

/** A regular 30-day-cycle prediction anchored so `nextPeriodStart` is `anchor + 30`. */
function pred(over: Partial<Prediction> = {}): Prediction {
  return {
    avgCycleLength: 30,
    avgPeriodLength: 5,
    nextPeriodStart: '2025-07-01', // anchor 2025-06-01 + 30
    nextPeriodEnd: '2025-07-05',
    predictionWindow: 1,
    ovulationDate: '2025-06-17', // nextPeriodStart − 14
    fertileStart: '2025-06-12', // ovulation − 5
    fertileEnd: '2025-06-18', // ovulation + 1
    confidence: 'high',
    isIrregular: false,
    cyclesUsed: 4,
    ...over,
  };
}

const notLate: LateState = { status: 'upcoming', daysUntil: 5 };

describe('lastPeriodStartOnOrBefore', () => {
  it('picks the latest start not after today', () => {
    const periods = [period('2025-01-01', '2025-01-05'), period('2025-02-01', '2025-02-05')];
    expect(lastPeriodStartOnOrBefore(periods, '2025-02-10')).toBe('2025-02-01');
    expect(lastPeriodStartOnOrBefore(periods, '2025-01-15')).toBe('2025-01-01');
    expect(lastPeriodStartOnOrBefore([], '2025-01-15')).toBe('2025-01-15');
  });
});

describe('cycleDay', () => {
  it('is 1 on the first day, N+1 after N days', () => {
    expect(cycleDay('2025-06-01', '2025-06-01')).toBe(1);
    expect(cycleDay('2025-06-01', '2025-06-18')).toBe(18);
    expect(cycleDay('2025-06-10', '2025-06-01')).toBe(1); // clamped
  });
});

describe('currentPeriod / primaryAction', () => {
  const periods = [period('2025-06-01', '2025-06-05')];
  it('detects a day inside a logged period', () => {
    expect(currentPeriod(periods, '2025-06-03')).toEqual(period('2025-06-01', '2025-06-05'));
    expect(currentPeriod(periods, '2025-06-09')).toBeNull();
  });

  it('offers "My period started" only when off-period, unlogged, and a period is expected', () => {
    expect(primaryAction({ onPeriod: false, hasFlowToday: false, periodExpected: true })).toBe(
      'periodStarted',
    );
    expect(primaryAction({ onPeriod: true, hasFlowToday: false, periodExpected: true })).toBe(
      'logToday',
    );
    expect(primaryAction({ onPeriod: false, hasFlowToday: true, periodExpected: true })).toBe(
      'logToday',
    );
    expect(primaryAction({ onPeriod: false, hasFlowToday: false, periodExpected: false })).toBe(
      'logToday',
    );
  });
});

describe('linearStripDays', () => {
  it('is 5 before .. today (index 5) .. 8 after — 14 days', () => {
    const days = linearStripDays('2025-06-15');
    expect(days).toHaveLength(14);
    expect(days[0]).toBe('2025-06-10');
    expect(days[5]).toBe('2025-06-15');
    expect(days[13]).toBe('2025-06-23');
  });
});

describe('predictionDateRange', () => {
  it('is a single date when window ≤ 1, a ± range otherwise', () => {
    expect(predictionDateRange('2025-10-14', 1)).toEqual({
      single: '2025-10-14',
      start: '2025-10-14',
      end: '2025-10-14',
    });
    expect(predictionDateRange('2025-10-14', 3)).toEqual({
      single: null,
      start: '2025-10-11',
      end: '2025-10-17',
    });
  });
});

describe('dayCellState (§11.2 precedence)', () => {
  const prediction = {
    ovulationDate: '2025-07-01',
    fertileStart: '2025-06-26',
    fertileEnd: '2025-07-02',
    nextPeriodStart: '2025-07-15',
    nextPeriodEnd: '2025-07-19',
  };
  const periods = [period('2025-06-01', '2025-06-05')];

  it('logged flow inside a period wins', () => {
    expect(
      dayCellState({
        dateIso: '2025-06-03',
        loggedFlow: 'medium',
        hasLogRow: true,
        periods,
        prediction,
      }),
    ).toBe('loggedPeriod');
  });
  it('ovulation before fertile before predicted', () => {
    expect(
      dayCellState({
        dateIso: '2025-07-01',
        loggedFlow: null,
        hasLogRow: false,
        periods,
        prediction,
      }),
    ).toBe('ovulation');
    expect(
      dayCellState({
        dateIso: '2025-06-27',
        loggedFlow: null,
        hasLogRow: false,
        periods,
        prediction,
      }),
    ).toBe('fertile');
    expect(
      dayCellState({
        dateIso: '2025-07-16',
        loggedFlow: null,
        hasLogRow: false,
        periods,
        prediction,
      }),
    ).toBe('predictedPeriod');
  });
  it('a log row with no flow is the faint dot state', () => {
    expect(
      dayCellState({
        dateIso: '2025-06-20',
        loggedFlow: 'none',
        hasLogRow: true,
        periods,
        prediction,
      }),
    ).toBe('loggedNoFlow');
  });
  it('nothing otherwise', () => {
    expect(
      dayCellState({
        dateIso: '2025-06-20',
        loggedFlow: null,
        hasLogRow: false,
        periods,
        prediction,
      }),
    ).toBe('none');
  });
});

describe('estimateTier (§2.7 C)', () => {
  it('irregular → range, never a point estimate', () => {
    expect(estimateTier({ isIrregular: true, predictionWindow: 1, cyclesUsed: 6 })).toBe('range');
  });
  it('tight window + enough history → point', () => {
    expect(estimateTier({ isIrregular: false, predictionWindow: 1, cyclesUsed: 3 })).toBe('point');
  });
  it('otherwise → tilde (never a bare number before 3 cycles)', () => {
    expect(estimateTier({ isIrregular: false, predictionWindow: 1, cyclesUsed: 2 })).toBe('tilde');
    expect(estimateTier({ isIrregular: false, predictionWindow: 3, cyclesUsed: 6 })).toBe('tilde');
  });
});

describe('heroPhase (§2.5 table)', () => {
  const periods = [period('2025-06-01', '2025-06-05')];

  it('no logged periods → noData', () => {
    expect(
      heroPhase({ periods: [], prediction: pred(), today: '2025-06-10', late: notLate }),
    ).toEqual({
      phase: 'noData',
    });
  });

  it('inside the logged period → menstruating with the period day', () => {
    expect(heroPhase({ periods, prediction: pred(), today: '2025-06-03', late: notLate })).toEqual({
      phase: 'menstruating',
      cycleDay: 3,
      periodDay: 3,
    });
  });

  it('after the period, before fertile → postPeriod', () => {
    expect(heroPhase({ periods, prediction: pred(), today: '2025-06-09', late: notLate })).toEqual({
      phase: 'postPeriod',
      cycleDay: 9,
    });
  });

  it('inside the fertile window → fertile with day N of total', () => {
    expect(heroPhase({ periods, prediction: pred(), today: '2025-06-14', late: notLate })).toEqual({
      phase: 'fertile',
      cycleDay: 14,
      dayN: 3,
      total: 7,
    });
  });

  it('on the ovulation date → ovulation', () => {
    expect(heroPhase({ periods, prediction: pred(), today: '2025-06-17', late: notLate })).toEqual({
      phase: 'ovulation',
      cycleDay: 17,
    });
  });

  it('after fertile, before next period → luteal with the estimate tier', () => {
    expect(heroPhase({ periods, prediction: pred(), today: '2025-06-25', late: notLate })).toEqual({
      phase: 'luteal',
      cycleDay: 25,
      daysUntil: 6,
      tier: 'point',
    });
  });

  it('late tiers pass straight through from lateState', () => {
    expect(
      heroPhase({
        periods,
        prediction: pred(),
        today: '2025-07-03',
        late: { status: 'expectedNow', daysPast: 2 },
      }),
    ).toEqual({ phase: 'expectedNow', cycleDay: 33 });

    expect(
      heroPhase({
        periods,
        prediction: pred(),
        today: '2025-07-06',
        late: { status: 'noPeriodYet', daysPast: 5, showStartPrompt: true },
      }),
    ).toEqual({ phase: 'noPeriodYet', cycleDay: 36, daysPast: 5, showStartPrompt: true });

    expect(
      heroPhase({
        periods,
        prediction: pred(),
        today: '2025-07-12',
        late: { status: 'paused', daysPast: 11 },
      }),
    ).toEqual({ phase: 'paused', cycleDay: 42 });

    expect(
      heroPhase({
        periods,
        prediction: pred(),
        today: '2025-08-05',
        late: { status: 'longGap', daysPast: 35, daysSinceLastPeriodStart: 65 },
      }),
    ).toEqual({ phase: 'longGap' });
  });
});

describe('cycleRingModel (§2.3, §2.7)', () => {
  const periods = [period('2025-06-01', '2025-06-05')];

  it("12 o'clock is day 0 and the marker sits at cycleDay − 1", () => {
    const m = cycleRingModel({ periods, prediction: pred(), today: '2025-06-19', late: notLate });
    expect(m.length).toBe(30);
    expect(m.todayDay).toBe(18); // cycle day 19
    expect(m.elapsedDays).toBe(18);
    expect(m.overflowDays).toBe(0);
    expect(m.frozen).toBe(false);
    expect(m.ghost).toBe(false);
  });

  it('places fertile / ovulation as day offsets from the anchor, clamped to [0, L]', () => {
    const m = cycleRingModel({ periods, prediction: pred(), today: '2025-06-19', late: notLate });
    expect(m.ovulationDay).toBe(16); // 2025-06-17 − 2025-06-01
    expect(m.fertileStartDay).toBe(11);
    expect(m.fertileEndDay).toBe(17);
    expect(m.periodLength).toBe(5);
  });

  it("late: the marker parks at 12 o'clock and a dashed overflow arc grows", () => {
    const m = cycleRingModel({
      periods,
      prediction: pred(),
      today: '2025-07-06',
      late: { status: 'noPeriodYet', daysPast: 5, showStartPrompt: true },
    });
    expect(m.todayDay).toBe(30); // parked at length
    expect(m.elapsedDays).toBe(30);
    expect(m.overflowDays).toBe(5);
    expect(m.frozen).toBe(false);
  });

  it('paused freezes the ring', () => {
    const m = cycleRingModel({
      periods,
      prediction: pred(),
      today: '2025-07-12',
      late: { status: 'paused', daysPast: 11 },
    });
    expect(m.frozen).toBe(true);
    expect(m.overflowDays).toBe(11);
  });

  it('zero data → ghost ring, no marker', () => {
    const m = cycleRingModel({
      periods: [],
      prediction: pred(),
      today: '2025-06-10',
      late: notLate,
    });
    expect(m.ghost).toBe(true);
    expect(m.todayDay).toBeNull();
  });

  it('zero completed cycles → lowConfidence', () => {
    const m = cycleRingModel({
      periods,
      prediction: pred({ cyclesUsed: 0, confidence: 'low', predictionWindow: 5 }),
      today: '2025-06-19',
      late: notLate,
    });
    expect(m.lowConfidence).toBe(true);
    expect(m.featherDays).toBe(5);
  });
});
