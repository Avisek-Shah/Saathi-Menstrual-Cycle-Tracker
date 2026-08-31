import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Text } from 'react-native';

import type { JournalRow } from '../../core/journal';
import { Card } from '../../components/ui/Card';
import { Screen } from '../../components/ui/Screen';
import { JournalTimeline } from '../../components/cycle/JournalTimeline';
import * as dailyLogs from '../../db/repositories/dailyLogs';
import { en, fill } from '../../i18n/en';
import { useCycleStore } from '../../stores/useCycleStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

// SPEC: 2026-08-31 — §6.5 says the journal "loads a page at a time" without a page size. 20
// rows is a few weeks of daily logging per page, small enough to stay cheap on-device. See
// DECISIONS.md.
const JOURNAL_PAGE_SIZE = 20;

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
  const { prediction, ready } = useCycleStore();

  const [journalRows, setJournalRows] = useState<JournalRow[]>([]);
  const [journalDone, setJournalDone] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadFirstPage = useCallback(async () => {
    const rows = await dailyLogs.getRecent(JOURNAL_PAGE_SIZE);
    setJournalRows(rows.map(toJournalRow));
    setJournalDone(rows.length < JOURNAL_PAGE_SIZE);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadFirstPage();
    }, [loadFirstPage]),
  );

  const loadMore = async () => {
    if (loadingMore || journalDone || journalRows.length === 0) return;
    setLoadingMore(true);
    const oldest = journalRows[journalRows.length - 1].date;
    const rows = await dailyLogs.getRecent(JOURNAL_PAGE_SIZE, oldest);
    setJournalRows((prev) => [...prev, ...rows.map(toJournalRow)]);
    setJournalDone(rows.length < JOURNAL_PAGE_SIZE);
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
          <Text style={{ ...typography.body, color: colors.textMuted }}>{en.insightsEmptyStats}</Text>
        </Card>
        {journalSection}
      </Screen>
    );
  }

  const { avgCycleLength, avgPeriodLength, cyclesUsed, confidence } = prediction;
  const hasEnough = (cyclesUsed ?? 0) >= 2;

  return (
    <Screen title={en.insights} bottomInset gap={spacing.lg}>
      {!hasEnough ? (
        <Card>
          <Text style={{ ...typography.body, color: colors.textMuted }}>{en.insightsEmptyStats}</Text>
        </Card>
      ) : (
        <>
          <StatRow label={en.insightsAvgCycle} value={fill(en.insightsDays, { n: String(avgCycleLength) })} />
          <StatRow label={en.insightsAvgPeriod} value={fill(en.insightsDays, { n: String(avgPeriodLength) })} />
          <Text style={{ ...typography.caption, color: colors.textMuted }}>
            {fill(en.insightsCyclesUsed, { n: String(cyclesUsed) })}
          </Text>
          {confidence === 'low' ? (
            <Text style={{ ...typography.caption, color: colors.textMuted }}>{en.confidenceEstimate}</Text>
          ) : null}
        </>
      )}

      {journalSection}
    </Screen>
  );
}
