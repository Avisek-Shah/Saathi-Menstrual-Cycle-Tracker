import { AppState } from 'react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { addMonth, currentBsMonth, currentBsYear, getMonthGrid, type CalendarSystem } from '../../core/calendar';
import { DaySheet } from '../../components/cycle/DaySheet';
import { MonthGrid } from '../../components/cycle/MonthGrid';
import { Screen } from '../../components/ui/Screen';
import { en } from '../../i18n/en';
import { todayIso } from '../../services/clock';
import { colors } from '../../theme/colors';
import { MIN_TOUCH_TARGET, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { useCycleStore } from '../../stores/useCycleStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import * as dailyLogs from '../../db/repositories/dailyLogs';
import type { FlowLevel } from '../../core/enums';
import type { Prediction } from '../../core/prediction';

const SWIPE_THRESHOLD = 50;

/** The (year, month) containing `iso`, in the given calendar system (§6.3). */
function currentMonthFor(system: CalendarSystem, today: string): { year: number; month: number } {
  if (system === 'BS') return { year: currentBsYear(today), month: currentBsMonth(today) };
  const d = new Date(today + 'T12:00:00');
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export default function CalendarScreen() {
  const router = useRouter();
  const settings = useSettingsStore((s) => s.settings);
  const system = settings.calendar_system ?? 'AD';
  const { periods, prediction, ready, refresh, saveLog } = useCycleStore();

  const [today, setToday] = useState(todayIso());
  const [cursor, setCursor] = useState(() => currentMonthFor(system, today));
  const [logs, setLogs] = useState<Record<string, dailyLogs.LogRow>>({});
  const [selected, setSelected] = useState<string | null>(null);

  // §6.3 — switching AD ↔ BS re-derives the opening month; it never tries to translate the
  // current cursor between systems.
  useEffect(() => {
    setCursor(currentMonthFor(system, today));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [system]);

  const refreshToday = useCallback(() => {
    const fresh = todayIso();
    setToday(fresh);
    void refresh(fresh);
  }, [refresh]);

  useFocusEffect(useCallback(() => { refreshToday(); }, [refreshToday]));

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') refreshToday();
    });
    return () => sub.remove();
  }, [refreshToday]);

  const current = currentMonthFor(system, today);
  const end = addMonth(current.year, current.month, 3); // §6.3 — cannot view past current + 3.
  const canNext = cursor.year < end.year || (cursor.year === end.year && cursor.month < end.month);
  const canPrev = true;

  const goMonth = useCallback(
    (delta: number) => {
      setCursor((c) => {
        const next = addMonth(c.year, c.month, delta);
        if (delta > 0 && !canNext) return c;
        return next;
      });
    },
    [canNext],
  );

  const grid = useMemo(() => getMonthGrid(cursor.year, cursor.month, system, today), [cursor, system, today]);
  const rangeStart = grid.cells[0].iso;
  const rangeEnd = grid.cells[grid.cells.length - 1].iso;

  const reloadMonthLogs = useCallback(async () => {
    const rows = await dailyLogs.getRange(rangeStart, rangeEnd);
    setLogs(Object.fromEntries(rows.map((r) => [r.date, r])));
  }, [rangeStart, rangeEnd]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await dailyLogs.getRange(rangeStart, rangeEnd);
      if (!cancelled) setLogs(Object.fromEntries(rows.map((r) => [r.date, r])));
    })();
    return () => { cancelled = true; };
  }, [rangeStart, rangeEnd]);

  // §6.3 — swipe horizontally between months, in addition to the arrow controls.
  const swipe = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .onEnd((e) => {
      if (e.translationX <= -SWIPE_THRESHOLD) goMonth(1);
      else if (e.translationX >= SWIPE_THRESHOLD) goMonth(-1);
    });

  const handlePress = (dateIso: string) => setSelected(dateIso);

  const handleSelectFlow = async (flow: FlowLevel) => {
    if (!selected) return;
    const existing = logs[selected] ?? null;
    await saveLog(
      selected,
      flow,
      existing?.moods ?? [],
      existing?.symptoms ?? [],
      existing?.note ?? null,
      today,
    );
    await reloadMonthLogs();
  };

  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  const p = prediction ?? ({
    ovulationDate: '',
    fertileStart: '',
    fertileEnd: '',
    nextPeriodStart: '',
    nextPeriodEnd: '',
  } as Prediction);

  return (
    <Screen
      title={en.calendar}
      bottomInset
      titleAction={
        !grid.isCurrentMonth ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setCursor(current)}
            style={{ minHeight: MIN_TOUCH_TARGET, justifyContent: 'center' }}
          >
            <Text style={{ ...typography.body, color: colors.primary }}>{en.calendarToday}</Text>
          </Pressable>
        ) : null
      }
    >
      <GestureDetector gesture={swipe}>
        <View style={{ gap: spacing.md }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: spacing.md,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={en.calendarPrevMonth}
              disabled={!canPrev}
              onPress={() => goMonth(-1)}
              hitSlop={8}
              style={{ minWidth: MIN_TOUCH_TARGET, minHeight: MIN_TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ ...typography.body, color: colors.text }}>{en.calendarPrevGlyph}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={en.calendarNextMonth}
              disabled={!canNext}
              onPress={() => goMonth(1)}
              hitSlop={8}
              style={{ minWidth: MIN_TOUCH_TARGET, minHeight: MIN_TOUCH_TARGET, alignItems: 'center', justifyContent: 'center', opacity: canNext ? 1 : 0.3 }}
            >
              <Text style={{ ...typography.body, color: colors.text }}>{en.calendarNextGlyph}</Text>
            </Pressable>
          </View>

          <MonthGrid
            grid={grid}
            today={today}
            periods={periods}
            prediction={p}
            monthLogs={logs}
            system={system}
            selected={selected}
            onPressDay={handlePress}
          />
        </View>
      </GestureDetector>

      <DaySheet
        dateIso={selected}
        today={today}
        system={system}
        periods={periods}
        prediction={p}
        log={selected ? logs[selected] ?? null : null}
        onSelectFlow={(flow) => void handleSelectFlow(flow)}
        onEditFull={() => {
          if (selected) router.push(`/log/${selected}`);
          setSelected(null);
        }}
        onClose={() => setSelected(null)}
      />
    </Screen>
  );
}
