import { Pressable, Text, View } from 'react-native';

import { en } from '../../i18n/en';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Card } from '../ui/Card';

interface RecalcCardProps {
  onRecalculate: () => void;
  onDismiss: () => void;
}

// §5.7 — offered once, at 45 days since the last period start.
export function RecalcCard({ onRecalculate, onDismiss }: RecalcCardProps) {
  return (
    <Card>
      <Text style={{ ...typography.cardTitle, color: colors.text }}>{en.recalcTitle}</Text>
      <Text style={{ ...typography.body, color: colors.textMuted, marginTop: spacing.xs }}>
        {en.recalcBody}
      </Text>
      <View style={{ flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md }}>
        <Pressable accessibilityRole="button" onPress={onRecalculate}>
          <Text style={{ ...typography.body, color: colors.primary }}>{en.recalcAction}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onDismiss}>
          <Text style={{ ...typography.body, color: colors.textMuted }}>{en.dismiss}</Text>
        </Pressable>
      </View>
    </Card>
  );
}
