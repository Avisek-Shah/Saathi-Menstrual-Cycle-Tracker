import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, View } from 'react-native';

import { formatDate, formatDateRange } from '../../core/calendar';
import type { Symptom } from '../../core/enums';
import {
  cycleDay,
  cycleRingDays,
  currentPeriod,
  lastPeriodStartOnOrBefore,
  predictionDateRange,
  primaryAction,
} from '../../core/home';
import { lateState } from '../../core/prediction';
import { applyQuickToggle, quickLogOptions, rankRecentSymptoms, type LogSnapshot } from '../../core/quickLog';
import { IrregularNoticeCard } from '../../components/cycle/IrregularNoticeCard';
import { CycleRingCard } from '../../components/cycle/CycleRingCard';
import { FertileCard } from '../../components/cycle/FertileCard';
import { LogSummary } from '../../components/cycle/LogSummary';
import { MiniStatCard } from '../../components/cycle/MiniStatCard';
import { QuickLog } from '../../components/cycle/QuickLog';
import { RecalcCard } from '../../components/cycle/RecalcCard';
import { Button } from '../../components/ui/Button';
import { Screen } from '../../components/ui/Screen';
import * as dailyLogs from '../../db/repositories/dailyLogs';
import { spacing } from '../../theme/spacing';
import { en, fill } from '../../i18n/en';
import { todayIso } from '../../services/clock';
import { useCycleStore } from '../../stores/useCycleStore';
import { useSettingsStore } from '../../stores/useSettingsStore';

// SPEC: 2026-08-31 — §6.2 says the quick-log row offers "the user's most-used recent
// symptoms" without a sample size. 30 days is roughly one full cycle, which is the natural
// window for "recent" here. See DECISIONS.md.
const RECENT_LOG_SAMPLE = 30;

export default function Home() {
  const router = useRouter();
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.update);
  const { prediction, periods, todayLog, ready, refresh, saveLog } = useCycleStore();

  const [today, setToday] = useState(todayIso());
  const [recalcDismissed, setRecalcDismissed] = useState(false);
  const [recentSymptoms, setRecentSymptoms] = useState<Symptom[]>([]);

  useFocusEffect(
    useCallback(() => {
      void refresh(today);
    }, [today, refresh]),
  );

  // §5.8 — recompute on foreground; also re-reads the date to catch a midnight rollover.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        const fresh = todayIso();
        setToday(fresh);
        void refresh(fresh);
      }
    });
    return () => sub.remove();
  }, [refresh]);

  // §5.6 — reset the notice flag when cycles stop being irregular, so a later re-detection shows it again.
  useEffect(() => {
    if (!prediction) return;
    if (!prediction.isIrregular && settings.irregular_notice_seen) {
      void updateSettings({ irregular_notice_seen: false });
    }
  }, [prediction, settings.irregular_notice_seen, updateSettings]);

  // §6.2 quick-log row — most-used recent symptoms, refreshed whenever Home regains focus.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void dailyLogs.getRecent(RECENT_LOG_SAMPLE, today).then((rows) => {
        if (!cancelled) setRecentSymptoms(rankRecentSymptoms(rows as { symptoms: Symptom[] }[]));
      });
      return () => {
        cancelled = true;
      };
    }, [today]),
  );

  if (!ready || !prediction) {
    return <Screen />;
  }

  const anchor = lastPeriodStartOnOrBefore(periods, today);
  const onPeriod = currentPeriod(periods, today);
  const late = lateState({
    nextPeriodStart: prediction.nextPeriodStart,
    predictionWindow: prediction.predictionWindow,
    lastPeriodStart: anchor,
    today,
    flowLoggedSinceNextStart: periods.some((p) => p.start_date >= prediction.nextPeriodStart),
  });

  const headline = (() => {
    if (onPeriod) {
      return fill(en.onPeriod, { day: cycleDay(onPeriod.start_date, today) });
    }
    if (late.status === 'expectedNow' || late.status === 'offerRecalculate') return en.expectedAroundNow;
    if (late.status === 'late') return fill(en.lateBy, { days: late.daysPast });
    const daysUntil = late.status === 'upcoming' ? late.daysUntil : 0;
    return daysUntil === 1 ? en.periodInOne : fill(en.periodIn, { days: daysUntil });
  })();

  // §5.5's window tops out at ±7 days, so this is always "this year" — dropping the year is
  // the highest-value cut of all, since this line renders squeezed inside the ring itself.
  const range = predictionDateRange(prediction.nextPeriodStart, prediction.predictionWindow);
  const dateLine = range.single
    ? fill(en.predictedOn, { date: formatDate(range.single, settings.calendar_system, 'd MMM') })
    : fill(en.predictedRange, {
        a: formatDate(range.start, settings.calendar_system, 'd MMM'),
        b: formatDate(range.end, settings.calendar_system, 'd MMM'),
      });

  const action = primaryAction({
    onPeriod: onPeriod !== null,
    hasFlowToday: todayLog !== null && todayLog.flow !== 'none',
    periodExpected:
      late.status === 'expectedNow' || late.status === 'late' || late.status === 'offerRecalculate',
  });

  const onPrimary = () => {
    if (action === 'periodStarted') {
      void saveLog(today, 'medium', [], [], null, today);
    } else {
      router.push(`/log/${today}`);
    }
  };

  const showIrregularNotice = prediction.isIrregular && !settings.irregular_notice_seen;
  const showRecalc = late.status === 'offerRecalculate' && !recalcDismissed;

  const ringDays = cycleRingDays({
    anchor,
    cycleLength: prediction.avgCycleLength,
    today,
    periods,
    prediction,
  });
  // Mini-cards only ever show a date within the current cycle (≤45 days out per §5.5's
  // widest window), so the year is always implicit — dropping it here (but not from the
  // shared `formatDateRange`, which other screens use for genuinely cross-year spans) cuts
  // the label to its scannable minimum: "24 Sep" instead of "24 Sep 2026".
  const nextPeriodValue = range.single
    ? formatDate(range.single, settings.calendar_system, 'd MMM')
    : formatDateRange(range.start, range.end, settings.calendar_system);
  const ovulationValue = formatDate(prediction.ovulationDate, settings.calendar_system, 'd MMM');

  // §6.2 — the quick-log row merges into whatever is already logged today; it never opens a modal.
  const todaySnapshot: LogSnapshot = {
    flow: (todayLog?.flow as LogSnapshot['flow']) ?? 'none',
    moods: todayLog?.moods ?? [],
    symptoms: (todayLog?.symptoms as Symptom[]) ?? [],
    note: todayLog?.note ?? null,
  };
  const quickOptions = quickLogOptions({
    log: todaySnapshot,
    onPeriod: onPeriod !== null,
    recentSymptoms,
  });
  const onQuickToggle: Parameters<typeof QuickLog>[0]['onToggle'] = (option) => {
    const merged = applyQuickToggle(todaySnapshot, option);
    void saveLog(today, merged.flow, merged.moods, merged.symptoms, merged.note, today);
  };

  return (
    <Screen bottomInset gap={16}>
      {showIrregularNotice ? (
        <IrregularNoticeCard onDismiss={() => void updateSettings({ irregular_notice_seen: true })} />
      ) : null}
      {showRecalc ? (
        <RecalcCard
          onRecalculate={() => {
            setRecalcDismissed(true);
            void refresh(today);
          }}
          onDismiss={() => setRecalcDismissed(true)}
        />
      ) : null}

      <CycleRingCard
        days={ringDays}
        headline={headline}
        dateLine={dateLine}
        confidenceLabel={prediction.confidence === 'low' ? en.confidenceEstimate : null}
      />

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <MiniStatCard
          label={en.overviewCycleDayLabel}
          value={String(cycleDay(anchor, today))}
        />
        <MiniStatCard label={en.overviewNextPeriod} value={nextPeriodValue} />
        <MiniStatCard label={en.overviewOvulation} value={ovulationValue} />
      </View>

      <Button
        label={action === 'periodStarted' ? en.myPeriodStarted : en.logToday}
        onPress={onPrimary}
      />

      {settings.quick_log_enabled ? (
        <QuickLog options={quickOptions} onToggle={onQuickToggle} />
      ) : null}

      <FertileCard prediction={prediction} calendarSystem={settings.calendar_system} today={today} />

      <LogSummary log={todayLog} onEdit={() => router.push(`/log/${today}`)} />
    </Screen>
  );
}
