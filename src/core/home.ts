/**
 * §6.2 Home — pure view logic. No DB, no React, no current-time read (rule 7); `today`
 * comes in. The screen composes these with `predict()` / `lateState()` output.
 */
import { addDays, daysBetween } from './dates';
import type { Period } from './periods';
import type { LateState, Prediction } from './prediction';

/** The most recent period start on or before `today`; falls back to `today`. */
export function lastPeriodStartOnOrBefore(
  periods: Pick<Period, 'start_date'>[],
  today: string,
): string {
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

export type DayCellState =
  'loggedPeriod' | 'ovulation' | 'fertile' | 'predictedPeriod' | 'loggedNoFlow' | 'none';

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

// ── Cycle-relative ring (UI/UX spec §2.2–2.7, adopted 2026-09-06; supersedes the
//    calendar-month `monthRingDays`) ──────────────────────────────────────────────────────

/** How honest the countdown can be about itself (§2.7 C, mapped onto the §5 Prediction). */
export type EstimateTier = 'point' | 'tilde' | 'range';

export function estimateTier(
  p: Pick<Prediction, 'isIrregular' | 'predictionWindow' | 'cyclesUsed'>,
): EstimateTier {
  if (p.isIrregular) return 'range'; // σ > 7 — no point estimate at all (§2.7 C)
  if (p.predictionWindow <= 1 && p.cyclesUsed >= 3) return 'point'; // tight, and enough history
  return 'tilde'; // "~13 days" — a soft estimate, never a bare number before 3 cycles (§2.7 A)
}

/** The phase the ring centre speaks to (§2.5 table). Numbers only — the screen maps to copy. */
export type HeroPhase =
  | { phase: 'menstruating'; cycleDay: number; periodDay: number }
  | { phase: 'postPeriod'; cycleDay: number }
  | { phase: 'fertile'; cycleDay: number; dayN: number; total: number }
  | { phase: 'ovulation'; cycleDay: number }
  | { phase: 'expectedNow'; cycleDay: number }
  | { phase: 'luteal'; cycleDay: number; daysUntil: number; tier: EstimateTier }
  | { phase: 'noPeriodYet'; cycleDay: number; daysPast: number; showStartPrompt: boolean }
  | { phase: 'paused'; cycleDay: number }
  | { phase: 'longGap' }
  | { phase: 'noData' };

export function heroPhase(args: {
  periods: Pick<Period, 'start_date' | 'end_date'>[];
  prediction: Prediction;
  today: string;
  late: LateState;
}): HeroPhase {
  const { periods, prediction, today, late } = args;
  if (periods.length === 0) return { phase: 'noData' };

  const anchor = lastPeriodStartOnOrBefore(periods, today);
  const cd = cycleDay(anchor, today);

  switch (late.status) {
    case 'longGap':
      return { phase: 'longGap' };
    case 'paused':
      return { phase: 'paused', cycleDay: cd };
    case 'noPeriodYet':
      return {
        phase: 'noPeriodYet',
        cycleDay: cd,
        daysPast: late.daysPast,
        showStartPrompt: late.showStartPrompt,
      };
    case 'expectedNow':
      return { phase: 'expectedNow', cycleDay: cd };
    case 'upcoming':
    case 'periodStarted':
      break;
  }

  const cp = currentPeriod(periods, today);
  if (cp) {
    return { phase: 'menstruating', cycleDay: cd, periodDay: periodDay(cp.start_date, today) };
  }
  if (today === prediction.ovulationDate) return { phase: 'ovulation', cycleDay: cd };
  if (today >= prediction.fertileStart && today <= prediction.fertileEnd) {
    return {
      phase: 'fertile',
      cycleDay: cd,
      dayN: daysBetween(prediction.fertileStart, today) + 1,
      total: daysBetween(prediction.fertileStart, prediction.fertileEnd) + 1,
    };
  }
  if (today < prediction.fertileStart) return { phase: 'postPeriod', cycleDay: cd };
  return {
    phase: 'luteal',
    cycleDay: cd,
    daysUntil: Math.max(0, daysBetween(today, prediction.nextPeriodStart)),
    tier: estimateTier(prediction),
  };
}

/**
 * Everything `CycleRing` needs to draw one cycle-relative ring (§2.3): cycle day 1 at 12
 * o'clock, length `L`, a phase band (menstruation + fertile + ovulation notch over a neutral
 * remainder), an elapsed stroke, a today-marker, and — when late — a dashed overflow arc.
 * All positions are 0-based day offsets from the anchor, in `[0, L]`.
 */
export interface CycleRingModel {
  length: number;
  /** Menstruation arc length, days — the median logged duration once known (§2.7 G). */
  periodLength: number;
  fertileStartDay: number;
  fertileEndDay: number;
  /** Single day — drawn as a notch, never a wide arc (§2.3). */
  ovulationDay: number;
  /** Inner progress stroke length; parks at `length` once late (§2.7 D). */
  elapsedDays: number;
  /** Today-marker position; `null` in the zero-data ghost state. */
  todayDay: number | null;
  /** Dashed outer arc length past 12 o'clock; 0 unless late. */
  overflowDays: number;
  /** Paused / long-gap — the ring is dimmed and does not advance. */
  frozen: boolean;
  /** Zero logged periods — render a 15%-opacity ghost ring and a centred CTA (§2.7 B). */
  ghost: boolean;
  /** Zero completed cycles — draw the predicted arcs faint and extra-feathered (§2.7 A). */
  lowConfidence: boolean;
  /** Gradient fade width at predicted-arc ends, in days (§2.4). */
  featherDays: number;
}

export function cycleRingModel(args: {
  periods: Pick<Period, 'start_date' | 'end_date'>[];
  prediction: Prediction;
  today: string;
  late: LateState;
}): CycleRingModel {
  const { periods, prediction, today, late } = args;
  const L = Math.max(1, prediction.avgCycleLength);
  const anchor = lastPeriodStartOnOrBefore(periods, today);
  const elapsed0 = cycleDay(anchor, today) - 1;

  const clampDay = (n: number) => Math.max(0, Math.min(L, n));
  const isLate =
    late.status !== 'upcoming' && late.status !== 'periodStarted' && late.status !== 'expectedNow';
  const parked = isLate ? L : Math.min(L, elapsed0);
  const ghost = periods.length === 0;

  return {
    length: L,
    periodLength: clampDay(Math.max(1, prediction.avgPeriodLength)),
    fertileStartDay: clampDay(daysBetween(anchor, prediction.fertileStart)),
    fertileEndDay: clampDay(daysBetween(anchor, prediction.fertileEnd)),
    ovulationDay: clampDay(daysBetween(anchor, prediction.ovulationDate)),
    elapsedDays: parked,
    todayDay: ghost ? null : parked,
    overflowDays:
      late.status === 'noPeriodYet' || late.status === 'paused' ? Math.min(L, late.daysPast) : 0,
    frozen: late.status === 'paused' || late.status === 'longGap',
    ghost,
    lowConfidence: prediction.cyclesUsed === 0,
    featherDays: Math.max(1, prediction.predictionWindow),
  };
}
