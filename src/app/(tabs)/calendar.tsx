import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, FlatList, Pressable, Text, View } from 'react-native';
import type { ListRenderItemInfo, ViewToken } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { addMonth, currentMonthFor } from '../../core/calendar';
import { DaySheet } from '../../components/cycle/DaySheet';
import { MonthListItem } from '../../components/cycle/MonthListItem';
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

interface MonthKey {
  year: number;
  month: number;
}

// §6.3 — cannot view past current month + 3; predictions beyond that are meaningless. Forward
// direction is fixed-size, so the initial list is simply generated straight through the cap —
// there is no forward pagination to write.
const FORWARD_CAP_MONTHS = 3;
// How many months of history the list opens with, and how many more it prepends each time
// `onStartReached` fires. Arbitrary but generous enough that a normal scroll session rarely
// hits the loading edge.
const INITIAL_BACK_MONTHS = 12;
const LOAD_BACK_BATCH = 12;

const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 60 };

function buildMonthRun(from: MonthKey, count: number): MonthKey[] {
  return Array.from({ length: count }, (_, i) => addMonth(from.year, from.month, i));
}

function monthKey(m: MonthKey): string {
  return `${m.year}-${m.month}`;
}

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
  const insets = useSafeAreaInsets();
  const settings = useSettingsStore((s) => s.settings);
  const system = settings.calendar_system ?? 'AD';
  const periods = useCycleStore((s) => s.periods);
  const prediction = useCycleStore((s) => s.prediction);
  const ready = useCycleStore((s) => s.ready);
  const refresh = useCycleStore((s) => s.refresh);
  const saveLog = useCycleStore((s) => s.saveLog);
  const p = prediction ?? EMPTY_PREDICTION;

  const [today, setToday] = useState(() => todayIso());
  const current = useMemo(() => currentMonthFor(system, today), [system, today]);

  // The list always opens `INITIAL_BACK_MONTHS` before `current`, so `current`'s index in a
  // freshly (re)built array is always `INITIAL_BACK_MONTHS` — used for `initialScrollIndex`.
  const [monthList, setMonthList] = useState<MonthKey[]>(() => {
    const start = addMonth(current.year, current.month, -INITIAL_BACK_MONTHS);
    return buildMonthRun(start, INITIAL_BACK_MONTHS + FORWARD_CAP_MONTHS + 1);
  });

  // §6.3 — switching AD ↔ BS re-derives the opening month; it never tries to translate the
  // scrolled-to position between systems. Deliberately keyed on `system` alone (not `today`,
  // not `current`) — the list must NOT jump back to the current month on a midnight rollover
  // while the user has scrolled elsewhere. The `FlatList` below is remounted (`key={system}`)
  // in step with this so `initialScrollIndex` re-applies to the fresh array.
  useEffect(() => {
    const start = addMonth(current.year, current.month, -INITIAL_BACK_MONTHS);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMonthList(buildMonthRun(start, INITIAL_BACK_MONTHS + FORWARD_CAP_MONTHS + 1));
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

  const fetchMonthLogs = useCallback(async (start: string, end: string) => {
    const rows = await dailyLogs.getRange(start, end);
    return Object.fromEntries(rows.map((r) => [r.date, r]));
  }, []);

  // Bumped on focus, and after a save, so every currently-mounted `MonthListItem` refetches —
  // bounded in cost by the `FlatList`'s own virtualization. `periods`/`prediction` already
  // refresh on focus via the cycle store; this token is what makes each month's own `logs` map
  // do the same, since a day logged elsewhere (Home) doesn't otherwise change any month's range.
  const [reloadToken, setReloadToken] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setReloadToken((t) => t + 1);
    }, []),
  );

  const [selected, setSelected] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<dailyLogs.LogRow | null>(null);

  // The day sheet needs exactly one row, independent of which months happen to be mounted —
  // fetched directly rather than read out of a `MonthListItem`'s own (unmounted-if-scrolled-
  // away) `logs` map.
  useEffect(() => {
    let cancelled = false;
    if (!selected) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedLog(null);
      return;
    }
    void dailyLogs.getByDate(selected).then((row) => {
      if (!cancelled) setSelectedLog(row);
    });
    return () => {
      cancelled = true;
    };
  }, [selected, reloadToken]);

  // Which months are currently on screen, for the "Today" title action below.
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(() => new Set());
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      setVisibleKeys(new Set(viewableItems.map((v) => String(v.key))));
    },
    [],
  );

  const flatListRef = useRef<FlatList<MonthKey>>(null);

  const scrollToToday = useCallback(() => {
    const idx = monthList.findIndex((m) => m.year === current.year && m.month === current.month);
    if (idx >= 0) flatListRef.current?.scrollToIndex({ index: idx, animated: true });
  }, [monthList, current]);

  // Unbounded backward scroll: prepend another batch of older months. Forward is not
  // paginated — the array already runs through the `FORWARD_CAP_MONTHS` cap from the start.
  const loadMoreBack = useCallback(() => {
    setMonthList((list) => {
      if (list.length === 0) return list;
      const first = list[0];
      const older = buildMonthRun(
        addMonth(first.year, first.month, -LOAD_BACK_BATCH),
        LOAD_BACK_BATCH,
      );
      return [...older, ...list];
    });
  }, []);

  const onScrollToIndexFailed = useCallback(
    (info: { index: number; averageItemLength: number }) => {
      flatListRef.current?.scrollToOffset({
        offset: info.averageItemLength * info.index,
        animated: false,
      });
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: info.index, animated: false });
      }, 50);
    },
    [],
  );

  // Stable identity so `MonthGrid` can memoize its per-cell press handlers instead of
  // rebuilding them on every unrelated re-render.
  const handlePress = useCallback((dateIso: string) => setSelected(dateIso), []);

  const handleSelectFlow = async (flow: FlowLevel) => {
    if (!selected) return;
    await saveLog(
      selected,
      flow,
      selectedLog?.moods ?? [],
      selectedLog?.symptoms ?? [],
      selectedLog?.note ?? null,
      today,
    );
    setReloadToken((t) => t + 1);
  };

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<MonthKey>) => (
      <MonthListItem
        year={item.year}
        month={item.month}
        system={system}
        today={today}
        periods={periods}
        prediction={p}
        selected={selected}
        reloadToken={reloadToken}
        onPressDay={handlePress}
        fetchMonthLogs={fetchMonthLogs}
      />
    ),
    [system, today, periods, p, selected, reloadToken, handlePress, fetchMonthLogs],
  );

  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  const showTodayButton = !visibleKeys.has(monthKey(current));

  return (
    <Screen
      title={en.calendar}
      scroll={false}
      titleAction={
        showTodayButton ? (
          <Pressable
            accessibilityRole="button"
            onPress={scrollToToday}
            style={{ minHeight: MIN_TOUCH_TARGET, justifyContent: 'center' }}
          >
            <Text style={{ ...typography.body, color: colors.primary }}>{en.calendarToday}</Text>
          </Pressable>
        ) : null
      }
    >
      <FlatList
        key={system}
        ref={flatListRef}
        data={monthList}
        keyExtractor={monthKey}
        renderItem={renderItem}
        initialScrollIndex={INITIAL_BACK_MONTHS}
        onScrollToIndexFailed={onScrollToIndexFailed}
        onStartReached={loadMoreBack}
        onStartReachedThreshold={2}
        maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={VIEWABILITY_CONFIG}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl, gap: spacing.xl }}
      />

      <DaySheet
        dateIso={selected}
        today={today}
        system={system}
        periods={periods}
        prediction={p}
        log={selectedLog}
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
