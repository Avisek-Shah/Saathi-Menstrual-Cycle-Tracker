import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Pressable, Switch, Text, View } from 'react-native';

import { Card } from '../../components/ui/Card';
import { Screen } from '../../components/ui/Screen';
import { en, fill } from '../../i18n/en';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { colors } from '../../theme/colors';
import { MIN_TOUCH_TARGET, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

function SectionLabel({ label }: { label: string }) {
  return (
    <Text
      style={{
        ...typography.caption,
        color: colors.textMuted,
        textTransform: 'uppercase',
        marginBottom: spacing.xs,
      }}
    >
      {label}
    </Text>
  );
}

function NavRow({ label, value, onPress }: { label: string; value?: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: MIN_TOUCH_TARGET,
      }}
    >
      <Text style={{ ...typography.body, color: colors.text }}>{label}</Text>
      {value ? <Text style={{ ...typography.caption, color: colors.textMuted }}>{value}</Text> : null}
    </Pressable>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: MIN_TOUCH_TARGET,
      }}
    >
      <Text style={{ ...typography.body, color: colors.text }}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.primary, false: colors.border }}
      />
    </View>
  );
}

/** A feature Settings links to that M7 hasn't built yet (see BUILD_PLAN §6b "Carried over"). */
function DisabledRow({ label }: { label: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: MIN_TOUCH_TARGET,
        opacity: 0.4,
      }}
    >
      <Text style={{ ...typography.body, color: colors.text }}>{label}</Text>
      <Text style={{ ...typography.caption, color: colors.textMuted }}>{en.settingsNotBuiltYet}</Text>
    </View>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.border }} />;
}

export default function SettingsScreen() {
  const router = useRouter();
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);

  return (
    <Screen title={en.settings} bottomInset>
      <View>
        <SectionLabel label={en.settingsMyCycleSection} />
        <Card>
          <NavRow
            label={en.settingsMyCycleRow}
            onPress={() => router.push('/settings/profile')}
          />
          <Divider />
          <NavRow
            label={en.settingsCalendarSystem}
            value={settings.calendar_system}
            onPress={() =>
              update({ calendar_system: settings.calendar_system === 'AD' ? 'BS' : 'AD' })
            }
          />
        </Card>
      </View>

      <View>
        <SectionLabel label={en.settingsNotifications} />
        <Card style={{ gap: spacing.sm }}>
          <ToggleRow
            label={en.settingsNotifPeriodSoon}
            value={settings.notif_period_soon}
            onChange={(v) => update({ notif_period_soon: v })}
          />
          <Divider />
          <ToggleRow
            label={en.settingsNotifPeriodToday}
            value={settings.notif_period_today}
            onChange={(v) => update({ notif_period_today: v })}
          />
          <Divider />
          <ToggleRow
            label={en.settingsNotifFertileStart}
            value={settings.notif_fertile_start}
            onChange={(v) => update({ notif_fertile_start: v })}
          />
          <Divider />
          <ToggleRow
            label={en.settingsNotifDailyLog}
            value={settings.notif_daily_log}
            onChange={(v) => update({ notif_daily_log: v })}
          />
          <Text style={{ ...typography.caption, color: colors.textMuted, marginTop: spacing.xs }}>
            {en.settingsNotifCaption}
          </Text>
        </Card>
      </View>

      <View>
        <SectionLabel label={en.settingsAppSection} />
        <Card style={{ gap: spacing.sm }}>
          <ToggleRow
            label={en.settingsQuickLog}
            value={settings.quick_log_enabled}
            onChange={(v) => update({ quick_log_enabled: v })}
          />
          <Divider />
          <DisabledRow label={en.settingsAppLock} />
        </Card>
      </View>

      <View>
        <SectionLabel label={en.settingsDataSection} />
        <Card style={{ gap: spacing.sm }}>
          <DisabledRow label={en.settingsExportData} />
          <Divider />
          <DisabledRow label={en.settingsDeleteAllData} />
        </Card>
      </View>

      <View>
        <SectionLabel label={en.settingsAboutSection} />
        <Card>
          <Text style={{ ...typography.caption, color: colors.textMuted }}>
            {Constants.expoConfig?.version
              ? fill(en.settingsVersion, { version: Constants.expoConfig.version })
              : en.settingsVersionUnknown}
          </Text>
        </Card>
      </View>
    </Screen>
  );
}
