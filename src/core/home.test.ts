import { describe, expect, it } from '@jest/globals';

import {
  cycleDay,
  cycleRingDays,
  currentPeriod,
  dayCellState,
  lastPeriodStartOnOrBefore,
  predictionDateRange,
  primaryAction,
  weekStripDays,
} from './home';

const period = (start_date: string, end_date: string) => ({ start_date, end_date });

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

describe('weekStripDays', () => {
  it('is 3 before .. today .. 3 after', () => {
    expect(weekStripDays('2025-06-15')).toEqual([
      '2025-06-12',
      '2025-06-13',
      '2025-06-14',
      '2025-06-15',
      '2025-06-16',
      '2025-06-17',
      '2025-06-18',
    ]);
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
      dayCellState({ dateIso: '2025-06-03', loggedFlow: 'medium', hasLogRow: true, periods, prediction }),
    ).toBe('loggedPeriod');
  });
  it('ovulation before fertile before predicted', () => {
    expect(
      dayCellState({ dateIso: '2025-07-01', loggedFlow: null, hasLogRow: false, periods, prediction }),
    ).toBe('ovulation');
    expect(
      dayCellState({ dateIso: '2025-06-27', loggedFlow: null, hasLogRow: false, periods, prediction }),
    ).toBe('fertile');
    expect(
      dayCellState({ dateIso: '2025-07-16', loggedFlow: null, hasLogRow: false, periods, prediction }),
    ).toBe('predictedPeriod');
  });
  it('a log row with no flow is the faint dot state', () => {
    expect(
      dayCellState({ dateIso: '2025-06-20', loggedFlow: 'none', hasLogRow: true, periods, prediction }),
    ).toBe('loggedNoFlow');
  });
  it('nothing otherwise', () => {
    expect(
      dayCellState({ dateIso: '2025-06-20', loggedFlow: null, hasLogRow: false, periods, prediction }),
    ).toBe('none');
  });
});

describe('cycleRingDays', () => {
  const prediction = {
    ovulationDate: '2025-06-15',
    fertileStart: '2025-06-10',
    fertileEnd: '2025-06-16',
    nextPeriodStart: '2025-06-29',
    nextPeriodEnd: '2025-07-02',
  };
  const periods = [period('2025-06-01', '2025-06-05')];

  it('numbers days 1..cycleLength from anchor and flags today', () => {
    const days = cycleRingDays({
      anchor: '2025-06-01',
      cycleLength: 28,
      today: '2025-06-03',
      periods,
      prediction,
    });
    expect(days).toHaveLength(28);
    expect(days[0]).toEqual({ dateIso: '2025-06-01', dayNumber: 1, state: 'loggedPeriod', isToday: false });
    expect(days[2]).toEqual({ dateIso: '2025-06-03', dayNumber: 3, state: 'loggedPeriod', isToday: true });
    expect(days.filter((d) => d.isToday)).toHaveLength(1);
  });

  it('marks a day inside the logged period as loggedPeriod without needing a flow log', () => {
    const days = cycleRingDays({
      anchor: '2025-06-01',
      cycleLength: 28,
      today: '2025-06-01',
      periods,
      prediction,
    });
    expect(days[3].state).toBe('loggedPeriod'); // 2025-06-04, inside the period, no log passed
  });

  it('otherwise follows ovulation > fertile > predicted precedence', () => {
    const days = cycleRingDays({
      anchor: '2025-06-01',
      cycleLength: 32,
      today: '2025-06-01',
      periods,
      prediction,
    });
    const byIso = Object.fromEntries(days.map((d) => [d.dateIso, d.state]));
    expect(byIso['2025-06-15']).toBe('ovulation');
    expect(byIso['2025-06-11']).toBe('fertile');
    expect(byIso['2025-06-30']).toBe('predictedPeriod');
    expect(byIso['2025-06-20']).toBe('none');
  });
});
