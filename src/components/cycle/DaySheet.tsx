import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { CalendarSystem } from '../../core/calendar';
import { formatDate } from '../../core/calendar';
import {
  FLOW_LEVELS,
  flowLabel,
  moodLabel,
  symptomLabel,
  type FlowLevel,
  type Mood,
  type Symptom,
} from '../../core/enums';
import { currentPeriod, periodDay } from '../../core/home';
import type { Period } from '../../core/periods';
import type { Prediction } from '../../core/prediction';
import { en, fill } from '../../i18n/en';
import { colors } from '../../theme/colors';
import { MIN_TOUCH_TARGET, radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import type { LogRow } from '../../db/repositories/dailyLogs';
import { Chip } from '../ui/Chip';

interface DaySheetProps {
  dateIso: string | null;
  today: string;
  system: CalendarSystem;
  periods: Period[];
  prediction: Prediction;
  log: LogRow | null;
  onSelectFlow: (flow: FlowLevel) => void;
  onEditFull: () => void;
  onClose: () => void;
}

/** §6.3.1 — the one state line describing this date, highest-precedence first. */
function stateLine(dateIso: string, periods: Period[], prediction: Prediction): string {
  const period = currentPeriod(periods, dateIso);
  if (period) return fill(en.dayStatePeriodDay, { n: periodDay(period.start_date, dateIso) });
  if (dateIso === prediction.ovulationDate) return en.futureOvulation;
  if (dateIso >= prediction.fertileStart && dateIso <= prediction.fertileEnd)
    return en.futureFertile;
  if (dateIso >= prediction.nextPeriodStart && dateIso <= prediction.nextPeriodEnd) {
    return en.futurePredictedPeriod;
  }
  return en.futureNothing;
}

/**
 * §6.3.1 — bottom sheet for one tapped calendar day. A future date is read-only (§10.1); a
 * past or present date offers one-tap flow logging and a link into the full log modal.
 */
export function DaySheet({
  dateIso,
  today,
  system,
  periods,
  prediction,
  log,
  onSelectFlow,
  onEditFull,
  onClose,
}: DaySheetProps) {
  const insets = useSafeAreaInsets();
  const visible = dateIso !== null;
  if (!dateIso) return null;

  const isFuture = dateIso > today;
  const hasAnything =
    log !== null &&
    (log.flow !== 'none' || log.moods.length > 0 || log.symptoms.length > 0 || log.note);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        accessibilityLabel={en.close}
        onPress={onClose}
        style={{ flex: 1, backgroundColor: 'rgba(46,42,44,0.35)', justifyContent: 'flex-end' }}
      >
        {/* Swallow taps on the sheet itself so they don't fall through to the backdrop. */}
        <Pressable
          onPress={() => undefined}
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.card,
            borderTopRightRadius: radius.card,
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.lg,
            paddingBottom: insets.bottom + spacing.lg,
            maxHeight: '80%',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: spacing.md,
            }}
          >
            <Text style={{ ...typography.cardTitle, color: colors.text }}>
              {formatDate(dateIso, system)}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={en.close}
              onPress={onClose}
              hitSlop={8}
            >
              <Text style={{ ...typography.body, color: colors.textMuted }}>{en.close}</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ gap: spacing.md }}>
            <Text style={{ ...typography.body, color: colors.text }}>
              {stateLine(dateIso, periods, prediction)}
            </Text>

            {isFuture ? (
              <Text style={{ ...typography.body, color: colors.textMuted }}>
                {en.logFutureBlocked}
              </Text>
            ) : (
              <>
                {hasAnything ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                    {log && log.flow !== 'none' ? (
                      <Chip
                        label={flowLabel(log.flow as FlowLevel)}
                        selected
                        onPress={() => undefined}
                      />
                    ) : null}
                    {/* `LogRow` stores raw strings from the DB; every value it holds was
                        written through the log modal's enum-typed chips, so this cast just
                        recovers the type the write side already guaranteed. */}
                    {log?.moods.map((m) => (
                      <Chip
                        key={m}
                        label={moodLabel(m as Mood)}
                        selected
                        onPress={() => undefined}
                      />
                    ))}
                    {log?.symptoms.map((s) => (
                      <Chip
                        key={s}
                        label={symptomLabel(s as Symptom)}
                        selected
                        onPress={() => undefined}
                      />
                    ))}
                  </View>
                ) : (
                  <Text style={{ ...typography.body, color: colors.textMuted }}>
                    {en.daySheetNothingLogged}
                  </Text>
                )}

                <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                  {FLOW_LEVELS.map((level) => {
                    const selected = (log?.flow ?? 'none') === level;
                    return (
                      <Pressable
                        key={level}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        accessibilityLabel={flowLabel(level)}
                        onPress={() => onSelectFlow(level)}
                        style={{
                          flex: 1,
                          minHeight: MIN_TOUCH_TARGET,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: radius.control,
                          borderWidth: selected ? 2 : 1,
                          borderColor: selected ? colors.primary : colors.border,
                          backgroundColor: selected ? colors.primaryMuted : colors.surface,
                        }}
                      >
                        <Text
                          style={{
                            ...typography.caption,
                            color: selected ? colors.onPrimaryMuted : colors.text,
                          }}
                        >
                          {flowLabel(level)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Pressable
                  accessibilityRole="button"
                  onPress={onEditFull}
                  style={{ minHeight: MIN_TOUCH_TARGET, justifyContent: 'center' }}
                >
                  <Text style={{ ...typography.body, color: colors.primary }}>
                    {en.daySheetEditFull}
                  </Text>
                </Pressable>
              </>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
