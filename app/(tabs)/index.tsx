import { Text, View } from 'react-native';
import { colors } from '../../src/theme/colors';
export default function Home() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.text, fontSize: 24, fontWeight: 700 }}>Saathi — Home (M0 done)</Text>
    </View>
  );
}
