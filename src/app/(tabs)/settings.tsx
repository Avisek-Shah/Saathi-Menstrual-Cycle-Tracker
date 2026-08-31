import { Pressable, ScrollView, Text } from 'react-native';

import { en } from '../../i18n/en';
import { colors } from '../../theme/colors';
import { MIN_TOUCH_TARGET, radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

// Placeholder — full settings list, notifications, PIN, export, delete-all arrive in M7 (§6.7).
export default function SettingsScreen() {
  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg }}>
      <Text style={{ ...typography.title, color: colors.text, marginBottom: spacing.md }}>
        {en.settings}
      </Text>
      <Pressable
        style={{
          minHeight: MIN_TOUCH_TARGET,
          justifyContent: 'center',
          backgroundColor: colors.surface,
          paddingHorizontal: spacing.md,
          borderRadius: radius.control,
          marginBottom: spacing.sm,
        }}
      >
        <Text style={{ ...typography.body, color: colors.text }}>{en.settingsCalendarSystem}</Text>
      </Pressable>
      <Pressable
        style={{
          minHeight: MIN_TOUCH_TARGET,
          justifyContent: 'center',
          backgroundColor: colors.surface,
          paddingHorizontal: spacing.md,
          borderRadius: radius.control,
        }}
      >
        <Text style={{ ...typography.body, color: colors.text }}>{en.settingsNotifications}</Text>
      </Pressable>
    </ScrollView>
  );
}
