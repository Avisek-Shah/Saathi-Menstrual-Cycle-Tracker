import { ScrollView, Text, View } from 'react-native';

import { en, fill } from '../../i18n/en';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Card } from '../../components/ui/Card';
import { useCycleStore } from '../../stores/useCycleStore';

export default function InsightsScreen() {
  const { prediction, ready } = useCycleStore();
  if (!ready || !prediction) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg }}>
        <Text style={{ ...typography.title, color: colors.text }}>{en.insights}</Text>
        <Card><Text style={{ ...typography.body, color: colors.textMuted }}>{en.insightsEmptyStats}</Text></Card>
      </ScrollView>
    );
  }
  const { avgCycleLength, avgPeriodLength, cyclesUsed, confidence } = prediction;
  const hasEnough = (cyclesUsed ?? 0) >= 2;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
      <Text style={{ ...typography.title, color: colors.text }}>{en.insights}</Text>
      {!hasEnough ? (
        <Card><Text style={{ ...typography.body, color: colors.textMuted }}>{en.insightsEmptyStats}</Text></Card>
      ) : (
        <>
          <StatRow label={en.insightsAvgCycle} value={fill(en.insightsDays, { n: String(avgCycleLength) })} />
          <StatRow label={en.insightsAvgPeriod} value={fill(en.insightsDays, { n: String(avgPeriodLength) })} />
          <Text style={{ ...typography.caption, color: colors.textMuted }}>{fill(en.insightsCyclesUsed, { n: String(cyclesUsed) })}</Text>
          <Text style={{ ...typography.caption, color: colors.textMuted }}>{confidence === 'low' ? 'Estimate — keep logging' : ''}</Text>
        </>
      )}
    </ScrollView>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <Text style={{ ...typography.caption, color: colors.textMuted }}>{label}</Text>
      <Text style={{ ...typography.hero, color: colors.text }}>{value}</Text>
    </Card>
  );
}
