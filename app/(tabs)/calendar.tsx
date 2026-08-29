import { Text, View } from 'react-native';
import { colors } from '../../src/theme/colors';
export default function CalendarScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: 700, color: colors.text, marginBottom: 8 }}>Calendar — AD / BS</Text>
      <View style={{ height: 300, backgroundColor: colors.surface, borderRadius: 16, padding: 8 }}>
        <Text style={{ color: colors.textMuted }}>(Month grid — M5 placeholder)</Text>
      </View>
    </View>
  );
}
