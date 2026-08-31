import { recomputePeriods } from '../../core/periods';
import { openDB } from '../client';
import { replaceAllPeriods } from './periods';

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
 * flow re-runs this).
 */
async function refreshPeriods(): Promise<void> {
  const db = await openDB();
  const rows = await db.getAllAsync<{ date: string; flow: string }>(
    'SELECT date, flow FROM daily_logs ORDER BY date ASC',
  );
  await replaceAllPeriods(recomputePeriods(rows));
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

export async function upsert(
  date: string,
  flow: string,
  moods: string[],
  symptoms: string[],
  note?: string | null,
): Promise<void> {
  const db = await openDB();
  const now = Date.now();
  await db.runAsync(
    `INSERT INTO daily_logs (date, flow, moods, symptoms, note, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET
       flow = excluded.flow,
       moods = excluded.moods,
       symptoms = excluded.symptoms,
       note = excluded.note,
       updated_at = excluded.updated_at`,
    date,
    flow,
    JSON.stringify(moods),
    JSON.stringify(symptoms),
    note ?? null,
    now,
    now,
  );
  await refreshPeriods();
}

export async function deleteByDate(date: string): Promise<void> {
  const db = await openDB();
  await db.runAsync('DELETE FROM daily_logs WHERE date = ?', date);
  await refreshPeriods();
}

/** Wipe every log (delete-all-data, §6.7). Also clears the derived periods. */
export async function deleteAll(): Promise<void> {
  const db = await openDB();
  await db.runAsync('DELETE FROM daily_logs');
  await refreshPeriods();
}
