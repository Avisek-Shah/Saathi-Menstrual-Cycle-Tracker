import { useMemo, useState } from 'react';
import { View, Text, type LayoutChangeEvent } from 'react-native';
import type { MonthGrid, MonthCell } from '../../core/calendar';
import { formatDate } from '../../core/calendar';
import { dayCellState } from '../../core/home';
import { colors } from '../../theme/colors';
import { useColors } from '../../theme/useColors';
import { en } from '../../i18n/en';
import { typography } from '../../theme/typography';
import { MIN_TOUCH_TARGET, spacing } from '../../theme/spacing';
import type { Period } from '../../core/periods';
import type { Prediction } from '../../core/prediction';
import type { LogRow } from '../../db/repositories/dailyLogs';
import { DayCell } from './DayCell';

interface MonthGridProps {
  grid: MonthGrid;
  today: string;
  periods: Period[];
  prediction: Prediction;
  monthLogs: Record<string, LogRow>;
  system: 'AD' | 'BS';
  /** The day sheet's open date, if any — rendered with its own ring, distinct from today's. */
  selected?: string | null;
  onPressDay: (dateIso: string) => void;
}

const WEEKHEAD = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** §6.3 — the grid is always 7 columns × 6 rows. */
const COLUMNS = 7;
const ROWS = 6;

/**
 * Split the flat 42-cell list into 6 rows of 7. The grid used to rely on `flexWrap`, which
 * wraps on *measured* width: at 44px per cell, a 393pt screen fits eight cells per line, so
 * every row was shifted and the weekday columns no longer matched the header. Chunking makes
 * the 7-column layout structural instead of a consequence of the cell width.
 */
function chunkRows(cells: MonthCell[]): MonthCell[][] {
  const rows: MonthCell[][] = [];
  for (let r = 0; r < ROWS; r++) rows.push(cells.slice(r * COLUMNS, r * COLUMNS + COLUMNS));
  return rows;
}

export function MonthGrid({
  grid,
  today,
  periods,
  prediction,
  monthLogs,
  system,
  selected = null,
  onPressDay,
}: MonthGridProps) {
  // The columns lay themselves out with `flex: 1`, so they always divide the container into
  // exactly seven regardless of the padding `Screen` puts around us. Only the circle needs a
  // number, so the container is measured rather than derived from the window width — deriving
  // it was the bug: it ignored `Screen`'s own horizontal padding and overflowed to the right.
  const [rowWidth, setRowWidth] = useState(0);
  const onRowLayout = (e: LayoutChangeEvent) => setRowWidth(e.nativeEvent.layout.width);
  // SPEC: 2026-09-04 — below ~308pt of usable width seven 44px targets cannot fit at all, so
  // the circle shrinks. Clipping the last column would be the worse failure. Before the first
  // layout pass there is nothing to measure; the §11.4 target is the right guess.
  const cellSize =
    rowWidth > 0
      ? Math.max(1, Math.min(MIN_TOUCH_TARGET, Math.floor(rowWidth / COLUMNS) - 2))
      : MIN_TOUCH_TARGET;

  // One bound press handler per cell, rebuilt only when the grid itself or `onPressDay`
  // changes — not on every render. Without this, `<DayCell onPress={() => onPressDay(iso)}>`
  // would hand each cell a fresh closure every render and `React.memo(DayCell)` would never
  // see equal props, so memoizing it would buy nothing.
  const pressHandlers = useMemo(() => {
    const map = new Map<string, () => void>();
    for (const cell of grid.cells) map.set(cell.iso, () => onPressDay(cell.iso));
    return map;
  }, [grid, onPressDay]);

  return (
    <View>
      {/* Title + subtitle (§6.3: BS name + AD range in BS mode; AD title + empty subtitle in AD) */}
      <View style={{ paddingBottom: spacing.sm, gap: 2 }}>
        <Text style={{ ...typography.title, color: colors.text }}>{grid.title}</Text>
        {grid.subtitle ? (
          <Text style={{ ...typography.caption, color: colors.textMuted }}>{grid.subtitle}</Text>
        ) : null}
      </View>

      {/* Week-day letters (matches DayCell's hidden legend when hideWeekday=true) */}
      <View style={{ flexDirection: 'row', paddingVertical: spacing.xs }}>
        {WEEKHEAD.map((l, idx) => (
          <Text
            key={l + idx}
            style={{ ...typography.caption, color: colors.textMuted, flex: 1, textAlign: 'center' }}
          >
            {l}
          </Text>
        ))}
      </View>

      {/* 42-cell grid, 7 columns, 6 rows */}
      <View onLayout={onRowLayout}>
        {chunkRows(grid.cells).map((row) => (
          <View key={row[0].iso} style={{ flexDirection: 'row' }}>
            {row.map((cell) => {
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
              // `getMonthGrid` already converted every cell (fill cells included) to its BS
              // day-of-month when building a BS grid, so `cell.day` is already the right label
              // — no need to re-run the AD→BS conversion here.
              const bsLabel = system === 'BS' ? cell.day : undefined;
              // §6.3.1 — a future date is still tappable; the day sheet just renders it
              // read-only. It is dimmed here for the same reason `faded` dims a fill cell: it
              // reads as "not the current focus", not as disabled.
              // A plain View, not a Pressable: `DayCell` below is the single interactive
              // element (it owns accessibilityRole/Label/State) — wrapping it in a second
              // Pressable doubled up the button role and the outer one carried no label.
              return (
                <View
                  key={cell.iso}
                  style={{
                    flex: 1,
                    paddingVertical: spacing.xs,
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    opacity: isFuture ? 0.4 : 1,
                  }}
                >
                  <DayCell
                    dateIso={cell.iso}
                    state={state}
                    isToday={isToday}
                    isSelected={cell.iso === selected}
                    onPress={pressHandlers.get(cell.iso)}
                    label={bsLabel}
                    faded={cell.fill}
                    hideWeekday
                    size={cellSize}
                  />
                </View>
              );
            })}
          </View>
        ))}
      </View>

      {/* Legend (§6.3 — colour + shape/dot, never colour alone — matches §11.2) */}
      <LegendRow />
    </View>
  );
}

// §12 rule 6 — labels come from `en`, not literals. Colour + a shape/dot, never colour alone
// (§2.8). Built from `useColors()` so the colour-blind scheme reaches the swatches too.
// Reworked to three entries in sub-step 1e.
function LegendRow() {
  const c = useColors();
  const items = [
    { label: en.legendPeriod, color: c.periodLogged },
    { label: en.legendPredicted, color: c.periodPredicted },
    { label: en.legendFertile, color: c.fertile },
    { label: en.legendOvulation, color: c.ovulation },
    { label: en.legendLogged, color: c.surface, dot: true },
  ];
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        paddingVertical: spacing.md,
        paddingTop: spacing.sm,
      }}
    >
      {items.map((it) => (
        <View key={it.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: it.color,
              borderWidth: it.color === c.surface ? 1 : 0,
              borderColor: c.border,
            }}
          />
          {it.dot ? (
            <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: c.textMuted }} />
          ) : null}
          <Text style={{ ...typography.caption, color: c.textMuted }}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
}
