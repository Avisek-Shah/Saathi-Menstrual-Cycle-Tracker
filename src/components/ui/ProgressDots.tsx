import { View } from 'react-native';

import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

interface ProgressDotsProps {
  count: number;
  activeIndex: number;
}

export function ProgressDots({ count, activeIndex }: ProgressDotsProps) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: count, now: activeIndex + 1 }}
      style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}
    >
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={{
            width: i === activeIndex ? 20 : 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: i === activeIndex ? colors.primary : colors.border,
          }}
        />
      ))}
    </View>
  );
}
