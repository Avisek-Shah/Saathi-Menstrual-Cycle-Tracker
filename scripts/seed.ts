/**
 * §14 fixtures. Every reachable UI state should be producible from one of these.
 *
 * The generators are pure (usable from tests). `seedDatabase` writes a fixture through the
 * repositories only — no SQL here (CLAUDE.md rule 5).
 */
import { addDays } from '../src/core/dates';
import * as dailyLogs from '../src/db/repositories/dailyLogs';
import { setSettings, type Settings } from '../src/db/repositories/settings';

export interface SeedLog {
  date: string;
  flow: string;
  moods: string[];
  symptoms: string[];
  note: string | null;
}

export interface SeedFixture {
  name: string;
  settings: Partial<Settings>;
  logs: SeedLog[];
}

function bleedDays(start: string, periodLength: number, flow = 'medium'): SeedLog[] {
  return Array.from({ length: periodLength }, (_, i) => ({
    date: addDays(start, i),
    flow,
    moods: [],
    symptoms: [],
    note: null,
  }));
}

/** One period at `anchor`, then a period at each cumulative cycle-length offset after it. */
function userFromCycleLengths(
  anchor: string,
  cycleLengths: number[],
  periodLength: number,
): SeedLog[] {
  const logs: SeedLog[] = [...bleedDays(anchor, periodLength)];
  let start = anchor;
  for (const cycleLength of cycleLengths) {
    start = addDays(start, cycleLength);
    logs.push(...bleedDays(start, periodLength));
  }
  return logs;
}

/** 1. Regular 28-day user, 8 completed cycles → high confidence, single-date prediction. */
export const regularUser: SeedFixture = {
  name: 'regular-28-8cycles',
  settings: {
    onboarding_complete: true,
    birth_year: 1995,
    reported_cycle_length: 28,
    reported_period_length: 5,
  },
  logs: userFromCycleLengths('2025-01-06', [28, 28, 28, 28, 28, 28, 28, 28], 5),
};

/** 2. Irregular user, cycles 24/38/26/41/29/35 → isIrregular, date range, variation card. */
export const irregularUser: SeedFixture = {
  name: 'irregular-24-38-26-41-29-35',
  settings: {
    onboarding_complete: true,
    birth_year: 1990,
    reported_cycle_length: 30,
    reported_period_length: 5,
  },
  logs: userFromCycleLengths('2025-01-01', [24, 38, 26, 41, 29, 35], 5),
};

/** 3. Brand-new user: only the onboarding-seeded last period, 0 completed cycles → low confidence. */
export const newUser: SeedFixture = {
  name: 'brand-new',
  settings: {
    onboarding_complete: true,
    birth_year: 2000,
    reported_cycle_length: 28,
    reported_period_length: 5,
  },
  logs: bleedDays('2025-08-20', 5),
};

export const fixtures: SeedFixture[] = [regularUser, irregularUser, newUser];

/** Wipe user data and load one fixture. Dev utility — call from a throwaway screen. */
export async function seedDatabase(fixture: SeedFixture): Promise<void> {
  await dailyLogs.deleteAll();
  for (const log of fixture.logs) {
    await dailyLogs.upsert(log.date, log.flow, log.moods, log.symptoms, log.note);
  }
  await setSettings(fixture.settings);
}
