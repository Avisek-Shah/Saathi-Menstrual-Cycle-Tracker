import { AppState } from 'react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { addMonth, currentMonthFor, getMonthGrid } from '../../core/calendar';
import { DaySheet } from '../../components/cycle/DaySheet';
import { MonthGrid } from '../../components/cycle/MonthGrid';
import { MonthNavButton } from '../../components/ui/MonthNavButton';
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

// Defensive fallback only: `ready` (checked below before this is used) is set true in
// useCycleStore.refresh() at the same time as `prediction`, so in practice this never
// renders. A complete, module-scope constant — not a per-render `as Prediction` cast that
// silently drops six required fields.
const EMPTY_PREDICTION: Prediction = {
  avgCycleLength: 0,
  avgPeriodLength: 0,
  nextPeriodStart: '',
  nextPeriodEnd: '',
  predictionWindow: 0,
  ovulationDate: '',
  fertileStart: '',
  fertileEnd: '',
  confidence: 'low',
  isIrregular: false,
  cyclesUsed: 0,
};

export default function CalendarScreen() {
  const router = useRouter();
  const settings = useSettingsStore((s) => s.settings);
  const system = settings.calendar_system ?? 'AD';
  const periods = useCycleStore((s) => s.periods);
  const prediction = useCycleStore((s) => s.prediction);
  const ready = useCycleStore((s) => s.ready);
  const refresh = useCycleStore((s) => s.refresh);
  const saveLog = useCycleStore((s) => s.saveLog);

  const [today, setToday] = useState(() => todayIso());
  const [cursor, setCursor] = useState(() => currentMonthFor(system, today));
  const [logs, setLogs] = useState<Record<string, dailyLogs.LogRow>>({});
  const [selected, setSelected] = useState<string | null>(null);

  const current = useMemo(() => currentMonthFor(system, today), [system, today]);
  const end = useMemo(() => addMonth(current.year, current.month, 3), [current]); // §6.3 — cannot view past current + 3.

  // §6.3 — switching AD ↔ BS re-derives the opening month; it never tries to translate the
  // current cursor between systems. Deliberately keyed on `system` alone (not `today`, not
  // `current`) — the cursor must NOT jump back to the current month on a midnight rollover
  // while the user has navigated elsewhere.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCursor(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [system]);

  const refreshToday = useCallback(() => {
    const fresh = todayIso();
    setToday(fresh);
    void refresh(fresh);
  }, [refresh]);

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

  const canNext = cursor.year < end.year || (cursor.year === end.year && cursor.month < end.month);
  const canPrev = true;

  const goMonth = useCallback(
    (delta: number) => {
      setCursor((c) => {
        const next = addMonth(c.year, c.month, delta);
        // Checked against `next` (derived from the real prior `c`), not the outer `canNext` —
        // that was a stale snapshot from render time. Two `goMonth(1)` calls batched together
        // (rapid double-tap, or a swipe landing right after a button press) both closed over
        // the same `canNext`, so the guard passed twice and the cursor skipped one month past
        // `end`.
        const overshoots =
          next.year > end.year || (next.year === end.year && next.month > end.month);
        if (delta > 0 && overshoots) return c;
        return next;
      });
    },
    [end],
  );

  const grid = useMemo(
    () => getMonthGrid(cursor.year, cursor.month, system, today),
    [cursor, system, today],
  );
  const rangeStart = grid.cells[0].iso;
  const rangeEnd = grid.cells[grid.cells.length - 1].iso;

  const fetchMonthLogs = useCallback(async (start: string, end: string) => {
    const rows = await dailyLogs.getRange(start, end);
    return Object.fromEntries(rows.map((r) => [r.date, r]));
  }, []);

  const reloadMonthLogs = useCallback(async () => {
    setLogs(await fetchMonthLogs(rangeStart, rangeEnd));
  }, [fetchMonthLogs, rangeStart, rangeEnd]);

  // Bumped on focus so a day logged elsewhere (Home) shows up here even when the visible
  // month range hasn't changed — `periods`/`prediction` already refresh on focus via the
  // cycle store, but this screen's own `logs` map otherwise only refetches when the range
  // does, and `dayCellState` (core/home.ts) needs both a logged flow and a containing period
  // to render anything but blank.
  const [reloadToken, setReloadToken] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setReloadToken((t) => t + 1);
    }, []),
  );

  useEffect(() => {
    let cancelled = false;
    void fetchMonthLogs(rangeStart, rangeEnd).then((map) => {
      if (!cancelled) setLogs(map);
    });
    return () => {
      cancelled = true;
    };
    // reloadToken only forces a refetch on focus; it carries no data of its own.
  }, [fetchMonthLogs, rangeStart, rangeEnd, reloadToken]);

  // §6.3 — swipe horizontally between months, in addition to the arrow controls.
  const swipe = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .onEnd((e) => {
      if (e.translationX <= -SWIPE_THRESHOLD) goMonth(1);
      else if (e.translationX >= SWIPE_THRESHOLD) goMonth(-1);
    });

  // Stable identity so `MonthGrid` can memoize its per-cell press handlers instead of
  // rebuilding them on every unrelated re-render.
  const handlePress = useCallback((dateIso: string) => setSelected(dateIso), []);

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

  const p = prediction ?? EMPTY_PREDICTION;

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
            // No horizontal padding of its own — `Screen` owns it, so the arrows line up with
            // the grid's outer columns instead of sitting further in.
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <MonthNavButton
              glyph={en.calendarPrevGlyph}
              accessibilityLabel={en.calendarPrevMonth}
              disabled={!canPrev}
              onPress={() => goMonth(-1)}
            />
            <MonthNavButton
              glyph={en.calendarNextGlyph}
              accessibilityLabel={en.calendarNextMonth}
              disabled={!canNext}
              onPress={() => goMonth(1)}
            />
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
        log={selected ? (logs[selected] ?? null) : null}
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
