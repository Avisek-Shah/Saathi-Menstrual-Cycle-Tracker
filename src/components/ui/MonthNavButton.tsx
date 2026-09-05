import { Pressable, Text } from 'react-native';

import { colors } from '../../theme/colors';
import { elevation } from '../../theme/elevation';
import { MIN_TOUCH_TARGET, radius } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface MonthNavButtonProps {
  glyph: string;
  accessibilityLabel: string;
  onPress: () => void;
  disabled?: boolean;
}

const BUTTON_SIZE = 40;

/**
 * A visibly-a-button month-navigation control: a filled circle with a border and a subtle
 * shadow, not a bare glyph floating on the background. Used by the calendar tab and the
 * onboarding/profile date picker so month navigation looks the same everywhere.
 */
export function MonthNavButton({
  glyph,
  accessibilityLabel,
  onPress,
  disabled = false,
}: MonthNavButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({
        width: Math.max(BUTTON_SIZE, MIN_TOUCH_TARGET - 4),
        height: Math.max(BUTTON_SIZE, MIN_TOUCH_TARGET - 4),
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        opacity: disabled ? 0.35 : pressed ? 0.7 : 1,
        ...elevation.card,
      })}
    >
      <Text
        style={{
          ...typography.title,
          color: colors.primary,
          lineHeight: typography.title.fontSize,
        }}
      >
        {glyph}
      </Text>
    </Pressable>
  );
}
