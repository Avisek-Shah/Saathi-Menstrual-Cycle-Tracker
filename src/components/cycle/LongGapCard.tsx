import { Pressable, Text } from 'react-native';

import { en } from '../../i18n/en';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { useColors } from '../../theme/useColors';
import { Card } from '../ui/Card';

interface LongGapCardProps {
  /** Opens Settings → My cycle to re-anchor the last period start. */
  onReanchor: () => void;
}

/**
 * §2.7 E — one re-anchor card after 60+ days without a logged period. Not dismissible: it is
 * the only way back to a working prediction. Never mentions a cause.
 */
export function LongGapCard({ onReanchor }: LongGapCardProps) {
  const c = useColors();
  return (
    <Card>
      <Text style={{ ...typography.body, color: c.text }}>{en.longGapBody}</Text>
      <Pressable accessibilityRole="button" onPress={onReanchor} style={{ marginTop: spacing.md }}>
        <Text style={{ ...typography.body, color: c.primary }}>{en.longGapAction}</Text>
      </Pressable>
    </Card>
  );
}
