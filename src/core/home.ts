/**
 * §6.2 Home — pure view logic. No DB, no React, no current-time read (rule 7); `today`
 * comes in. The screen composes these with `predict()` / `lateState()` output.
 */
import { addDays, daysBetween } from './dates';
import type { Period } from './periods';
import type { Prediction } from './prediction';

/** The most recent period start on or before `today`; falls back to `today`. */
export function lastPeriodStartOnOrBefore(periods: Pick<Period, 'start_date'>[], today: string): string {
  return (
    periods
      .map((p) => p.start_date)
      .filter((d) => d <= today)
      .sort()
      .pop() ?? today
  );
}

/** "Cycle day N" — day 1 is the first day of the current cycle (§3). */
export function cycleDay(lastPeriodStart: string, today: string): number {
  return Math.max(1, daysBetween(lastPeriodStart, today) + 1);
}

/** The logged period that contains `today`, if any (§6.2 on-period state). */
export function currentPeriod(
  periods: Pick<Period, 'start_date' | 'end_date'>[],
  today: string,
): Pick<Period, 'start_date' | 'end_date'> | null {
  return periods.find((p) => p.start_date <= today && today <= p.end_date) ?? null;
}

/** Day number within a period, 1-based. */
export function periodDay(periodStart: string, today: string): number {
  return daysBetween(periodStart, today) + 1;
}

/** §6.2 context-aware primary button. */
export function primaryAction(args: {
  onPeriod: boolean;
  hasFlowToday: boolean;
  periodExpected: boolean;
}): 'logToday' | 'periodStarted' {
  if (!args.onPeriod && !args.hasFlowToday && args.periodExpected) return 'periodStarted';
  return 'logToday';
}

export interface PredictionDateRange {
  /** Set only when the window is tight (≤ 1) — show a single date. */
  single: string | null;
  start: string;
  end: string;
}

/** §6.2 / §5.6 — a single date when confident, otherwise a ± window range. */
export function predictionDateRange(dateIso: string, window: number): PredictionDateRange {
  if (window <= 1) return { single: dateIso, start: dateIso, end: dateIso };
  return { single: null, start: addDays(dateIso, -window), end: addDays(dateIso, window) };
}

/** §6.2 week strip — 3 days before today, today, 3 days after. */
export function weekStripDays(today: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(today, i - 3));
}

export type DayCellState =
  | 'loggedPeriod'
  | 'ovulation'
  | 'fertile'
  | 'predictedPeriod'
  | 'loggedNoFlow'
  | 'none';

/**
 * §11.2 day-cell state, highest precedence first. `today`-ring is layered by the component,
 * not returned here.
 */
export function dayCellState(args: {
  dateIso: string;
  loggedFlow: string | null;
  hasLogRow: boolean;
  periods: Pick<Period, 'start_date' | 'end_date'>[];
  prediction: Pick<
    Prediction,
    'ovulationDate' | 'fertileStart' | 'fertileEnd' | 'nextPeriodStart' | 'nextPeriodEnd'
  >;
}): DayCellState {
  const { dateIso, loggedFlow, hasLogRow, periods, prediction } = args;
  const inRange = (a: string, b: string) => dateIso >= a && dateIso <= b;

  if (loggedFlow && loggedFlow !== 'none' && currentPeriod(periods, dateIso)) {
    return 'loggedPeriod';
  }
  if (dateIso === prediction.ovulationDate) return 'ovulation';
  if (inRange(prediction.fertileStart, prediction.fertileEnd)) return 'fertile';
  if (inRange(prediction.nextPeriodStart, prediction.nextPeriodEnd)) return 'predictedPeriod';
  if (hasLogRow) return 'loggedNoFlow';
  return 'none';
}

export interface RingDay {
  dateIso: string;
  /** 1-based day within the ring's cycle, not the calendar day-of-month. */
  dayNumber: number;
  state: Exclude<DayCellState, 'loggedNoFlow'>;
  isToday: boolean;
}

// SPEC: 2026-09-05 — the Home cycle ring has no per-day flow log to consult (only the
// current week's logs are loaded on Home), so it cannot distinguish `loggedNoFlow` the way
// the calendar does. A day inside a `Period` range is shown as `loggedPeriod` on the strength
// of the period record alone; every other precedence rule matches `dayCellState`. See
// DECISIONS.md.
function ringDayState(
  dateIso: string,
  periods: Pick<Period, 'start_date' | 'end_date'>[],
  prediction: Pick<
    Prediction,
    'ovulationDate' | 'fertileStart' | 'fertileEnd' | 'nextPeriodStart' | 'nextPeriodEnd'
  >,
): Exclude<DayCellState, 'loggedNoFlow'> {
  const inRange = (a: string, b: string) => dateIso >= a && dateIso <= b;
  if (currentPeriod(periods, dateIso)) return 'loggedPeriod';
  if (dateIso === prediction.ovulationDate) return 'ovulation';
  if (inRange(prediction.fertileStart, prediction.fertileEnd)) return 'fertile';
  if (inRange(prediction.nextPeriodStart, prediction.nextPeriodEnd)) return 'predictedPeriod';
  return 'none';
}

/** §16 Home cycle ring — one full cycle of days, starting at `anchor`, for the hero chart. */
export function cycleRingDays(args: {
  anchor: string;
  cycleLength: number;
  today: string;
  periods: Pick<Period, 'start_date' | 'end_date'>[];
  prediction: Pick<
    Prediction,
    'ovulationDate' | 'fertileStart' | 'fertileEnd' | 'nextPeriodStart' | 'nextPeriodEnd'
  >;
}): RingDay[] {
  const { anchor, cycleLength, today, periods, prediction } = args;
  return Array.from({ length: cycleLength }, (_, i) => {
    const dateIso = addDays(anchor, i);
    return {
      dateIso,
      dayNumber: i + 1,
      state: ringDayState(dateIso, periods, prediction),
      isToday: dateIso === today,
    };
  });
}
