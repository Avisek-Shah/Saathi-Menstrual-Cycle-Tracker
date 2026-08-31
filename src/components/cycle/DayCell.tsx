import { parseISO } from 'date-fns';
import { Pressable, Text, View } from 'react-native';

import type { DayCellState } from '../../core/home';
import { colors } from '../../theme/colors';
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
}

export function DayCell({
  dateIso,
  state,
  isToday,
  onPress,
  disabled = false,
  label,
  faded = false,
  hideWeekday = false,
  isSelected = false,
}: DayCellProps) {
  const d = parseISO(dateIso);
  const fill = fillFor(state);
  // Solid-filled states get white text — a filled circle reads as "this happened / is
  // estimated firmly", vs. the pale wash used for a merely predicted or fertile day.
  const onSolid = state === 'loggedPeriod' || state === 'ovulation';

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
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: isSelected ? 2 : 0,
          borderColor: colors.primary,
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
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
          <Text style={{ ...typography.body, color: onSolid ? colors.surface : colors.text }}>
            {label ?? d.getDate()}
          </Text>
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
}

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
