import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, View, Text, Pressable } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { formatDate, getMonthGrid, addMonth } from '../../core/calendar';
import { dayCellState } from '../../core/home';
import { en } from '../../i18n/en';
import { todayIso } from '../../services/clock';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { useCycleStore } from '../../stores/useCycleStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { MonthGrid } from '../../components/cycle/MonthGrid';
import * as dailyLogs from '../../db/repositories/dailyLogs';
import type { Prediction } from '../../core/prediction';
import { AppState } from 'react-native';

export default function CalendarScreen() {
  const settings = useSettingsStore((s) => s.settings);
  const system = settings.calendar_system ?? 'AD';
  const { periods, prediction, ready, refresh } = useCycleStore();

  const [today, setToday] = useState(todayIso());
  // Active month (system-native). Swiping updates these directly.
  const [year, setYear] = useState(() => system === 'BS' ? 2083 : 2026); // SPEC: initial shown month; not critical
  const [month, setMonth] = useState(() => system === 'BS' ? 5 : 8); // Bhadra 2083 / Aug 2026
  const [logs, setLogs] = useState<Record<string, import('../../db/repositories/dailyLogs').LogRow>>({});
  const [selected, setSelected] = useState<string | null>(null);

  // Refresh on focus / foreground / midnight rollover (same pattern as Home).
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

  // Cap navigation at current + 3 (§6.3).
  const current = system === 'BS'
    ? (() => {
        const { parseISO } = require('date-fns');
        const d = parseISO(today);
        // BS current from today — simplified; real conversion via calendar core would happen here.
        // For M5 we rely on store + core; this is a display placeholder.
        return { year: 2083, month: 5 };
      })()
    : (() => {
        const d = new Date(today + 'T12:00:00');
        return { year: d.getFullYear(), month: d.getMonth() + 1 };
      })();

  const canNext = (() => {
    const end = addMonth(current.year, current.month, 3);
    return year < end.year || (year === end.year && month < end.month);
  })();

  const canPrev = true; // always can go back

  // Load logs for visible month (system ranges differ; approximate for M5 — full getRange to start/end).
  const grid = useMemo(() => getMonthGrid(year, month, system, today), [year, month, system, today]);
  const rangeStart = grid.cells[0].iso;
  const rangeEnd = grid.cells[grid.cells.length - 1].iso;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await dailyLogs.getRange(rangeStart, rangeEnd);
      if (!cancelled) setLogs(Object.fromEntries(rows.map((r) => [r.date, r])));
    })();
    return () => { cancelled = true; };
  }, [rangeStart, rangeEnd]);

  // Selected-day display (future = prediction detail; past/present = open log).
  const handlePress = (dateIso: string) => {
    if (dateIso > today) {
      setSelected(dateIso); // show prediction detail instead of log modal
    } else {
      // Log modal route — deferred to /log/[date] (existing). For M5, just highlight.
      setSelected(dateIso);
    }
  };

  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  // Prediction for detail line.
  const p = prediction || { ovulationDate: '', fertileStart: '', fertileEnd: '', nextPeriodStart: '', nextPeriodEnd: '' } as Prediction;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
      {/* Month header + swipe controls */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md }}>
        <Pressable onPress={() => { if (canPrev) { const n = addMonth(year, month, -1); setYear(n.year); setMonth(n.month); } }} disabled={!canPrev}>
          <Text style={{ ...typography.body, color: canPrev ? colors.text : colors.textMuted }}>{en.calendarPrevMonth}</Text>
        </Pressable>
        <Text style={{ ...typography.title, color: colors.text }}>{grid.title}</Text>
        <Pressable onPress={() => { if (canNext) { const n = addMonth(year, month, 1); setYear(n.year); setMonth(n.month); } }} disabled={!canNext}>
          <Text style={{ ...typography.body, color: canNext ? colors.text : colors.textMuted }}>{en.calendarNextMonth}</Text>
        </Pressable>
      </View>

      {/* Subtitle */}
      {grid.subtitle ? (
        <Text style={{ ...typography.caption, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.xs }}>
          {grid.subtitle}
        </Text>
      ) : null}

      <MonthGrid
        grid={grid}
        today={today}
        periods={periods}
        prediction={p}
        monthLogs={logs}
        system={system}
        onPressDay={handlePress}
      />

      {/* Selected detail (future prediction, not log modal — §6.3) */}
      {selected && selected > today && (
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.md, gap: spacing.sm, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ ...typography.cardTitle, color: colors.text }}>{formatDate(selected, system)}</Text>
          <Text style={{ ...typography.body, color: colors.text }}>
            {p.ovulationDate === selected ? en.futureOvulation :
             (selected >= p.fertileStart && selected <= p.fertileEnd) ? en.futureFertile :
             (selected >= p.nextPeriodStart && selected <= p.nextPeriodEnd) ? en.futurePredictedPeriod :
             en.futureNothing}
          </Text>
          <Pressable onPress={() => setSelected(null)} style={{ alignSelf: 'flex-start', padding: spacing.xs }}>
            <Text style={{ ...typography.caption, color: colors.textMuted }}>{en.close}</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}
