import { Text } from 'react-native';

import { formatDate, formatDateRange, type CalendarSystem } from '../../core/calendar';
import { cycleDay, lastPeriodStartOnOrBefore, predictionDateRange } from '../../core/home';
import type { Period } from '../../core/periods';
import type { Prediction } from '../../core/prediction';
import { en, fill } from '../../i18n/en';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Card } from '../ui/Card';
import { Divider, Row } from '../ui/Row';

interface CycleOverviewCardProps {
  periods: Period[];
  prediction: Prediction;
  today: string;
  system: CalendarSystem;
}

/**
 * §6.5 Cycle overview — the one glanceable card the user asked for: last period, next
 * period, ovulation, fertile window, and where today sits in the cycle, all in one place.
 * Every value here is read straight from the already-computed `Period[]` / `Prediction` —
 * no new math, just a single clear presentation of numbers §5 already produces.
 */
export function CycleOverviewCard({ periods, prediction, today, system }: CycleOverviewCardProps) {
  const lastPeriod = periods.length > 0 ? periods[periods.length - 1] : null;
  const anchor = lastPeriodStartOnOrBefore(periods, today);

  const lastPeriodValue = lastPeriod
    ? `${formatDateRange(lastPeriod.start_date, lastPeriod.end_date, system)} (${fill(en.insightsDays, { n: lastPeriod.length_days })})`
    : en.overviewNoPeriodYet;

  const nextRange = predictionDateRange(prediction.nextPeriodStart, prediction.predictionWindow);
  const nextPeriodValue = nextRange.single
    ? formatDate(nextRange.single, system)
    : formatDateRange(nextRange.start, nextRange.end, system);

  const ovulationValue = formatDate(prediction.ovulationDate, system);
  const fertileValue = formatDateRange(prediction.fertileStart, prediction.fertileEnd, system);
  const cycleDayValue = lastPeriod ? fill(en.cycleDay, { day: cycleDay(anchor, today) }) : null;

  return (
    <Card>
      <Text style={{ ...typography.cardTitle, color: colors.text, marginBottom: spacing.xs }}>
        {en.overviewTitle}
      </Text>

      <Row label={en.overviewLastPeriod} value={lastPeriodValue} />
      <Divider />
      <Row label={en.overviewNextPeriod} value={nextPeriodValue} />
      <Divider />
      <Row label={en.overviewOvulation} value={ovulationValue} />
      <Divider />
      <Row label={en.fertileWindow} value={fertileValue} />

      {cycleDayValue ? (
        <Text style={{ ...typography.caption, color: colors.textMuted, marginTop: spacing.sm }}>
          {cycleDayValue}
        </Text>
      ) : null}
      {prediction.confidence === 'low' ? (
        <Text style={{ ...typography.caption, color: colors.textMuted, marginTop: spacing.xs }}>
          {en.confidenceEstimate}
        </Text>
      ) : null}
    </Card>
  );
}
