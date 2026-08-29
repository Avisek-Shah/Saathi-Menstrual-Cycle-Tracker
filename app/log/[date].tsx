import { View, Text, Pressable } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { colors } from '../../src/theme/colors';
export default function LogModal() {
  const { date } = useLocalSearchParams<{ date: string }>();
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 700, color: colors.text }}>{date}</Text>
      <Text style={{ color: colors.textMuted, marginTop: 8 }}>Flow · Mood · Symptoms · Note</Text>
      <Pressable style={{ marginTop: 24, backgroundColor: colors.primary, padding: 14, borderRadius: 12 }}>
        <Text style={{ color: '#fff', fontWeight: 600, textAlign: 'center' }}>Save</Text>
      </Pressable>
    </View>
  );
}
