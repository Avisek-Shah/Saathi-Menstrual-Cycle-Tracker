import { Text, View } from 'react-native';

import { colors } from '../../theme/colors';
import { elevation } from '../../theme/elevation';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface MiniStatCardProps {
  label: string;
  value: string;
}

/** Compact label/value tile — three sit in a row under the Home cycle ring (Cycle day, Next
 * period, Ovulation). Reuses the same surface/border/elevation language as `Card`. */
export function MiniStatCard({ label, value }: MiniStatCardProps) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: colors.border,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.sm,
        gap: spacing.xs / 2,
        alignItems: 'center',
        ...elevation.card,
      }}
    >
      <Text
        style={{ ...typography.caption, color: colors.textMuted }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {label}
      </Text>
      <Text
        style={{ ...typography.cardTitle, color: colors.text, textAlign: 'center' }}
        numberOfLines={2}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
    </View>
  );
}
