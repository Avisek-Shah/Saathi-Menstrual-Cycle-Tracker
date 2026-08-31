import { Pressable, Text, View } from 'react-native';

import { colors } from '../../theme/colors';
import { MIN_TOUCH_TARGET } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface RowProps {
  label: string;
  value?: string;
  onPress?: () => void;
}

/** A labeled fact or navigation row: label left, value right. Shared by Settings and the
 * Insights cycle overview so both read as one visual language. */
export function Row({ label, value, onPress }: RowProps) {
  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: MIN_TOUCH_TARGET,
      }}
    >
      <Text style={{ ...typography.body, color: colors.text }}>{label}</Text>
      {value ? <Text style={{ ...typography.body, color: colors.textMuted }}>{value}</Text> : null}
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {content}
    </Pressable>
  );
}

export function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.border }} />;
}
