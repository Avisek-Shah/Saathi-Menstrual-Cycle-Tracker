import type { SQLiteDatabase } from 'expo-sqlite';

import { recomputePeriods } from '../../core/periods';
import { openDB } from '../client';
import { replaceAllPeriodsInTx } from './periods';

export interface LogRow {
  date: string;
  flow: string;
  moods: string[];
  symptoms: string[];
  note: string | null;
}

interface RawLogRow {
  date: string;
  flow: string;
  moods: string;
  symptoms: string;
  note: string | null;
}

function parseJsonArray(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function toLogRow(row: RawLogRow): LogRow {
  return {
    date: row.date,
    flow: row.flow,
    moods: parseJsonArray(row.moods),
    symptoms: parseJsonArray(row.symptoms),
    note: row.note,
  };
}

/**
 * Rebuild the derived `periods` table from every flow day (§4.4 — every write that touches
 * flow re-runs this). Takes the already-open `db` and does not open its own transaction, so
 * callers compose it inside the one transaction that also covers their `daily_logs` write —
 * expo-sqlite doesn't support nested transactions, and `periods` must never observe a
 * `daily_logs` write that a later failure rolls back.
 */
async function refreshPeriodsInTx(db: SQLiteDatabase): Promise<void> {
  // `recomputePeriods` (core/periods.ts) already discards flow === 'none' rows itself, so
  // filtering here is provably the same input set — it just does it in the index instead of
  // in JS, and makes `idx_daily_logs_flow` (schema.ts) a used index rather than a dead one.
  const rows = await db.getAllAsync<{ date: string; flow: string }>(
    "SELECT date, flow FROM daily_logs WHERE flow != 'none' ORDER BY date ASC",
  );
  await replaceAllPeriodsInTx(db, recomputePeriods(rows));
}

export async function getByDate(date: string): Promise<LogRow | null> {
  const db = await openDB();
  const row = await db.getFirstAsync<RawLogRow>('SELECT * FROM daily_logs WHERE date = ?', date);
  return row ? toLogRow(row) : null;
}

/** Logs with `startDate <= date <= endDate`, ascending. */
export async function getRange(startDate: string, endDate: string): Promise<LogRow[]> {
  const db = await openDB();
  const rows = await db.getAllAsync<RawLogRow>(
    'SELECT * FROM daily_logs WHERE date >= ? AND date <= ? ORDER BY date ASC',
    startDate,
    endDate,
  );
  return rows.map(toLogRow);
}

export async function getAll(): Promise<LogRow[]> {
  const db = await openDB();
  const rows = await db.getAllAsync<RawLogRow>('SELECT * FROM daily_logs ORDER BY date ASC');
  return rows.map(toLogRow);
}

export interface UpsertLogInput {
  date: string;
  flow: string;
  moods: string[];
  symptoms: string[];
  note?: string | null;
}

/**
 * Write several `daily_logs` rows and rebuild `periods` exactly once, in one transaction.
 * Prefer this over calling `upsert` in a loop whenever more than one date is being written
 * together (onboarding seed, §6.7 anchor change) — `upsert` alone opens its own transaction
 * and rebuilds `periods` from scratch every time, so N calls cost N full rebuilds instead
 * of one.
 */
export async function upsertMany(entries: readonly UpsertLogInput[]): Promise<void> {
  if (entries.length === 0) return;
  const db = await openDB();
  const now = Date.now();
  await db.withTransactionAsync(async () => {
    for (const entry of entries) {
      await db.runAsync(
        `INSERT INTO daily_logs (date, flow, moods, symptoms, note, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(date) DO UPDATE SET
           flow = excluded.flow,
           moods = excluded.moods,
           symptoms = excluded.symptoms,
           note = excluded.note,
           updated_at = excluded.updated_at`,
        entry.date,
        entry.flow,
        JSON.stringify(entry.moods),
        JSON.stringify(entry.symptoms),
        entry.note ?? null,
        now,
        now,
      );
    }
    await refreshPeriodsInTx(db);
  });
}

export async function upsert(
  date: string,
  flow: string,
  moods: string[],
  symptoms: string[],
  note?: string | null,
): Promise<void> {
  await upsertMany([{ date, flow, moods, symptoms, note }]);
}

export async function deleteByDate(date: string): Promise<void> {
  const db = await openDB();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM daily_logs WHERE date = ?', date);
    await refreshPeriodsInTx(db);
  });
}

/** Wipe every log (delete-all-data, §6.7). Also clears the derived periods. */
export async function deleteAll(): Promise<void> {
  const db = await openDB();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM daily_logs');
    await refreshPeriodsInTx(db);
  });
}

/**
 * §6.7 re-seed rule — clear flow on the given dates only. Used after `reseedPlan()` (§6.7,
 * core/onboarding.ts) has already excluded any day the user logged herself; this function
 * trusts its caller and clears exactly the list it is given, nothing more.
 *
 * A row that becomes entirely empty (no flow, mood, symptoms, or note) is deleted outright
 * rather than left as a bare placeholder row.
 */
export async function clearFlowForDates(dates: readonly string[]): Promise<void> {
  if (dates.length === 0) return;
  const db = await openDB();
  const now = Date.now();
  await db.withTransactionAsync(async () => {
    for (const date of dates) {
      const row = await db.getFirstAsync<RawLogRow>(
        'SELECT * FROM daily_logs WHERE date = ?',
        date,
      );
      if (!row) continue;
      const moods = parseJsonArray(row.moods);
      const symptoms = parseJsonArray(row.symptoms);
      if (moods.length === 0 && symptoms.length === 0 && !row.note) {
        await db.runAsync('DELETE FROM daily_logs WHERE date = ?', date);
      } else {
        await db.runAsync(
          'UPDATE daily_logs SET flow = ?, updated_at = ? WHERE date = ?',
          'none',
          now,
          date,
        );
      }
    }
    await refreshPeriodsInTx(db);
  });
}

/**
 * Most recent logged days, newest first, optionally before a given date (pagination for the
 * §6.5 journal, and the source of "recent symptoms" for the §6.2 quick-log row).
 */
export async function getRecent(limit: number, before?: string): Promise<LogRow[]> {
  const db = await openDB();
  const rows = before
    ? await db.getAllAsync<RawLogRow>(
        'SELECT * FROM daily_logs WHERE date < ? ORDER BY date DESC LIMIT ?',
        before,
        limit,
      )
    : await db.getAllAsync<RawLogRow>('SELECT * FROM daily_logs ORDER BY date DESC LIMIT ?', limit);
  return rows.map(toLogRow);
}
