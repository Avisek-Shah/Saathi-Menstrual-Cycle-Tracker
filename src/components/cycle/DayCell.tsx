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
}

// §11.2 — colour is never the only signal; each state also carries a ring or a dot.
function fillFor(state: DayCellState): string {
  switch (state) {
    case 'loggedPeriod':
      return colors.primary;
    case 'predictedPeriod':
      return colors.primaryMuted;
    case 'fertile':
    case 'ovulation':
      return colors.fertileMuted;
    default:
      return colors.surface;
  }
}

export function DayCell({ dateIso, state, isToday, onPress, disabled = false }: DayCellProps) {
  const d = parseISO(dateIso);
  const fill = fillFor(state);
  const onPrimary = state === 'loggedPeriod';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={dateIso}
      disabled={disabled || !onPress}
      onPress={onPress}
      style={{ alignItems: 'center', gap: 4, opacity: disabled ? 0.35 : 1 }}
    >
      <Text style={{ ...typography.caption, color: colors.textMuted }}>
        {WEEKDAY[d.getDay()]}
      </Text>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: fill,
          borderWidth: isToday ? 2 : state === 'ovulation' ? 2 : 0,
          borderColor: isToday ? colors.text : colors.ovulation,
        }}
      >
        <Text
          style={{ ...typography.body, color: onPrimary ? colors.surface : colors.text }}
        >
          {d.getDate()}
        </Text>
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
