import { openDB } from '../client';
export type LogRow = { date: string; flow: string; moods: string; symptoms: string; note: string | null };

export async function getByDate(date: string) {
  const db = await openDB();
  const row = await db.getFirstAsync('SELECT * FROM daily_logs WHERE date = ?', date);
  return row ? (row as LogRow) : null;
}

export async function upsert(date: string, flow: string, moods: string[], symptoms: string[], note?: string) {
  const db = await openDB();
  const now = Date.now();
  await db.runAsync(`INSERT INTO daily_logs (date, flow, moods, symptoms, note, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET flow = excluded.flow, moods = excluded.moods, symptoms = excluded.symptoms, note = excluded.note, updated_at = excluded.updated_at`,
    date, flow, JSON.stringify(moods), JSON.stringify(symptoms), note || null, now, now);
}
