import type { Period } from '../../core/periods';
import { openDB } from '../client';

interface PeriodRow {
  start_date: string;
  end_date: string;
  length_days: number;
  cycle_length: number | null;
  is_outlier: number;
}

/** All derived periods, oldest first. */
export async function getAllPeriods(): Promise<Period[]> {
  const db = await openDB();
  const rows = await db.getAllAsync<PeriodRow>(
    'SELECT start_date, end_date, length_days, cycle_length, is_outlier FROM periods ORDER BY start_date ASC',
  );
  return rows.map((r) => ({
    start_date: r.start_date,
    end_date: r.end_date,
    length_days: r.length_days,
    cycle_length: r.cycle_length,
    is_outlier: r.is_outlier === 1,
  }));
}

/**
 * Replace the whole `periods` table with a freshly computed set, in one transaction
 * (§4.5 step 6). `periods` is derived data — this is the only way it is written.
 */
export async function replaceAllPeriods(periods: Period[]): Promise<void> {
  const db = await openDB();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM periods');
    for (const p of periods) {
      await db.runAsync(
        'INSERT INTO periods (start_date, end_date, length_days, cycle_length, is_outlier) VALUES (?, ?, ?, ?, ?)',
        p.start_date,
        p.end_date,
        p.length_days,
        p.cycle_length,
        p.is_outlier ? 1 : 0,
      );
    }
  });
}
