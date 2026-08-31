import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { formatDate } from '../../core/calendar';
import type { Symptom } from '../../core/enums';
import {
  cycleDay,
  currentPeriod,
  lastPeriodStartOnOrBefore,
  predictionDateRange,
  primaryAction,
} from '../../core/home';
import { lateState } from '../../core/prediction';
import { applyQuickToggle, quickLogOptions, rankRecentSymptoms, type LogSnapshot } from '../../core/quickLog';
import { IrregularNoticeCard } from '../../components/cycle/IrregularNoticeCard';
import { FertileCard } from '../../components/cycle/FertileCard';
import { LogSummary } from '../../components/cycle/LogSummary';
import { QuickLog } from '../../components/cycle/QuickLog';
import { RecalcCard } from '../../components/cycle/RecalcCard';
import { StatusCard } from '../../components/cycle/StatusCard';
import { WeekStrip } from '../../components/cycle/WeekStrip';
import { Button } from '../../components/ui/Button';
import { Screen } from '../../components/ui/Screen';
import * as dailyLogs from '../../db/repositories/dailyLogs';
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
  const { prediction, periods, todayLog, weekLogs, ready, refresh, saveLog } = useCycleStore();

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

  const range = predictionDateRange(prediction.nextPeriodStart, prediction.predictionWindow);
  const dateLine = range.single
    ? fill(en.predictedOn, { date: formatDate(range.single, settings.calendar_system) })
    : fill(en.predictedRange, {
        a: formatDate(range.start, settings.calendar_system),
        b: formatDate(range.end, settings.calendar_system),
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

      <StatusCard
        headline={headline}
        dateLine={dateLine}
        cycleDayLabel={fill(en.cycleDay, { day: cycleDay(anchor, today) })}
        confidenceLabel={prediction.confidence === 'low' ? en.confidenceEstimate : null}
      />

      <Button
        label={action === 'periodStarted' ? en.myPeriodStarted : en.logToday}
        onPress={onPrimary}
      />

      {settings.quick_log_enabled ? (
        <QuickLog options={quickOptions} onToggle={onQuickToggle} />
      ) : null}

      <WeekStrip
        today={today}
        periods={periods}
        prediction={prediction}
        weekLogs={weekLogs}
        onPressDay={(dateIso) => router.push(`/log/${dateIso}`)}
      />

      <FertileCard prediction={prediction} calendarSystem={settings.calendar_system} today={today} />

      <LogSummary log={todayLog} onEdit={() => router.push(`/log/${today}`)} />
    </Screen>
  );
}
