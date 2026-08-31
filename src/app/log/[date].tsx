import { format, parseISO } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import {
  FLOW_LEVELS,
  MOODS,
  SYMPTOMS_ORDERED,
  flowLabel,
  moodLabel,
  symptomLabel,
  type FlowLevel,
} from '../../core/enums';
import { getByDate } from '../../db/repositories/dailyLogs';
import { Chip } from '../../components/ui/Chip';
import { en, fill } from '../../i18n/en';
import { todayIso } from '../../services/clock';
import { useCycleStore } from '../../stores/useCycleStore';
import { colors } from '../../theme/colors';
import { MIN_TOUCH_TARGET, radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

const NOTE_MAX = 500;

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function FlowOption({
  level,
  index,
  selected,
  onPress,
}: {
  level: FlowLevel;
  index: number;
  selected: boolean;
  onPress: () => void;
}) {
  // "Icons of increasing weight" (§6.4) without an icon font: a dot that grows with the level.
  const dot = 6 + index * 5;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={flowLabel(level)}
      onPress={onPress}
      style={{ alignItems: 'center', gap: 6, flex: 1 }}
    >
      <View
        style={{
          width: MIN_TOUCH_TARGET,
          height: MIN_TOUCH_TARGET,
          borderRadius: MIN_TOUCH_TARGET / 2,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: selected ? 2 : 1,
          borderColor: selected ? colors.primary : colors.border,
          backgroundColor: selected ? colors.primaryMuted : colors.surface,
        }}
      >
        <View
          style={{
            width: dot,
            height: dot,
            borderRadius: dot / 2,
            backgroundColor: index === 0 ? colors.textMuted : colors.primary,
          }}
        />
      </View>
      <Text style={{ ...typography.caption, color: colors.textMuted }}>{flowLabel(level)}</Text>
    </Pressable>
  );
}

export default function LogModal() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const router = useRouter();
  const saveLog = useCycleStore((s) => s.saveLog);

  const [flow, setFlow] = useState<FlowLevel>('none');
  const [moods, setMoods] = useState<string[]>([]);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);

  useEffect(() => {
    let active = true;
    void getByDate(date).then((row) => {
      if (!active || !row) return;
      setFlow(row.flow as FlowLevel);
      setMoods(row.moods);
      setSymptoms(row.symptoms);
      setNote(row.note ?? '');
      setNoteOpen(Boolean(row.note));
    });
    return () => {
      active = false;
    };
  }, [date]);

  const isFuture = date > todayIso();

  const handleSave = () => {
    const today = todayIso();
    router.back();
    void saveLog(date, flow, moods, symptoms, note.trim() ? note.trim() : null, today).catch(() => {
      Alert.alert(en.saveFailedTitle, en.saveFailedBody, [
        { text: en.cancel, style: 'cancel' },
        {
          text: en.retry,
          onPress: () => {
            void saveLog(date, flow, moods, symptoms, note.trim() ? note.trim() : null, today);
          },
        },
      ]);
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={8}>
          <Text style={{ ...typography.body, color: colors.textMuted }}>{en.cancel}</Text>
        </Pressable>
        <Text style={{ ...typography.cardTitle, color: colors.text }}>
          {format(parseISO(date), 'EEE d MMM')}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={handleSave}
          disabled={isFuture}
          hitSlop={8}
        >
          <Text style={{ ...typography.cardTitle, color: isFuture ? colors.textMuted : colors.primary }}>
            {en.save}
          </Text>
        </Pressable>
      </View>

      {isFuture ? (
        <View style={{ padding: spacing.xl }}>
          <Text style={{ ...typography.body, color: colors.textMuted }}>{en.logFutureBlocked}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl }}>
          <View>
            <Text style={{ ...typography.cardTitle, color: colors.text, marginBottom: spacing.md }}>
              {en.logFlow}
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.xs }}>
              {FLOW_LEVELS.map((level, index) => (
                <FlowOption
                  key={level}
                  level={level}
                  index={index}
                  selected={flow === level}
                  onPress={() => setFlow(level)}
                />
              ))}
            </View>
          </View>

          <View>
            <Text style={{ ...typography.cardTitle, color: colors.text, marginBottom: spacing.md }}>
              {en.logMood}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {MOODS.map((m) => (
                <Chip
                  key={m}
                  label={moodLabel(m)}
                  selected={moods.includes(m)}
                  onPress={() => setMoods((prev) => toggle(prev, m))}
                />
              ))}
            </View>
          </View>

          <View>
            <Text style={{ ...typography.cardTitle, color: colors.text, marginBottom: spacing.md }}>
              {en.logSymptoms}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {SYMPTOMS_ORDERED.map((s) => (
                <Chip
                  key={s}
                  label={symptomLabel(s)}
                  selected={symptoms.includes(s)}
                  onPress={() => setSymptoms((prev) => toggle(prev, s))}
                />
              ))}
            </View>
          </View>

          <View>
            {noteOpen ? (
              <>
                <Text style={{ ...typography.cardTitle, color: colors.text, marginBottom: spacing.md }}>
                  {en.logNote}
                </Text>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  maxLength={NOTE_MAX}
                  multiline
                  placeholder={en.logNotePlaceholder}
                  placeholderTextColor={colors.textMuted}
                  style={{
                    ...typography.body,
                    color: colors.text,
                    minHeight: 96,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: radius.control,
                    padding: spacing.md,
                    textAlignVertical: 'top',
                  }}
                />
                <Text
                  style={{
                    ...typography.caption,
                    color: colors.textMuted,
                    alignSelf: 'flex-end',
                    marginTop: spacing.xs,
                  }}
                >
                  {fill(en.logNoteCount, { n: note.length })}
                </Text>
              </>
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={() => setNoteOpen(true)}
                style={{ minHeight: MIN_TOUCH_TARGET, justifyContent: 'center' }}
              >
                <Text style={{ ...typography.body, color: colors.primary }}>{en.logAddNote}</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
