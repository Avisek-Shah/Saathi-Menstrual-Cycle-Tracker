import { View, Text, Pressable } from 'react-native';
import { colors } from '../../src/theme/colors';
export default function Onboarding() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Text style={{ color: colors.text, fontSize: 34, fontWeight: 700, marginBottom: 12 }}>Saathi</Text>
      <Text style={{ color: colors.textMuted, fontSize: 15, textAlign: 'center' }}>A private tracker. Everything stays on your phone.</Text>
      <Pressable style={{ marginTop: 40, paddingVertical: 14, paddingHorizontal: 32, backgroundColor: colors.primary, borderRadius: 12 }}>
        <Text style={{ color: '#fff', fontWeight: 600 }}>Begin</Text>
      </Pressable>
    </View>
  );
}
