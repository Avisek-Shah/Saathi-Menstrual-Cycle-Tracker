import { Text, View } from 'react-native';

import { formatDateRange } from '../../core/calendar';
import { daysBetween } from '../../core/dates';
import type { Prediction } from '../../core/prediction';
import type { CalendarSystem } from '../../core/calendar';
import { en, fill } from '../../i18n/en';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
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
  const { fertileStart, fertileEnd, isIrregular } = prediction;
  return (
    <Card muted={isIrregular}>
      <Text style={{ ...typography.cardTitle, color: colors.text }}>{en.fertileWindow}</Text>
      <Text style={{ ...typography.body, color: colors.text, marginTop: spacing.xs }}>
        {formatDateRange(fertileStart, fertileEnd, calendarSystem)}
      </Text>
      <Text style={{ ...typography.caption, color: colors.textMuted, marginTop: spacing.xs }}>
        {relativeLine(fertileStart, fertileEnd, today)}
      </Text>
      {isIrregular ? (
        <Text style={{ ...typography.caption, color: colors.warning, marginTop: spacing.sm }}>
          {en.fertileIrregularNote}
        </Text>
      ) : null}
      {/* Permanent by design (§6.2) — never dismissible. */}
      <Text style={{ ...typography.caption, color: colors.textMuted, marginTop: spacing.sm }}>
        {en.fertileDisclaimer}
      </Text>
    </Card>
  );
}
