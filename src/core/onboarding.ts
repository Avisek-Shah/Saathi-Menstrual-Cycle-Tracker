/**
 * §6.1 onboarding — pure helpers. No DB, no React, no current-time read (CLAUDE.md rule 7);
 * `today` is passed in. The store applies the result through the repositories.
 */
import { addDays, daysBetween } from './dates';

export const CYCLE_LENGTH_MIN = 21;
export const CYCLE_LENGTH_MAX = 45;
export const CYCLE_LENGTH_DEFAULT = 28;

export const PERIOD_LENGTH_MIN = 1;
export const PERIOD_LENGTH_MAX = 10;
export const PERIOD_LENGTH_DEFAULT = 5;

/** §6.1 step 2 — the last-period date cannot be in the future or more than this many days ago. */
export const MAX_START_DAYS_AGO = 90;

/** §6.1 step 5 — birth-year picker bounds, relative to the current year. */
export const BIRTH_YEAR_MIN_AGE = 9;
export const BIRTH_YEAR_MAX_AGE = 60;

export interface OnboardingInput {
  /** `null` = the user chose "I'm not sure" (§6.1 step 2). */
  lastPeriodStart: string | null;
  reportedCycleLength: number;
  reportedPeriodLength: number;
  /** `null` = the user skipped step 5. */
  birthYear: number | null;
}

export interface OnboardingResult {
  settings: {
    onboarding_complete: true;
    birth_year: number | null;
    reported_cycle_length: number;
    reported_period_length: number;
  };
  /** Flow days to seed for the reported last period (§6.1). */
  seedLogs: { date: string; flow: string }[];
  /** The resolved period start — equals `lastPeriodStart`, or `today − cycleLength` when unsure. */
  anchorDate: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

/** Selectable dates for step 2: `today` back to `today − MAX_START_DAYS_AGO`, newest first. */
export function recentDateOptions(today: string, maxDaysAgo = MAX_START_DAYS_AGO): string[] {
  return Array.from({ length: maxDaysAgo + 1 }, (_, i) => addDays(today, -i));
}

export function isSelectableStartDate(
  today: string,
  date: string,
  maxDaysAgo = MAX_START_DAYS_AGO,
): boolean {
  const delta = daysBetween(date, today);
  return delta >= 0 && delta <= maxDaysAgo;
}

/** §6.1 step 2 "I'm not sure" fallback: anchor to `today − reported_cycle_length`. */
export function notSureAnchor(today: string, reportedCycleLength: number): string {
  return addDays(today, -clamp(reportedCycleLength, CYCLE_LENGTH_MIN, CYCLE_LENGTH_MAX));
}

/** §6.1 finish: `flow = 'medium'` for `start … start + periodLength − 1`. */
export function firstPeriodSeedLogs(
  startDate: string,
  periodLength: number,
): { date: string; flow: string }[] {
  const days = clamp(periodLength, PERIOD_LENGTH_MIN, PERIOD_LENGTH_MAX);
  return Array.from({ length: days }, (_, i) => ({ date: addDays(startDate, i), flow: 'medium' }));
}

/** §6.1 step 5 — years from `currentYear − 9` down to `currentYear − 60`. */
export function birthYearRange(currentYear: number): number[] {
  const newest = currentYear - BIRTH_YEAR_MIN_AGE;
  const oldest = currentYear - BIRTH_YEAR_MAX_AGE;
  return Array.from({ length: newest - oldest + 1 }, (_, i) => newest - i);
}

/**
 * Turn the collected answers into the settings patch and seed logs to persist. The "I'm not
 * sure" anchor is resolved here, using the final cycle length (the user may have changed it
 * on step 3 after choosing "not sure" on step 2).
 */
export function resolveOnboarding(input: OnboardingInput, today: string): OnboardingResult {
  const reported_cycle_length = clamp(
    input.reportedCycleLength,
    CYCLE_LENGTH_MIN,
    CYCLE_LENGTH_MAX,
  );
  const reported_period_length = clamp(
    input.reportedPeriodLength,
    PERIOD_LENGTH_MIN,
    PERIOD_LENGTH_MAX,
  );
  const anchorDate =
    input.lastPeriodStart ?? notSureAnchor(today, reported_cycle_length);

  return {
    settings: {
      onboarding_complete: true,
      birth_year: input.birthYear,
      reported_cycle_length,
      reported_period_length,
    },
    seedLogs: firstPeriodSeedLogs(anchorDate, reported_period_length),
    anchorDate,
  };
}
