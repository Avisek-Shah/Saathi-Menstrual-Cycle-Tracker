/**
 * §6.2 quick-log row / §6.3.1 day sheet — pure merge logic for one-tap logging. No DB, no
 * React (CLAUDE.md rule 7). The component owns labels via `flowLabel`/`symptomLabel`.
 */
import type { FlowLevel, Symptom } from './enums';

/** The subset of a `daily_logs` row a quick action needs to read and merge into. */
export interface LogSnapshot {
  flow: FlowLevel;
  moods: string[];
  symptoms: Symptom[];
  note: string | null;
}

export const EMPTY_LOG: LogSnapshot = { flow: 'none', moods: [], symptoms: [], note: null };

// SPEC: 2026-08-31 — §6.2 says the quick-log row offers "the flow level (when on a period)"
// without naming which of the five FlowLevel values a single one-tap chip should set. Chosen
// 'medium' as the most representative day-of-period value; a user wanting spotting/light/
// heavy still has the day sheet (§6.3.1) or the log modal (§6.4). See DECISIONS.md.
export const QUICK_FLOW_LEVEL: FlowLevel = 'medium';

export const MAX_QUICK_LOG_OPTIONS = 5;

export type QuickLogOption =
  | { kind: 'flow'; flow: FlowLevel; selected: boolean }
  | { kind: 'symptom'; symptom: Symptom; selected: boolean };

/**
 * §6.2 — up to `MAX_QUICK_LOG_OPTIONS` one-tap chips: a flow chip when the day is inside a
 * period, then the user's most-used recent symptoms filling whatever slots remain.
 */
export function quickLogOptions(args: {
  log: LogSnapshot | null;
  onPeriod: boolean;
  recentSymptoms: readonly Symptom[];
}): QuickLogOption[] {
  const { log, onPeriod, recentSymptoms } = args;
  const options: QuickLogOption[] = [];

  if (onPeriod) {
    options.push({
      kind: 'flow',
      flow: QUICK_FLOW_LEVEL,
      selected: (log?.flow ?? 'none') !== 'none',
    });
  }

  const seen = new Set<Symptom>();
  for (const symptom of recentSymptoms) {
    if (options.length >= MAX_QUICK_LOG_OPTIONS) break;
    if (seen.has(symptom)) continue;
    seen.add(symptom);
    options.push({ kind: 'symptom', symptom, selected: (log?.symptoms ?? []).includes(symptom) });
  }

  return options;
}

/**
 * §6.2 — rank symptoms by how often they appear across recent logs, most-used first. Ties
 * keep the order the symptom was first seen in `rows` (rows are expected newest-first, so an
 * earlier tie is also the more recent one).
 */
export function rankRecentSymptoms(
  rows: readonly { symptoms: readonly Symptom[] }[],
  limit: number = MAX_QUICK_LOG_OPTIONS,
): Symptom[] {
  const counts = new Map<Symptom, number>();
  const firstSeenOrder: Symptom[] = [];

  for (const row of rows) {
    for (const symptom of row.symptoms) {
      if (!counts.has(symptom)) firstSeenOrder.push(symptom);
      counts.set(symptom, (counts.get(symptom) ?? 0) + 1);
    }
  }

  return [...firstSeenOrder]
    .sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0))
    .slice(0, limit);
}

/**
 * §6.2 — apply one quick-log tap. Always merges: a symptom toggle never touches flow, mood,
 * or note, and a flow toggle never touches mood, symptoms, or note. Returns the full payload
 * a save call needs, so nothing already logged that day is lost.
 */
export function applyQuickToggle(log: LogSnapshot | null, option: QuickLogOption): LogSnapshot {
  const base = log ?? EMPTY_LOG;

  if (option.kind === 'flow') {
    const isOn = base.flow !== 'none';
    return { ...base, flow: isOn ? 'none' : option.flow };
  }

  const has = base.symptoms.includes(option.symptom);
  return {
    ...base,
    symptoms: has
      ? base.symptoms.filter((s) => s !== option.symptom)
      : [...base.symptoms, option.symptom],
  };
}
