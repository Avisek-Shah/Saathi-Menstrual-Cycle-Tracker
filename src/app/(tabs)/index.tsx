import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';

import { daysBetween } from '../../core/dates';
import { predict } from '../../core/prediction';
import { getAllPeriods } from '../../db/repositories/periods';
import { en, fill } from '../../i18n/en';
import { todayIso } from '../../services/clock';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

// M4 replaces this whole screen with the §6.2 status card, week strip and fertile card.
// For M3 it only proves the pipeline: onboarding -> settings + seeded period -> recompute -> predict.
function statusLine(nextPeriodStart: string, today: string): string {
  const days = daysBetween(today, nextPeriodStart);
  if (days > 1) return fill(en.periodIn, { days });
  if (days === 1) return en.periodInOne;
  if (days === 0) return en.expectedAroundNow;
  return fill(en.lateBy, { days: -days });
}

export default function Home() {
  const settings = useSettingsStore((s) => s.settings);
  const [line, setLine] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        const periods = await getAllPeriods();
        const today = todayIso();
        const prediction = predict(periods, settings, today);
        if (!cancelled) setLine(statusLine(prediction.nextPeriodStart, today));
      })();
      return () => {
        cancelled = true;
      };
    }, [settings]),
  );

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
      <Text style={{ ...typography.hero, color: colors.primary, marginTop: spacing.md }}>
        {line ?? en.comingSoon}
      </Text>
    </View>
  );
}
