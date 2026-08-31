/**
 * §6.5 Journal — pure grouping/summary logic for the readable log history. No DB, no React
 * (CLAUDE.md rule 7). `formatDate`/`CalendarSystem` come from `./calendar` (§9).
 */
import { formatDate, type CalendarSystem } from './calendar';
import type { FlowLevel, Mood, Symptom } from './enums';

/** The subset of a `daily_logs` row the journal reads. */
export interface JournalRow {
  date: string;
  flow: FlowLevel;
  moods: Mood[];
  symptoms: Symptom[];
  note: string | null;
}

export interface JournalEntry {
  date: string;
  hasFlow: boolean;
  flow: FlowLevel;
  moods: Mood[];
  symptoms: Symptom[];
  /** First line of the note, or null if there isn't one. */
  noteExcerpt: string | null;
}

export interface JournalMonthGroup {
  /** Stable sort key, e.g. "2025-08" (AD) — always derived from the stored Gregorian date. */
  key: string;
  /** Label shown above the group, in the active calendar system (§9). */
  label: string;
  entries: JournalEntry[];
}

/** §6.5 — reduce a stored row to what the journal shows: no raw enum values escape this file. */
export function summariseEntry(row: JournalRow): JournalEntry {
  return {
    date: row.date,
    hasFlow: row.flow !== 'none',
    flow: row.flow,
    moods: row.moods,
    symptoms: row.symptoms,
    noteExcerpt: row.note ? row.note.split('\n')[0] : null,
  };
}

/**
 * §6.5 — group rows newest-first by month, in the active calendar system. The group key is
 * the AD month for stable sorting (§3 — storage stays Gregorian); the label is localized.
 */
export function groupByMonth(rows: readonly JournalRow[], system: CalendarSystem): JournalMonthGroup[] {
  const sorted = [...rows].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const groups: JournalMonthGroup[] = [];
  const byKey = new Map<string, JournalMonthGroup>();

  for (const row of sorted) {
    const key = row.date.slice(0, 7); // 'YYYY-MM' — a stable, Gregorian sort key (§3).
    let group = byKey.get(key);
    if (!group) {
      group = { key, label: formatDate(row.date, system, 'MMMM yyyy'), entries: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    group.entries.push(summariseEntry(row));
  }

  return groups;
}
