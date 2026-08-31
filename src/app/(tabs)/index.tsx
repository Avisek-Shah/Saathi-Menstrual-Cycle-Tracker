import { Text, View } from 'react-native';

import { en } from '../../i18n/en';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

// Placeholder — replaced by the status card / week strip / fertile card in M4 (§6.2).
export default function Home() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.lg,
      }}
    >
      <Text style={{ ...typography.title, color: colors.text }}>{en.home}</Text>
      <Text style={{ ...typography.caption, color: colors.textMuted, marginTop: spacing.sm }}>
        {en.comingSoon}
      </Text>
    </View>
  );
}
