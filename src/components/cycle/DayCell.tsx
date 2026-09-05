import { parseISO } from 'date-fns';
import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { DayCellState } from '../../core/home';
import type { Palette } from '../../theme/colors';
import { useColors } from '../../theme/useColors';
import { MIN_TOUCH_TARGET } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { StateGlyph } from '../ui/StateGlyph';

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
  /** §6.3 — the day sheet's open date. Its own outer ring, distinct from today's. */
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
  const c = useColors();
  const inner = size - 4;
  const d = parseISO(dateIso);
  const fill = fillFor(state, c);
  const onSolid = state === 'loggedPeriod' || state === 'ovulation';
  // White on the two solid fills; dark on the pale predicted wash, the fertile wash, and
  // empty cells. §2.8 — the number is a second signal, so it never relies on colour alone.
  const textColor = onSolid ? c.surface : c.text;
  const isPredicted = state === 'predictedPeriod';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={dateIso}
      accessibilityState={{ disabled: disabled || !onPress, selected: isSelected }}
      disabled={disabled || !onPress}
      onPress={onPress}
      style={{ alignItems: 'center', gap: 3, opacity: disabled || faded ? 0.35 : 1 }}
    >
      {hideWeekday ? null : (
        <Text style={{ ...typography.caption, color: c.textMuted }}>{WEEKDAY[d.getDay()]}</Text>
      )}
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          // Outer ring = today or the day-sheet selection. Today wins the colour if both.
          borderWidth: isToday || isSelected ? 2 : 0,
          borderColor: isToday ? c.todayMarker : c.primary,
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
            // §2.8 texture grammar — predicted period always carries a dashed border, so it
            // is distinct from a logged period even in the colour-blind scheme.
            borderWidth: isPredicted ? 2 : 0,
            borderColor: c.periodPredictedBorder,
            borderStyle: isPredicted ? 'dashed' : 'solid',
          }}
        >
          <Text
            style={{ ...typography.body, fontWeight: onSolid ? '600' : '400', color: textColor }}
          >
            {label ?? d.getDate()}
          </Text>
        </View>
      </View>
      {/* Glyph slot — the second signal (§2.8). Height reserved so the row never jumps. */}
      <View style={{ height: 10, alignItems: 'center', justifyContent: 'center' }}>
        <StateGlyph state={state} color={glyphColor(state, c)} size={10} />
      </View>
    </Pressable>
  );
});

function fillFor(state: DayCellState, c: Palette): string {
  switch (state) {
    case 'loggedPeriod':
      return c.periodLogged;
    case 'predictedPeriod':
      return c.periodPredicted;
    case 'fertile':
      return c.fertile;
    case 'ovulation':
      return c.ovulation;
    default:
      return c.surface;
  }
}

function glyphColor(state: DayCellState, c: Palette): string {
  switch (state) {
    case 'loggedPeriod':
    case 'predictedPeriod':
      return c.periodLogged;
    case 'ovulation':
      return c.ovulation;
    case 'loggedNoFlow':
      return c.textMuted;
    default:
      return 'transparent';
  }
}
