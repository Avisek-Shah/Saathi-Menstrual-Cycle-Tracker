import { describe, expect, it } from '@jest/globals';

import {
  applyQuickToggle,
  quickLogOptions,
  rankRecentSymptoms,
  type LogSnapshot,
} from './quickLog';

const empty: LogSnapshot = { flow: 'none', moods: [], symptoms: [], note: null };

describe('quickLogOptions (§6.2)', () => {
  it('offers a flow chip only when on a period', () => {
    const onPeriod = quickLogOptions({ log: null, onPeriod: true, recentSymptoms: [] });
    expect(onPeriod).toEqual([{ kind: 'flow', flow: 'medium', selected: false }]);

    const notOnPeriod = quickLogOptions({ log: null, onPeriod: false, recentSymptoms: [] });
    expect(notOnPeriod).toEqual([]);
  });

  it('marks the flow chip selected when today already has flow', () => {
    const options = quickLogOptions({
      log: { ...empty, flow: 'heavy' },
      onPeriod: true,
      recentSymptoms: [],
    });
    expect(options[0]).toEqual({ kind: 'flow', flow: 'medium', selected: true });
  });

  it('fills remaining slots with recent symptoms, deduplicated', () => {
    const options = quickLogOptions({
      log: { ...empty, symptoms: ['cramps'] },
      onPeriod: true,
      recentSymptoms: ['cramps', 'cramps', 'headache', 'bloating'],
    });
    expect(options).toEqual([
      { kind: 'flow', flow: 'medium', selected: false },
      { kind: 'symptom', symptom: 'cramps', selected: true },
      { kind: 'symptom', symptom: 'headache', selected: false },
      { kind: 'symptom', symptom: 'bloating', selected: false },
    ]);
  });

  it('caps at 5 options total', () => {
    const options = quickLogOptions({
      log: null,
      onPeriod: true,
      recentSymptoms: ['cramps', 'headache', 'bloating', 'nausea', 'fatigue', 'acne'],
    });
    expect(options).toHaveLength(5);
  });
});

describe('applyQuickToggle (§6.2 merge semantics)', () => {
  it('toggling a flow chip on sets the quick flow level and keeps mood/note', () => {
    const log: LogSnapshot = { flow: 'none', moods: ['happy'], symptoms: [], note: 'ok' };
    const result = applyQuickToggle(log, { kind: 'flow', flow: 'medium', selected: false });
    expect(result).toEqual({ flow: 'medium', moods: ['happy'], symptoms: [], note: 'ok' });
  });

  it('toggling a flow chip off clears flow to none only', () => {
    const log: LogSnapshot = { flow: 'heavy', moods: ['happy'], symptoms: ['cramps'], note: null };
    const result = applyQuickToggle(log, { kind: 'flow', flow: 'medium', selected: true });
    expect(result).toEqual({ flow: 'none', moods: ['happy'], symptoms: ['cramps'], note: null });
  });

  it('adds a symptom without touching flow, mood, or note', () => {
    const log: LogSnapshot = { flow: 'medium', moods: ['calm'], symptoms: [], note: 'note' };
    const result = applyQuickToggle(log, {
      kind: 'symptom',
      symptom: 'cramps',
      selected: false,
    });
    expect(result).toEqual({ flow: 'medium', moods: ['calm'], symptoms: ['cramps'], note: 'note' });
  });

  it('removes only the tapped symptom, leaving others', () => {
    const log: LogSnapshot = {
      flow: 'medium',
      moods: [],
      symptoms: ['cramps', 'bloating'],
      note: null,
    };
    const result = applyQuickToggle(log, {
      kind: 'symptom',
      symptom: 'cramps',
      selected: true,
    });
    expect(result.symptoms).toEqual(['bloating']);
  });

  it('starts from an empty log when nothing was logged yet', () => {
    const result = applyQuickToggle(null, {
      kind: 'symptom',
      symptom: 'headache',
      selected: false,
    });
    expect(result).toEqual({ flow: 'none', moods: [], symptoms: ['headache'], note: null });
  });
});

describe('rankRecentSymptoms (§6.2 quick-log source)', () => {
  it('orders by frequency, most-used first', () => {
    const rows = [
      { symptoms: ['cramps'] as const },
      { symptoms: ['headache'] as const },
      { symptoms: ['cramps'] as const },
      { symptoms: ['cramps', 'headache'] as const },
    ];
    expect(rankRecentSymptoms(rows)).toEqual(['cramps', 'headache']);
  });

  it('breaks a tie by which symptom was seen first (most recent, since rows are newest-first)', () => {
    const rows = [{ symptoms: ['bloating'] as const }, { symptoms: ['cramps'] as const }];
    expect(rankRecentSymptoms(rows)).toEqual(['bloating', 'cramps']);
  });

  it('caps at the requested limit', () => {
    const rows = [
      { symptoms: ['cramps', 'headache', 'bloating', 'nausea', 'fatigue', 'acne'] as const },
    ];
    expect(rankRecentSymptoms(rows, 3)).toHaveLength(3);
  });

  it('returns nothing for an empty history', () => {
    expect(rankRecentSymptoms([])).toEqual([]);
  });
});
