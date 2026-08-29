import { Text, View, ScrollView } from 'react-native';
import { colors } from '../../src/theme/colors';
export default function InsightsScreen() {
  return (
    <ScrollView style={{ backgroundColor: colors.bg, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: 700, color: colors.text, marginBottom: 12 }}>Insights</Text>
      <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 12 }}>
        <Text style={{ color: colors.text, fontWeight: 600 }}>Average cycle length</Text>
        <Text style={{ color: colors.textMuted, marginTop: 4 }}>Keep logging to see patterns (needs 2+ cycles)</Text>
      </View>
    </ScrollView>
  );
}
