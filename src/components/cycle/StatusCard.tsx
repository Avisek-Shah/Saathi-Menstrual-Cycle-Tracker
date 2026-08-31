import { Text, View } from 'react-native';

import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface StatusCardProps {
  /** The big line: "Period in 6 days" / "Day 3 of your period" / "2 days later than expected". */
  headline: string;
  /** The predicted date or range beneath, already formatted per calendar_system. */
  dateLine: string;
  cycleDayLabel: string;
  /** §6.2 — only shown when confidence is low; null otherwise. */
  confidenceLabel: string | null;
}

export function StatusCard({ headline, dateLine, cycleDayLabel, confidenceLabel }: StatusCardProps) {
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: colors.border,
        paddingVertical: spacing.xl,
        paddingHorizontal: spacing.lg,
        gap: spacing.sm,
      }}
    >
      <Text style={{ ...typography.hero, color: colors.primary }}>{headline}</Text>
      <Text style={{ ...typography.body, color: colors.textMuted }}>{dateLine}</Text>
      <Text style={{ ...typography.caption, color: colors.textMuted }}>{cycleDayLabel}</Text>
      {confidenceLabel ? (
        <View
          style={{
            alignSelf: 'flex-start',
            marginTop: spacing.xs,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.xs,
            borderRadius: radius.pill,
            backgroundColor: colors.bg,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ ...typography.caption, color: colors.textMuted }}>{confidenceLabel}</Text>
        </View>
      ) : null}
    </View>
  );
}
