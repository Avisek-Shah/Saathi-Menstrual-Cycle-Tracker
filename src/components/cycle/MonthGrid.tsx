import { View, Text, Pressable } from 'react-native';
import type { MonthGrid, MonthCell } from '../../core/calendar';
import { formatDate } from '../../core/calendar';
import { dayCellState } from '../../core/home';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import type { Period } from '../../core/periods';
import type { Prediction } from '../../core/prediction';
import type { LogRow } from '../../db/repositories/dailyLogs';
import { DayCell } from './DayCell';
import NepaliDate, { dateConfigMap } from 'nepali-date-converter';

interface MonthGridProps {
  grid: MonthGrid;
  today: string;
  periods: Period[];
  prediction: Prediction;
  monthLogs: Record<string, LogRow>;
  system: 'AD' | 'BS';
  onPressDay: (dateIso: string) => void;
}

const WEEKHEAD = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function MonthGrid({
  grid, today, periods, prediction, monthLogs, system, onPressDay,
}: MonthGridProps) {
  return (
    <View>
      {/* Title + subtitle (§6.3: BS name + AD range in BS mode; AD title + empty subtitle in AD) */}
      <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.sm, gap: 2 }}>
        <Text style={{ ...typography.title, color: colors.text }}>{grid.title}</Text>
        {grid.subtitle ? (
          <Text style={{ ...typography.caption, color: colors.textMuted }}>{grid.subtitle}</Text>
        ) : null}
      </View>

      {/* Week-day letters (matches DayCell's hidden legend when hideWeekday=true) */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingVertical: spacing.xs }}>
        {WEEKHEAD.map((l, idx) => (
          <Text key={l + idx} style={{ ...typography.caption, color: colors.textMuted, width: 36, textAlign: 'center' }}>{l}</Text>
        ))}
      </View>

      {/* 42-cell grid, 7 columns, 6 rows */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.md }}>
        {grid.cells.map((cell) => {
          const isToday = cell.iso === today;
          const isFuture = cell.iso > today;
          const log = monthLogs[cell.iso] ?? null;
          const state = dayCellState({
            dateIso: cell.iso,
            loggedFlow: log?.flow ?? null,
            hasLogRow: log !== null,
            periods,
            prediction,
          });
          // BS day number: convert AD cell to BS. For fill cells this gives the BS number of the
          // neighbouring-date, which is correct (§9 — grid is BS, so the corner label must be BS).
          const bsLabel = (() => {
            if (system !== 'BS') return undefined;
            const bs = NepaliDate.fromAD(new Date(cell.iso + 'T12:00:00')).getBS();
            return bs.date; // the BS day-of-month for this AD date
          })();
          return (
            <Pressable
              key={cell.iso}
              onPress={isFuture ? undefined : () => onPressDay(cell.iso)}
              disabled={isFuture}
              style={{ width: 36, height: 56, alignItems: 'center', justifyContent: 'flex-start', opacity: isFuture ? 0.4 : 1 }}
            >
              <DayCell
                dateIso={cell.iso}
                state={state}
                isToday={isToday}
                disabled={isFuture}
                onPress={isFuture ? undefined : () => onPressDay(cell.iso)}
                label={bsLabel}
                faded={cell.fill}
                hideWeekday
              />
            </Pressable>
          );
        })}
      </View>

      {/* Legend (§6.3 — colour + shape/dot, never colour alone — matches §11.2) */}
      <LegendRow />
    </View>
  );
}

function LegendRow() {
  const items = [
    { label: 'Period', color: colors.primary },
    { label: 'Predicted', color: colors.primaryMuted },
    { label: 'Fertile', color: colors.fertileMuted },
    { label: 'Ovulation', color: colors.fertileMuted, ring: true },
    { label: 'Log (no flow)', color: colors.surface, dot: true },
  ];
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, padding: spacing.md, paddingTop: spacing.xs }}>
      {items.map((it) => (
        <View key={it.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: it.color, borderWidth: it.ring ? 1.5 : 0, borderColor: colors.ovulation }} />
          {it.dot ? <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.textMuted }} /> : null}
          <Text style={{ ...typography.caption, color: colors.textMuted }}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
}
