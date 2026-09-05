import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, View } from 'react-native';

import { formatDate, formatDateRange } from '../../core/calendar';
import type { Symptom } from '../../core/enums';
import {
  cycleDay,
  cycleRingModel,
  currentPeriod,
  heroPhase,
  lastPeriodStartOnOrBefore,
  predictionDateRange,
  primaryAction,
} from '../../core/home';
import { lateState } from '../../core/prediction';
import {
  applyQuickToggle,
  quickLogOptions,
  rankRecentSymptoms,
  type LogSnapshot,
} from '../../core/quickLog';
import { IrregularNoticeCard } from '../../components/cycle/IrregularNoticeCard';
import { CycleRingCard } from '../../components/cycle/CycleRingCard';
import { FertileCard } from '../../components/cycle/FertileCard';
import { LongGapCard } from '../../components/cycle/LongGapCard';
import { LogSummary } from '../../components/cycle/LogSummary';
import { MiniStatCard } from '../../components/cycle/MiniStatCard';
import { QuickLog } from '../../components/cycle/QuickLog';
import { StartPrompt } from '../../components/cycle/StartPrompt';
import { Button } from '../../components/ui/Button';
import { Screen } from '../../components/ui/Screen';
import * as dailyLogs from '../../db/repositories/dailyLogs';
import { spacing } from '../../theme/spacing';
import { en } from '../../i18n/en';
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
  const prediction = useCycleStore((s) => s.prediction);
  const periods = useCycleStore((s) => s.periods);
  const todayLog = useCycleStore((s) => s.todayLog);
  const ready = useCycleStore((s) => s.ready);
  const refresh = useCycleStore((s) => s.refresh);
  const saveLog = useCycleStore((s) => s.saveLog);

  const [today, setToday] = useState(() => todayIso());
  const [startPromptDismissed, setStartPromptDismissed] = useState(false);
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

  // Ring model + hero phase + late state, in one memo so the hooks stay unconditional above
  // the `!ready` early return. `lateState` needs the anchor, so it is resolved here too.
  const ring = useMemo(() => {
    if (!prediction) return null;
    const anchor = lastPeriodStartOnOrBefore(periods, today);
    const late = lateState({
      nextPeriodStart: prediction.nextPeriodStart,
      predictionWindow: prediction.predictionWindow,
      lastPeriodStart: anchor,
      today,
      flowLoggedSinceNextStart: periods.some((p) => p.start_date >= prediction.nextPeriodStart),
    });
    return {
      anchor,
      late,
      model: cycleRingModel({ periods, prediction, today, late }),
      phase: heroPhase({ periods, prediction, today, late }),
    };
  }, [prediction, periods, today]);

  if (!ready || !prediction || !ring) {
    return <Screen />;
  }

  const { anchor, late, model, phase } = ring;
  const onPeriod = currentPeriod(periods, today);

  const range = predictionDateRange(prediction.nextPeriodStart, prediction.predictionWindow);

  const action = primaryAction({
    onPeriod: onPeriod !== null,
    hasFlowToday: todayLog !== null && todayLog.flow !== 'none',
    periodExpected:
      late.status === 'expectedNow' ||
      late.status === 'noPeriodYet' ||
      late.status === 'paused' ||
      late.status === 'longGap',
  });

  const onPrimary = () => {
    if (action === 'periodStarted') {
      void saveLog(today, 'medium', [], [], null, today);
    } else {
      router.push(`/log/${today}`);
    }
  };

  const showIrregularNotice = prediction.isIrregular && !settings.irregular_notice_seen;
  const showStartPrompt =
    phase.phase === 'noPeriodYet' && phase.showStartPrompt && !startPromptDismissed;

  // Mini-cards only ever show a date within the current cycle (≤45 days out per §5.5's
  // widest window), so the year is always implicit — dropping it here cuts the label to its
  // scannable minimum: "24 Sep" instead of "24 Sep 2026".
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
        <IrregularNoticeCard
          onDismiss={() => void updateSettings({ irregular_notice_seen: true })}
        />
      ) : null}
      {showStartPrompt ? (
        <StartPrompt
          onConfirm={() => {
            setStartPromptDismissed(true);
            void saveLog(today, 'medium', [], [], null, today);
          }}
          onDismiss={() => setStartPromptDismissed(true)}
        />
      ) : null}
      {phase.phase === 'longGap' ? (
        <LongGapCard onReanchor={() => router.push('/settings/profile')} />
      ) : null}

      <CycleRingCard
        model={model}
        phase={phase}
        prediction={prediction}
        calendarSystem={settings.calendar_system}
      />

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <MiniStatCard label={en.overviewCycleDayLabel} value={String(cycleDay(anchor, today))} />
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

      <FertileCard
        prediction={prediction}
        calendarSystem={settings.calendar_system}
        today={today}
      />

      <LogSummary log={todayLog} onEdit={() => router.push(`/log/${today}`)} />
    </Screen>
  );
}
