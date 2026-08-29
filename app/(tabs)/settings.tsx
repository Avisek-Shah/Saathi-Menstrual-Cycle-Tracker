import { Text, View, ScrollView, Pressable } from 'react-native';
import { colors } from '../../src/theme/colors';
export default function SettingsScreen() {
  return (
    <ScrollView style={{ backgroundColor: colors.bg, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: 700, color: colors.text, marginBottom: 12 }}>Settings</Text>
      <Pressable style={{ backgroundColor: colors.surface, padding: 14, borderRadius: 12, marginBottom: 10 }}>
        <Text style={{ color: colors.text }}>Calendar system: AD</Text>
      </Pressable>
      <Pressable style={{ backgroundColor: colors.surface, padding: 14, borderRadius: 12 }}>
        <Text style={{ color: colors.text }}>Notifications</Text>
      </Pressable>
    </ScrollView>
  );
}
