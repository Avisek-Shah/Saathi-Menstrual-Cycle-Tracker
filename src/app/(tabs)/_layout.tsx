import { Tabs } from 'expo-router';

import { en } from '../../i18n/en';
import { colors } from '../../theme/colors';

export default function TabsLayout() {
  // Icons added in M0 polish / M4 (currently label-only).
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: en.home }} />
      <Tabs.Screen name="calendar" options={{ title: en.calendar }} />
      <Tabs.Screen name="insights" options={{ title: en.insights }} />
      <Tabs.Screen name="settings" options={{ title: en.settings }} />
    </Tabs>
  );
}
