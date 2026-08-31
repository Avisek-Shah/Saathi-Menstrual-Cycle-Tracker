import { Text, View } from 'react-native';

import { en } from '../../i18n/en';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

// Placeholder — month grid, AD/BS re-gridding and legend arrive in M5 (§6.3).
export default function CalendarScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: spacing.lg }}>
      <Text style={{ ...typography.title, color: colors.text, marginBottom: spacing.sm }}>
        {en.calendar}
      </Text>
      <View
        style={{
          height: 300,
          backgroundColor: colors.surface,
          borderRadius: radius.card,
          padding: spacing.sm,
        }}
      >
        <Text style={{ ...typography.body, color: colors.textMuted }}>{en.comingSoon}</Text>
      </View>
    </View>
  );
}
