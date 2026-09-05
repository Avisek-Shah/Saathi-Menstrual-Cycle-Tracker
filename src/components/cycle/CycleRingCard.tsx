import { Text, View } from 'react-native';

import type { RingDay } from '../../core/home';
import { colors } from '../../theme/colors';
import { elevation } from '../../theme/elevation';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { CycleRing } from '../charts/CycleRing';

interface CycleRingCardProps {
  days: RingDay[];
  /** The big line: "Period in 6 days" / "Day 3 of your period" / "2 days later than expected". */
  headline: string;
  /** The predicted date or range beneath, already formatted per calendar_system. */
  dateLine: string;
  /** §6.2 — only shown when confidence is low; null otherwise. */
  confidenceLabel: string | null;
}

/** Home hero: the SVG cycle-day ring (BUILD_PLAN §"visual polish") with the same headline
 * copy the old `StatusCard` showed, now centred inside it instead of stacked above it. */
export function CycleRingCard({ days, headline, dateLine, confidenceLabel }: CycleRingCardProps) {
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: colors.border,
        paddingVertical: spacing.xl,
        alignItems: 'center',
        gap: spacing.md,
        ...elevation.raised,
      }}
    >
      <CycleRing days={days}>
        <Text
          style={{ ...typography.hero, color: colors.primary, textAlign: 'center' }}
          numberOfLines={2}
          adjustsFontSizeToFit
        >
          {headline}
        </Text>
        <Text
          style={{
            ...typography.caption,
            color: colors.textMuted,
            textAlign: 'center',
            marginTop: spacing.xs,
          }}
          numberOfLines={2}
        >
          {dateLine}
        </Text>
      </CycleRing>

      {confidenceLabel ? (
        <View
          style={{
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
