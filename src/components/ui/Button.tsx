import { Pressable, Text } from 'react-native';

import { colors } from '../../theme/colors';
import { MIN_TOUCH_TARGET, radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
  disabled?: boolean;
  accessibilityLabel?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  accessibilityLabel,
}: ButtonProps) {
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: MIN_TOUCH_TARGET,
        paddingHorizontal: spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.control,
        backgroundColor: isPrimary ? colors.primary : 'transparent',
        opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
      })}
    >
      <Text
        numberOfLines={1}
        style={{
          ...typography.cardTitle,
          color: isPrimary ? colors.surface : colors.textMuted,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
