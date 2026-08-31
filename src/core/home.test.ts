import { describe, expect, it } from '@jest/globals';

import {
  cycleDay,
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
