import { View } from 'react-native';

import { dayCellState, weekStripDays } from '../../core/home';
import type { Period } from '../../core/periods';
import type { Prediction } from '../../core/prediction';
import type { LogRow } from '../../db/repositories/dailyLogs';
import { spacing } from '../../theme/spacing';
import { DayCell } from './DayCell';

interface WeekStripProps {
  today: string;
  periods: Period[];
  prediction: Prediction;
  weekLogs: Record<string, LogRow>;
  onPressDay: (dateIso: string) => void;
}

export function WeekStrip({ today, periods, prediction, weekLogs, onPressDay }: WeekStripProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: spacing.md,
      }}
    >
      {weekStripDays(today).map((dateIso) => {
        const log = weekLogs[dateIso] ?? null;
        const isFuture = dateIso > today;
        return (
          <DayCell
            key={dateIso}
            dateIso={dateIso}
            isToday={dateIso === today}
            disabled={isFuture}
            onPress={isFuture ? undefined : () => onPressDay(dateIso)}
            state={dayCellState({
              dateIso,
              loggedFlow: log?.flow ?? null,
              hasLogRow: log !== null,
              periods,
              prediction,
            })}
          />
        );
      })}
    </View>
  );
}
