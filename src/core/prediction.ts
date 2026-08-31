/**
 * §5 — prediction engine. Pure functions: take `Period[]` + settings + `today`, return a
 * `Prediction`. No DB, no React, no current time read here (CLAUDE.md rule 7).
 *
 * The small pieces (`weightedAverage`, `standardDeviation`, `isIrregular`, `lateState`) are
 * exported so the §14 boundary cases can be tested directly.
 */
import { addDays, daysBetween } from './dates';
import { VALID_CYCLE_MAX, VALID_CYCLE_MIN } from './periods';

export type Confidence = 'low' | 'medium' | 'high';

export interface Prediction {
  avgCycleLength: number; // rounded, clamped 21–45
  avgPeriodLength: number; // rounded, clamped 1–10
  nextPeriodStart: string; // YYYY-MM-DD
  nextPeriodEnd: string;
  predictionWindow: number; // ± days of uncertainty (§5.5)
  ovulationDate: string;
  fertileStart: string;
  fertileEnd: string;
  confidence: Confidence;
  isIrregular: boolean;
  cyclesUsed: number; // how many real cycles fed the average (0–6)
}

/** The onboarding-reported figures the engine falls back to before enough cycles exist (§4.3, §5.4). */
export interface PredictionSettings {
  reported_cycle_length: number;
  reported_period_length: number;
  birth_year?: number | null;
}

/** The subset of a `Period` row the engine reads. */
export interface PeriodInput {
  start_date: string;
  cycle_length: number | null;
  length_days: number;
  is_outlier: boolean;
}

type CompletedCycle = PeriodInput & { cycle_length: number };

const WEIGHTS = [6, 5, 4, 3, 2, 1] as const;
const PERIOD_MIN = 1;
const PERIOD_MAX = 10;
const LUTEAL_PHASE_DAYS = 14; // §3 fixed luteal-phase assumption
const RECALC_ANCHOR_DAYS = 45; // §5.7

function clampRound(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function isCompleted(p: PeriodInput): p is CompletedCycle {
  return p.cycle_length !== null;
}

function isCycleOutlier(cycleLength: number): boolean {
  return cycleLength < VALID_CYCLE_MIN || cycleLength > VALID_CYCLE_MAX;
}

/**
 * §5.2 weighted average. `valuesNewestFirst[0]` is the most recent value and gets weight 6;
 * only the first 6 values are used. Returns `NaN` for an empty list — callers guard first.
 */
export function weightedAverage(valuesNewestFirst: number[]): number {
  const values = valuesNewestFirst.slice(0, WEIGHTS.length);
  if (values.length === 0) return NaN;
  const weights = WEIGHTS.slice(0, values.length);
  const weightedSum = values.reduce((sum, v, i) => sum + v * weights[i], 0);
  const weightTotal = weights.reduce((a, b) => a + b, 0);
  return weightedSum / weightTotal;
}

/**
 * Population standard deviation (÷N).
 * SPEC: 2026-08-31 — §5.5 does not say population vs sample; population chosen (simpler,
 * deterministic, and the maximum-spread bound keeps it consistent with the range rule).
 */
export function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * §5.5 irregularity. `recentCycleLengthsNewestFirst` is up to the last 6 NON-outlier cycle
 * lengths. `anyOfLastThreeWasOutlier` is whether any of the 3 most recent COMPLETED cycles
 * (outlier or not) fell outside 21–45.
 */
export function isIrregular(
  recentCycleLengthsNewestFirst: number[],
  anyOfLastThreeWasOutlier: boolean,
): boolean {
  if (anyOfLastThreeWasOutlier) return true;
  const sample = recentCycleLengthsNewestFirst.slice(0, WEIGHTS.length);
  if (sample.length < 2) return false;
  if (standardDeviation(sample) > 7) return true;
  return Math.max(...sample) - Math.min(...sample) >= 9;
}

export function predict(
  periods: PeriodInput[],
  settings: PredictionSettings,
  today: string,
): Prediction {
  const completed = periods.filter(isCompleted);

  const nonOutlierCyclesNewestFirst = completed
    .filter((p) => !p.is_outlier)
    .map((p) => p.cycle_length)
    .reverse();

  // §5.2 — last 6 period lengths, newest first, excluding period-length outliers (>10, §4.5 step 4).
  const periodLengthsNewestFirst = periods
    .filter((p) => p.length_days >= PERIOD_MIN && p.length_days <= PERIOD_MAX)
    .map((p) => p.length_days)
    .reverse();

  const cyclesUsed = Math.min(nonOutlierCyclesNewestFirst.length, WEIGHTS.length);

  // §5.4 cold-start tiers, indexed by non-outlier cycles available.
  let avgCycleLength: number;
  let avgPeriodLength: number;
  const observedPeriod = periodLengthsNewestFirst.length
    ? weightedAverage(periodLengthsNewestFirst)
    : settings.reported_period_length;

  if (cyclesUsed === 0) {
    avgCycleLength = clampRound(settings.reported_cycle_length, VALID_CYCLE_MIN, VALID_CYCLE_MAX);
    avgPeriodLength = clampRound(settings.reported_period_length, PERIOD_MIN, PERIOD_MAX);
  } else if (cyclesUsed === 1) {
    avgCycleLength = clampRound(
      0.5 * nonOutlierCyclesNewestFirst[0] + 0.5 * settings.reported_cycle_length,
      VALID_CYCLE_MIN,
      VALID_CYCLE_MAX,
    );
    // SPEC: 2026-08-31 — §5.4 states the blend for cycle length; period length mirrors it,
    // blending the observed period-length average with the reported figure.
    avgPeriodLength = clampRound(
      0.5 * observedPeriod + 0.5 * settings.reported_period_length,
      PERIOD_MIN,
      PERIOD_MAX,
    );
  } else {
    avgCycleLength = clampRound(
      weightedAverage(nonOutlierCyclesNewestFirst),
      VALID_CYCLE_MIN,
      VALID_CYCLE_MAX,
    );
    avgPeriodLength = clampRound(observedPeriod, PERIOD_MIN, PERIOD_MAX);
  }

  const lastThreeOutlier = completed
    .slice(-3)
    .some((p) => isCycleOutlier(p.cycle_length));
  const irregular = isIrregular(nonOutlierCyclesNewestFirst, lastThreeOutlier);

  // §5.4 confidence.
  let confidence: Confidence;
  if (cyclesUsed >= 4) confidence = irregular ? 'medium' : 'high';
  else if (cyclesUsed >= 2) confidence = 'medium';
  else confidence = 'low';

  // §5.5 prediction window.
  let predictionWindow = confidence === 'high' ? 1 : confidence === 'medium' ? 3 : 5;
  if (irregular) predictionWindow = Math.min(7, predictionWindow + 2);

  // Anchor on the most recent period start on or before today (§5.4 / §5.7).
  const anchorStart = periods
    .map((p) => p.start_date)
    .filter((d) => d <= today)
    .sort()
    .pop() ?? today;

  const nextPeriodStart = addDays(anchorStart, avgCycleLength);
  const nextPeriodEnd = addDays(nextPeriodStart, avgPeriodLength - 1);
  const ovulationDate = addDays(nextPeriodStart, -LUTEAL_PHASE_DAYS);

  return {
    avgCycleLength,
    avgPeriodLength,
    nextPeriodStart,
    nextPeriodEnd,
    predictionWindow,
    ovulationDate,
    fertileStart: addDays(ovulationDate, -5), // §3 fertile window: ovulation −5 … ovulation +1
    fertileEnd: addDays(ovulationDate, 1),
    confidence,
    isIrregular: irregular,
    cyclesUsed,
  };
}

/** §5.7 late-period state. Drives Home copy; kept pure and here so §14 can test the boundaries. */
export type LateState =
  | { status: 'upcoming'; daysUntil: number }
  | { status: 'periodStarted' }
  | { status: 'expectedNow'; daysPast: number }
  | { status: 'late'; daysPast: number }
  | { status: 'offerRecalculate'; daysPast: number; daysSinceLastPeriodStart: number };

export function lateState(args: {
  nextPeriodStart: string;
  predictionWindow: number;
  lastPeriodStart: string;
  today: string;
  /** True once the user has logged any flow on or after `nextPeriodStart` (§5.7 precondition). */
  flowLoggedSinceNextStart: boolean;
}): LateState {
  const {
    nextPeriodStart,
    predictionWindow,
    lastPeriodStart,
    today,
    flowLoggedSinceNextStart,
  } = args;

  const daysUntil = daysBetween(today, nextPeriodStart);
  if (daysUntil > 0) return { status: 'upcoming', daysUntil };
  if (flowLoggedSinceNextStart) return { status: 'periodStarted' };

  const daysPast = -daysUntil;
  const daysSinceLastPeriodStart = daysBetween(lastPeriodStart, today);

  if (daysSinceLastPeriodStart >= RECALC_ANCHOR_DAYS) {
    return { status: 'offerRecalculate', daysPast, daysSinceLastPeriodStart };
  }
  if (daysPast === 0) return { status: 'upcoming', daysUntil: 0 };
  if (daysPast <= predictionWindow) return { status: 'expectedNow', daysPast };
  return { status: 'late', daysPast };
}
