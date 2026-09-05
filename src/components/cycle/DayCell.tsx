import { parseISO } from 'date-fns';
import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { DayCellState } from '../../core/home';
import { colors } from '../../theme/colors';
import { MIN_TOUCH_TARGET } from '../../theme/spacing';
import { typography } from '../../theme/typography';

const WEEKDAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface DayCellProps {
  dateIso: string;
  state: DayCellState;
  isToday: boolean;
  onPress?: () => void;
  disabled?: boolean;
  /**
   * Number shown in the circle. Defaults to the Gregorian day-of-month. The calendar grid
   * passes the BS day-of-month in BS mode (§9 — the grid re-grids, it does not relabel).
   */
  label?: number;
  /** Dimmed: a neighbouring month's day filling the corner of a month grid. */
  faded?: boolean;
  /** Hides the weekday letter above the circle — the month grid has its own header row. */
  hideWeekday?: boolean;
  /** §6.3 — the day sheet's open date. Its own outer ring, distinct from today's inner ring. */
  isSelected?: boolean;
  /**
   * Outer circle diameter. Defaults to the §11.4 minimum touch target. The month grid passes a
   * measured value so seven columns always fit the screen width — see `MonthGrid`.
   */
  size?: number;
}

// Memoized: `MonthGrid` renders 42 of these and re-renders whenever unrelated store state
// changes (§6.3). Only pays off because `MonthGrid` also hands each cell a stable `onPress`
// (see `pressHandlers` there) — an inline closure would defeat the shallow prop comparison.
export const DayCell = memo(function DayCell({
  dateIso,
  state,
  isToday,
  onPress,
  disabled = false,
  label,
  faded = false,
  hideWeekday = false,
  isSelected = false,
  size = MIN_TOUCH_TARGET,
}: DayCellProps) {
  const inner = size - 4;
  const d = parseISO(dateIso);
  const fill = fillFor(state);
  // Solid-filled and darkened-muted states get light text — white on primary/ovulationFill/primaryMuted,
  // dark text on the pale wash (fertile) and empty cells.
  const textColor =
    state === 'loggedPeriod' || state === 'ovulation'
      ? colors.surface
      : state === 'predictedPeriod'
        ? colors.onPrimaryMuted
        : colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={dateIso}
      accessibilityState={{ disabled: disabled || !onPress, selected: isSelected }}
      disabled={disabled || !onPress}
      onPress={onPress}
      style={{ alignItems: 'center', gap: 4, opacity: disabled || faded ? 0.35 : 1 }}
    >
      {hideWeekday ? null : (
        <Text style={{ ...typography.caption, color: colors.textMuted }}>
          {WEEKDAY[d.getDay()]}
        </Text>
      )}
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: isSelected ? 2 : 0,
          borderColor: colors.primary,
        }}
      >
        <View
          style={{
            width: inner,
            height: inner,
            borderRadius: inner / 2,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: fill,
            // §11.2 — the ovulation day now carries its own solid colour (see `fillFor`), so
            // it no longer needs a ring to stand apart from the fertile wash; only "today"
            // still uses this ring.
            borderWidth: isToday ? 2 : 0,
            borderColor: colors.text,
          }}
        >
          <Text style={{ ...typography.body, color: textColor }}>{label ?? d.getDate()}</Text>
        </View>
      </View>
      <View
        style={{
          width: 5,
          height: 5,
          borderRadius: 3,
          backgroundColor: state === 'loggedNoFlow' ? colors.textMuted : 'transparent',
        }}
      />
    </Pressable>
  );
});

// §11.2 — colour is never the only signal; each state also carries a ring or a dot. Solid
// fills (`loggedPeriod`, `ovulation`) additionally carry white text (see `onSolid` above).
function fillFor(state: DayCellState): string {
  switch (state) {
    case 'loggedPeriod':
      return colors.primary;
    case 'predictedPeriod':
      return colors.primaryMuted;
    case 'fertile':
      return colors.fertileMuted;
    case 'ovulation':
      return colors.ovulationFill;
    default:
      return colors.surface;
  }
}
