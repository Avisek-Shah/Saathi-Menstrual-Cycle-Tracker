import { Pressable, Text, View } from 'react-native';

import type { CalendarSystem } from '../../core/calendar';
import { formatDate } from '../../core/calendar';
import { flowLabel, moodLabel, symptomLabel } from '../../core/enums';
import { groupByMonth, type JournalRow } from '../../core/journal';
import { en } from '../../i18n/en';
import { colors } from '../../theme/colors';
import { MIN_TOUCH_TARGET, radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface JournalTimelineProps {
  rows: JournalRow[];
  system: CalendarSystem;
  hasMore: boolean;
  loadingMore: boolean;
  onPressDay: (dateIso: string) => void;
  onLoadMore: () => void;
}

function Tag({ text }: { text: string }) {
  return (
    <View
      style={{
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
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

/**
 * §6.5 Journal — the readable record of what was logged, grouped by month, newest first.
 * `rows` and pagination are owned by the screen (`dailyLogs.getRecent`); this component only
 * groups and renders what it is given.
 */
export function JournalTimeline({ rows, system, hasMore, loadingMore, onPressDay, onLoadMore }: JournalTimelineProps) {
  if (rows.length === 0) {
    return (
      <Card>
        <Text style={{ ...typography.body, color: colors.textMuted }}>{en.journalEmpty}</Text>
      </Card>
    );
  }

  const groups = groupByMonth(rows, system);

  return (
    <View style={{ gap: spacing.lg }}>
      {groups.map((group) => (
        <View key={group.key} style={{ gap: spacing.sm }}>
          <Text style={{ ...typography.cardTitle, color: colors.text }}>{group.label}</Text>
          {group.entries.map((entry) => (
            <Pressable
              key={entry.date}
              accessibilityRole="button"
              onPress={() => onPressDay(entry.date)}
              style={{
                minHeight: MIN_TOUCH_TARGET,
                backgroundColor: colors.surface,
                borderRadius: radius.card,
                borderWidth: 1,
                borderColor: colors.border,
                padding: spacing.md,
                gap: spacing.xs,
              }}
            >
              <Text style={{ ...typography.body, color: colors.text }}>
                {formatDate(entry.date, system)}
              </Text>
              {entry.hasFlow || entry.moods.length > 0 || entry.symptoms.length > 0 ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                  {entry.hasFlow ? <Tag text={flowLabel(entry.flow)} /> : null}
                  {entry.moods.map((m) => (
                    <Tag key={m} text={moodLabel(m)} />
                  ))}
                  {entry.symptoms.map((s) => (
                    <Tag key={s} text={symptomLabel(s)} />
                  ))}
                </View>
              ) : (
                <Text style={{ ...typography.caption, color: colors.textMuted }}>
                  {en.journalNothingLogged}
                </Text>
              )}
              {entry.noteExcerpt ? (
                <Text style={{ ...typography.caption, color: colors.textMuted }} numberOfLines={1}>
                  {entry.noteExcerpt}
                </Text>
              ) : null}
            </Pressable>
          ))}
        </View>
      ))}

      {hasMore ? (
        <Button
          variant="ghost"
          label={en.journalLoadMore}
          onPress={onLoadMore}
          disabled={loadingMore}
        />
      ) : null}
    </View>
  );
}
