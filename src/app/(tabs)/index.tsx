import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import type { Symptom } from '../../core/enums';
import {
  cycleRingModel,
  currentPeriod,
  heroPhase,
  lastPeriodStartOnOrBefore,
  linearStripDays,
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
import { LinearStrip } from '../../components/cycle/LinearStrip';
import { LongGapCard } from '../../components/cycle/LongGapCard';
import { LogSummary } from '../../components/cycle/LogSummary';
import { QuickLog } from '../../components/cycle/QuickLog';
import { StartPrompt } from '../../components/cycle/StartPrompt';
import { Button } from '../../components/ui/Button';
import { Screen } from '../../components/ui/Screen';
import * as dailyLogs from '../../db/repositories/dailyLogs';
import type { LogRow } from '../../db/repositories/dailyLogs';
import { en } from '../../i18n/en';
import { todayIso } from '../../services/clock';
import { useCycleStore } from '../../stores/useCycleStore';
import { useSettingsStore } from '../../stores/useSettingsStore';

// SPEC: 2026-08-31 — §6.2 says the quick-log row offers "the user's most-used recent
// symptoms" without a sample size. 30 days is roughly one full cycle. See DECISIONS.md.
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
  const [stripLogs, setStripLogs] = useState<Record<string, LogRow>>({});

  const stripDays = useMemo(() => linearStripDays(today), [today]);

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

  // §6.2 quick-log row + §2.6 strip — both need recent log rows; refreshed on focus.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void dailyLogs.getRecent(RECENT_LOG_SAMPLE, today).then((rows) => {
        if (!cancelled) setRecentSymptoms(rankRecentSymptoms(rows as { symptoms: Symptom[] }[]));
      });
      void dailyLogs.getRange(stripDays[0], stripDays[stripDays.length - 1]).then((rows) => {
        if (!cancelled) {
          setStripLogs(Object.fromEntries(rows.map((r) => [r.date, r])));
        }
      });
      return () => {
        cancelled = true;
      };
    }, [today, stripDays]),
  );

  // Ring model + hero phase + late state in one memo so the hooks stay unconditional above
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
      late,
      model: cycleRingModel({ periods, prediction, today, late }),
      phase: heroPhase({ periods, prediction, today, late }),
    };
  }, [prediction, periods, today]);

  if (!ready || !prediction || !ring) {
    return <Screen />;
  }

  const { late, model, phase } = ring;
  const onPeriod = currentPeriod(periods, today);

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

  // §6.2 — the quick-log row merges into whatever is already logged today; never opens a modal.
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
    <Screen
      gap={16}
      footer={
        <Button
          label={action === 'periodStarted' ? en.myPeriodStarted : en.logToday}
          onPress={onPrimary}
        />
      }
    >
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
        today={today}
      />

      <LinearStrip
        days={stripDays}
        today={today}
        logsByDate={stripLogs}
        periods={periods}
        prediction={prediction}
        calendarSystem={settings.calendar_system}
        onPressDay={(iso) => router.push(`/log/${iso}`)}
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
