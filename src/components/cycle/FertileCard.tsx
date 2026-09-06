import { Text, View } from 'react-native';

import { formatDateRange } from '../../core/calendar';
import { daysBetween } from '../../core/dates';
import type { Prediction } from '../../core/prediction';
import type { CalendarSystem } from '../../core/calendar';
import { en, fill } from '../../i18n/en';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { useColors } from '../../theme/useColors';
import { Card } from '../ui/Card';

interface FertileCardProps {
  prediction: Prediction;
  calendarSystem: CalendarSystem;
  today: string;
}

function relativeLine(fertileStart: string, fertileEnd: string, today: string): string {
  if (today < fertileStart)
    return fill(en.fertileInDays, { days: daysBetween(today, fertileStart) });
  if (today > fertileEnd)
    return fill(en.fertileStartedDaysAgo, { days: daysBetween(fertileStart, today) });
  return en.fertileToday;
}

export function FertileCard({ prediction, calendarSystem, today }: FertileCardProps) {
  const c = useColors();
  const { fertileStart, fertileEnd, isIrregular } = prediction;
  return (
    <Card muted={isIrregular}>
      <Text style={{ ...typography.cardTitle, color: c.text }}>{en.fertileWindow}</Text>
      <Text style={{ ...typography.body, color: c.text, marginTop: spacing.xs }}>
        {formatDateRange(fertileStart, fertileEnd, calendarSystem)}
      </Text>
      <Text style={{ ...typography.caption, color: c.textMuted, marginTop: spacing.xs }}>
        {relativeLine(fertileStart, fertileEnd, today)}
      </Text>
      {isIrregular ? (
        <Text style={{ ...typography.caption, color: c.warning, marginTop: spacing.sm }}>
          {en.fertileIrregularNote}
        </Text>
      ) : null}
      {/* §3 / §6.2 — the most ethically important sentence in the app, as a bordered callout.
          Permanent by design; never dismissible. */}
      <View
        style={{
          marginTop: spacing.md,
          padding: spacing.sm,
          borderRadius: radius.control,
          borderWidth: 1,
          borderColor: c.periodLogged,
          backgroundColor: c.bg,
        }}
      >
        <Text style={{ ...typography.caption, color: c.text }}>{en.fertileDisclaimer}</Text>
      </View>
    </Card>
  );
}
