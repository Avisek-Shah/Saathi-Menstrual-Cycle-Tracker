import { Pressable, Text, View } from 'react-native';

import { en } from '../../i18n/en';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { useColors } from '../../theme/useColors';
import { Card } from '../ui/Card';

interface StartPromptProps {
  /** "Yes, log it" — writes flow for today, same as the "My period started" button. */
  onConfirm: () => void;
  /** "Not yet" — dismiss for this session. */
  onDismiss: () => void;
}

/**
 * §2.7 D — the once-per-day inline prompt while a predicted period is unlogged. Neutral: it
 * asks, it never says "you're late".
 */
export function StartPrompt({ onConfirm, onDismiss }: StartPromptProps) {
  const c = useColors();
  return (
    <Card>
      <Text style={{ ...typography.body, color: c.text }}>{en.startPromptQuestion}</Text>
      <View style={{ flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md }}>
        <Pressable accessibilityRole="button" onPress={onConfirm}>
          <Text style={{ ...typography.body, color: c.primary }}>{en.startPromptYes}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onDismiss}>
          <Text style={{ ...typography.body, color: c.textMuted }}>{en.startPromptNo}</Text>
        </Pressable>
      </View>
    </Card>
  );
}
