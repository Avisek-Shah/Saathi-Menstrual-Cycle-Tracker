import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';

import { colors } from '../../theme/colors';
import { elevation } from '../../theme/elevation';
import { radius, spacing } from '../../theme/spacing';

interface CardProps {
  children: ReactNode;
  /** Dimmed presentation — used for the fertile card when cycles are irregular (§5.6). */
  muted?: boolean;
  style?: ViewStyle;
}

export function Card({ children, muted = false, style }: CardProps) {
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.lg,
        opacity: muted ? 0.6 : 1,
        ...elevation.card,
        ...style,
      }}
    >
      {children}
    </View>
  );
}
