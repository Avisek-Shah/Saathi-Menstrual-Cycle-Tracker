import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, ScrollView, View } from 'react-native';

import { formatDate } from '../../core/calendar';
import {
  cycleDay,
  currentPeriod,
  lastPeriodStartOnOrBefore,
  predictionDateRange,
  primaryAction,
} from '../../core/home';
import { lateState } from '../../core/prediction';
import { IrregularNoticeCard } from '../../components/cycle/IrregularNoticeCard';
import { FertileCard } from '../../components/cycle/FertileCard';
import { LogSummary } from '../../components/cycle/LogSummary';
import { RecalcCard } from '../../components/cycle/RecalcCard';
import { StatusCard } from '../../components/cycle/StatusCard';
import { WeekStrip } from '../../components/cycle/WeekStrip';
import { Button } from '../../components/ui/Button';
import { en, fill } from '../../i18n/en';
import { todayIso } from '../../services/clock';
import { useCycleStore } from '../../stores/useCycleStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

export default function Home() {
  const router = useRouter();
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.update);
  const { prediction, periods, todayLog, weekLogs, ready, refresh, saveLog } = useCycleStore();

  const [today, setToday] = useState(todayIso());
  const [recalcDismissed, setRecalcDismissed] = useState(false);

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

  if (!ready || !prediction) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
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

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}
    >
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

      <WeekStrip
        today={today}
        periods={periods}
        prediction={prediction}
        weekLogs={weekLogs}
        onPressDay={(dateIso) => router.push(`/log/${dateIso}`)}
      />

      <FertileCard prediction={prediction} calendarSystem={settings.calendar_system} today={today} />

      <LogSummary log={todayLog} onEdit={() => router.push(`/log/${today}`)} />
    </ScrollView>
  );
}
