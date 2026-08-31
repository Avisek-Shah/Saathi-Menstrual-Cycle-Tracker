import { describe, expect, it } from '@jest/globals';

import { groupByMonth, summariseEntry, type JournalRow } from './journal';

const row = (date: string, extra: Partial<JournalRow> = {}): JournalRow => ({
  date,
  flow: 'none',
  moods: [],
  symptoms: [],
  note: null,
  ...extra,
});

describe('summariseEntry', () => {
  it('flags a day with no flow as not a flow day', () => {
    expect(summariseEntry(row('2025-08-10', { moods: ['calm'] })).hasFlow).toBe(false);
  });

  it('takes only the first line of a note', () => {
    const entry = summariseEntry(row('2025-08-10', { note: 'first line\nsecond line' }));
    expect(entry.noteExcerpt).toBe('first line');
  });

  it('leaves noteExcerpt null when there is no note', () => {
    expect(summariseEntry(row('2025-08-10')).noteExcerpt).toBeNull();
  });
});

describe('groupByMonth (§6.5)', () => {
  it('groups newest month first, and newest day first within a month', () => {
    const groups = groupByMonth(
      [row('2025-07-15'), row('2025-08-01'), row('2025-08-20'), row('2025-06-05')],
      'AD',
    );
    expect(groups.map((g) => g.key)).toEqual(['2025-08', '2025-07', '2025-06']);
    expect(groups[0].entries.map((e) => e.date)).toEqual(['2025-08-20', '2025-08-01']);
  });

  it('labels each group with the AD month name', () => {
    const groups = groupByMonth([row('2025-08-10')], 'AD');
    expect(groups[0].label).toBe('August 2025');
  });

  it('groups by the BS month when the active system is BS', () => {
    // 2025-08-10 (AD) falls in Shrawan 2082 (BS) per the existing calendar core.
    const groups = groupByMonth([row('2025-08-10')], 'BS');
    expect(groups[0].label).toBe('Shrawan 2082');
  });

  it('returns nothing for an empty history', () => {
    expect(groupByMonth([], 'AD')).toEqual([]);
  });
});
