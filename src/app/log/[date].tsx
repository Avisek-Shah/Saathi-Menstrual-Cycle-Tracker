import { useLocalSearchParams } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { en } from '../../i18n/en';
import { colors } from '../../theme/colors';
import { MIN_TOUCH_TARGET, radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

// Placeholder — flow / mood / symptoms / note sections and optimistic save arrive in M4 (§6.4).
export default function LogModal() {
  const { date } = useLocalSearchParams<{ date: string }>();
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, padding: spacing.xl }}>
      <Text style={{ ...typography.title, color: colors.text }}>{date}</Text>
      <Text style={{ ...typography.body, color: colors.textMuted, marginTop: spacing.sm }}>
        {`${en.logFlow} · ${en.logMood} · ${en.logSymptoms} · ${en.logNote}`}
      </Text>
      <Pressable
        style={{
          minHeight: MIN_TOUCH_TARGET,
          justifyContent: 'center',
          marginTop: spacing.xl,
          backgroundColor: colors.primary,
          borderRadius: radius.control,
        }}
      >
        <Text style={{ ...typography.cardTitle, color: colors.surface, textAlign: 'center' }}>
          {en.save}
        </Text>
      </Pressable>
    </View>
  );
}
