import { Pressable, Text, View } from 'react-native';

import { en } from '../../i18n/en';
import { colors } from '../../theme/colors';
import { MIN_TOUCH_TARGET, radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

// Placeholder — the five swipeable steps and the settings/seed write arrive in M3 (§6.1).
export default function Onboarding() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
      }}
    >
      <Text style={{ ...typography.hero, color: colors.text, marginBottom: spacing.md }}>
        {en.welcome}
      </Text>
      <Text style={{ ...typography.body, color: colors.textMuted, textAlign: 'center' }}>
        {en.welcomeSubtitle}
      </Text>
      <Pressable
        style={{
          minHeight: MIN_TOUCH_TARGET,
          justifyContent: 'center',
          marginTop: spacing.xxl,
          paddingHorizontal: spacing.xl,
          backgroundColor: colors.primary,
          borderRadius: radius.control,
        }}
      >
        <Text style={{ ...typography.cardTitle, color: colors.surface }}>{en.begin}</Text>
      </Pressable>
    </View>
  );
}
