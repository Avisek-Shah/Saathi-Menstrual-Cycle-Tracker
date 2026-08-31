import { ScrollView, Text, View } from 'react-native';

import { en } from '../../i18n/en';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

// Placeholder — stats, three charts and cycle history arrive in M6 (§6.5).
export default function InsightsScreen() {
  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg }}>
      <Text style={{ ...typography.title, color: colors.text, marginBottom: spacing.md }}>
        {en.insights}
      </Text>
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: radius.card,
          padding: spacing.lg,
        }}
      >
        <Text style={{ ...typography.cardTitle, color: colors.text }}>{en.insights}</Text>
        <Text style={{ ...typography.body, color: colors.textMuted, marginTop: spacing.xs }}>
          {en.insightsEmptyStats}
        </Text>
      </View>
    </ScrollView>
  );
}
