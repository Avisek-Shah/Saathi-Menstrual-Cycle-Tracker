import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { AppState, Text } from 'react-native';

import type { JournalRow } from '../../core/journal';
import { Card } from '../../components/ui/Card';
import { Screen } from '../../components/ui/Screen';
import { CycleOverviewCard } from '../../components/cycle/CycleOverviewCard';
import { JournalTimeline } from '../../components/cycle/JournalTimeline';
import * as dailyLogs from '../../db/repositories/dailyLogs';
import { en, fill } from '../../i18n/en';
import { useCycleStore } from '../../stores/useCycleStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { todayIso } from '../../services/clock';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

// SPEC: 2026-08-31 — §6.5 says the journal "loads a page at a time" without a page size. 20
// rows is a few weeks of daily logging per page, small enough to stay cheap on-device. See
// DECISIONS.md.
const JOURNAL_PAGE_SIZE = 20;
// SPEC: §6.5 doesn't cap total journal depth. "Load more" tapped repeatedly is an unbounded
// list mounted into a ScrollView; 500 rows (~1.3 years of daily logging) is a hard ceiling
// so a determined tap-through can't grow it forever. See DECISIONS.md.
const JOURNAL_MAX_ROWS = 500;

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <Text style={{ ...typography.caption, color: colors.textMuted }}>{label}</Text>
      <Text style={{ ...typography.hero, color: colors.text }}>{value}</Text>
    </Card>
  );
}

/** A raw `daily_logs` row trusted as enum-typed: every value in it was written through chips
 * typed to `FlowLevel`/`Mood`/`Symptom` (§4.2), so the journal can read it back as such. */
function toJournalRow(row: dailyLogs.LogRow): JournalRow {
  return {
    date: row.date,
    flow: row.flow as JournalRow['flow'],
    moods: row.moods as JournalRow['moods'],
    symptoms: row.symptoms as JournalRow['symptoms'],
    note: row.note,
  };
}

export default function InsightsScreen() {
  const router = useRouter();
  const system = useSettingsStore((s) => s.settings.calendar_system);
  const prediction = useCycleStore((s) => s.prediction);
  const periods = useCycleStore((s) => s.periods);
  const ready = useCycleStore((s) => s.ready);

  // Kept in state (not read in the render body) and refreshed on focus/foreground, matching
  // Home and Calendar — otherwise "Cycle day N" on CycleOverviewCard goes stale across
  // midnight while the tab stays mounted.
  const [today, setToday] = useState(() => todayIso());
  const refreshToday = useCallback(() => setToday(todayIso()), []);

  useFocusEffect(
    useCallback(() => {
      refreshToday();
    }, [refreshToday]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') refreshToday();
    });
    return () => sub.remove();
  }, [refreshToday]);

  const [journalRows, setJournalRows] = useState<JournalRow[]>([]);
  const [journalDone, setJournalDone] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  // How many rows to re-fetch on focus: at least a page, but never fewer than what's already
  // loaded — otherwise switching tabs after "Load more" silently drops rows back to one page.
  const journalDepthRef = useRef(JOURNAL_PAGE_SIZE);

  const refreshJournal = useCallback(async () => {
    const minCount = journalDepthRef.current;
    const rows = await dailyLogs.getRecent(minCount);
    setJournalRows(rows.map(toJournalRow));
    journalDepthRef.current = rows.length;
    setJournalDone(rows.length < minCount || rows.length >= JOURNAL_MAX_ROWS);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshJournal();
    }, [refreshJournal]),
  );

  const loadMore = async () => {
    if (loadingMore || journalDone || journalRows.length === 0) return;
    setLoadingMore(true);
    const oldest = journalRows[journalRows.length - 1].date;
    const remaining = JOURNAL_MAX_ROWS - journalRows.length;
    const rows = await dailyLogs.getRecent(Math.min(JOURNAL_PAGE_SIZE, remaining), oldest);
    setJournalRows((prev) => {
      const next = [...prev, ...rows.map(toJournalRow)];
      journalDepthRef.current = next.length;
      return next;
    });
    setJournalDone(rows.length < JOURNAL_PAGE_SIZE || journalDepthRef.current >= JOURNAL_MAX_ROWS);
    setLoadingMore(false);
  };

  const journalSection = (
    <>
      <Text style={{ ...typography.cardTitle, color: colors.text }}>{en.insightsJournalTitle}</Text>
      <JournalTimeline
        rows={journalRows}
        system={system}
        hasMore={!journalDone}
        loadingMore={loadingMore}
        onPressDay={(dateIso) => router.push(`/log/${dateIso}`)}
        onLoadMore={() => void loadMore()}
      />
    </>
  );

  if (!ready || !prediction) {
    return (
      <Screen title={en.insights} bottomInset>
        <Card>
          <Text style={{ ...typography.body, color: colors.textMuted }}>
            {en.insightsEmptyStats}
          </Text>
        </Card>
        {journalSection}
      </Screen>
    );
  }

  const { avgCycleLength, avgPeriodLength, cyclesUsed, confidence } = prediction;
  const hasEnough = (cyclesUsed ?? 0) >= 2;

  return (
    <Screen title={en.insights} bottomInset gap={spacing.lg}>
      <CycleOverviewCard periods={periods} prediction={prediction} today={today} system={system} />

      {!hasEnough ? (
        <Card>
          <Text style={{ ...typography.body, color: colors.textMuted }}>
            {en.insightsEmptyStats}
          </Text>
        </Card>
      ) : (
        <>
          <StatRow
            label={en.insightsAvgCycle}
            value={fill(en.insightsDays, { n: String(avgCycleLength) })}
          />
          <StatRow
            label={en.insightsAvgPeriod}
            value={fill(en.insightsDays, { n: String(avgPeriodLength) })}
          />
          <Text style={{ ...typography.caption, color: colors.textMuted }}>
            {fill(en.insightsCyclesUsed, { n: String(cyclesUsed) })}
          </Text>
          {confidence === 'low' ? (
            <Text style={{ ...typography.caption, color: colors.textMuted }}>
              {en.confidenceEstimate}
            </Text>
          ) : null}
        </>
      )}

      {journalSection}
    </Screen>
  );
}
