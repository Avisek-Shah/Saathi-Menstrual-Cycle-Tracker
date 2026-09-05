import { Pressable, Text, View } from 'react-native';

import {
  flowLabel,
  moodLabel,
  symptomLabel,
  type FlowLevel,
  type Mood,
  type Symptom,
} from '../../core/enums';
import type { LogRow } from '../../db/repositories/dailyLogs';
import { en } from '../../i18n/en';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Card } from '../ui/Card';

interface LogSummaryProps {
  log: LogRow | null;
  onEdit: () => void;
}

function Tag({ text }: { text: string }) {
  return (
    <View
      style={{
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: radius.pill,
        backgroundColor: colors.bg,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Text style={{ ...typography.caption, color: colors.text }}>{text}</Text>
    </View>
  );
}

export function LogSummary({ log, onEdit }: LogSummaryProps) {
  const tags: string[] = [];
  if (log) {
    if (log.flow !== 'none') tags.push(flowLabel(log.flow as FlowLevel));
    log.moods.forEach((m) => tags.push(moodLabel(m as Mood)));
    log.symptoms.forEach((s) => tags.push(symptomLabel(s as Symptom)));
  }

  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ ...typography.cardTitle, color: colors.text }}>{en.todaysLog}</Text>
        <Pressable accessibilityRole="button" onPress={onEdit}>
          <Text style={{ ...typography.body, color: colors.primary }}>{en.edit}</Text>
        </Pressable>
      </View>
      {tags.length > 0 ? (
        <View
          style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm }}
        >
          {tags.map((t, i) => (
            <Tag key={`${t}-${i}`} text={t} />
          ))}
        </View>
      ) : (
        <Text style={{ ...typography.body, color: colors.textMuted, marginTop: spacing.sm }}>
          {en.logSummaryEmpty}
        </Text>
      )}
    </Card>
  );
}
