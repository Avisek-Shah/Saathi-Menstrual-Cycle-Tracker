import { useMemo } from 'react';
import { Pressable, ScrollView, Text } from 'react-native';

import { colors } from '../../theme/colors';
import { MIN_TOUCH_TARGET, radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface NumberPickerProps {
  min: number;
  max: number;
  value: number;
  onChange: (next: number) => void;
  /** Screen-reader name for the whole control, e.g. "Typical cycle length in days". */
  accessibilityLabel: string;
}

/**
 * Horizontal scroller of whole numbers `min…max`. Custom-built because §2 lists no picker
 * library. Selection is a tap; the selected value is filled with the accent colour.
 */
export function NumberPicker({ min, max, value, onChange, accessibilityLabel }: NumberPickerProps) {
  const values = useMemo(
    () => Array.from({ length: max - min + 1 }, (_, i) => min + i),
    [min, max],
  );

  return (
    <ScrollView
      horizontal
      accessibilityLabel={accessibilityLabel}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.xs }}
    >
      {values.map((n) => {
        const selected = n === value;
        return (
          <Pressable
            key={n}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(n)}
            style={{
              minWidth: MIN_TOUCH_TARGET,
              minHeight: MIN_TOUCH_TARGET,
              paddingHorizontal: spacing.sm,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.control,
              borderWidth: selected ? 0 : 1,
              borderColor: colors.border,
              backgroundColor: selected ? colors.primary : colors.surface,
            }}
          >
            <Text
              style={{
                ...typography.cardTitle,
                color: selected ? colors.surface : colors.text,
              }}
            >
              {n}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
