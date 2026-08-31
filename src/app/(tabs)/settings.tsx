import { Pressable, ScrollView, Text, Switch } from 'react-native';

import { en } from '../../i18n/en';
import { colors } from '../../theme/colors';
import { MIN_TOUCH_TARGET, radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { useSettingsStore } from '../../stores/useSettingsStore';

export default function SettingsScreen() {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
      <Text style={{ ...typography.title, color: colors.text }}>{en.settings}</Text>

      <Row
        label={en.settingsCalendarSystem}
        value={settings.calendar_system ?? 'AD'}
        onPress={() => update({ calendar_system: (settings.calendar_system ?? 'AD') === 'AD' ? 'BS' : 'AD' })}
      />
      <Row
        label={en.settingsNotifications}
        value={settings.notifications_enabled ? 'On' : 'Off'}
        onPress={() => update({ notifications_enabled: !(settings.notifications_enabled ?? false) })}
      />
    </ScrollView>
  );
}

function Row({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: MIN_TOUCH_TARGET,
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.md,
        borderRadius: radius.control,
      }}
    >
      <Text style={{ ...typography.body, color: colors.text }}>{label}</Text>
      <Text style={{ ...typography.caption, color: colors.textMuted }}>{value}</Text>
    </Pressable>
  );
}
