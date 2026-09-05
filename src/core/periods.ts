/**
 * §4.5 — derive the `periods` table from `daily_logs.flow`, deterministically, from scratch.
 * Pure: no DB, no React, no current time (CLAUDE.md rule 7). The repository layer is
 * responsible for wrapping the persisted rebuild in a transaction (§4.5 step 6).
 */
import { daysBetween } from './dates';

export interface Period {
  /** First flow day of the period, `YYYY-MM-DD`. */
  start_date: string;
  /** Last flow day of the period, `YYYY-MM-DD`. */
  end_date: string;
  /** Inclusive count of days from `start_date` to `end_date`. */
  length_days: number;
  /** Days from this `start_date` to the next period's `start_date`; `null` for the most recent. */
  cycle_length: number | null;
  /** 1/true when excluded from averages: cycle length outside 21–45, or period longer than 10 days. */
  is_outlier: boolean;
}

export const VALID_CYCLE_MIN = 21;
export const VALID_CYCLE_MAX = 45;
export const VALID_PERIOD_MAX = 10;

/** A single logged day, reduced to the only field §4.5 needs. */
export interface FlowLog {
  date: string;
  flow: string;
}

/**
 * Group flow days into periods. A gap of more than 2 days from the previous flow day starts a
 * new period; 1–2 day gaps stay within the current one (§4.5 step 2). Input order does not
 * matter — days are sorted here.
 */
export function recomputePeriods(logs: FlowLog[]): Period[] {
  const flowDays = Array.from(
    new Set(logs.filter((l) => l.flow !== 'none').map((l) => l.date)),
  ).sort();

  const runs: { start: string; end: string }[] = [];
  for (const day of flowDays) {
    const current = runs[runs.length - 1];
    if (!current || daysBetween(current.end, day) > 2) {
      runs.push({ start: day, end: day });
    } else {
      current.end = day;
    }
  }

  return runs.map((run, i) => {
    const next = runs[i + 1];
    const length_days = daysBetween(run.start, run.end) + 1;
    const cycle_length = next ? daysBetween(run.start, next.start) : null;
    const cycleOutlier =
      cycle_length !== null && (cycle_length < VALID_CYCLE_MIN || cycle_length > VALID_CYCLE_MAX);
    const periodOutlier = length_days > VALID_PERIOD_MAX;
    return {
      start_date: run.start,
      end_date: run.end,
      length_days,
      cycle_length,
      is_outlier: cycleOutlier || periodOutlier,
    };
  });
}
