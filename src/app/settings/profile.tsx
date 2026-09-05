import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { useCycleStore } from '../../stores/useCycleStore';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { DatePickerGrid } from '../../components/ui/DatePickerGrid';
import { NumberAnswerField } from '../../components/ui/NumberAnswerField';
import { Screen } from '../../components/ui/Screen';
import { TextField } from '../../components/ui/TextField';
import { formatDate } from '../../core/calendar';
import {
  CYCLE_LENGTH_CHOICES,
  CYCLE_LENGTH_MAX,
  CYCLE_LENGTH_MIN,
  PERIOD_LENGTH_CHOICES,
  PERIOD_LENGTH_MAX,
  PERIOD_LENGTH_MIN,
  birthYearQuickChoices,
  birthYearRange,
  isSelectableStartDate,
  parseNumberInput,
  type NumberInputError,
} from '../../core/onboarding';
import { en, fill } from '../../i18n/en';
import { currentYear, todayIso } from '../../services/clock';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

function numberFieldError(
  error: NumberInputError | null,
  min: number,
  max: number,
  isYear: boolean,
): string | null {
  if (error === null) return null;
  if (error === 'empty') return en.numberFieldEmpty;
  if (error === 'notANumber') return en.numberFieldNotANumber;
  return fill(isYear ? en.numberFieldOutOfRangeYear : en.numberFieldOutOfRangeCycle, { min, max });
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card style={{ gap: spacing.md }}>
      <Text style={{ ...typography.cardTitle, color: colors.text }}>{title}</Text>
      {children}
    </Card>
  );
}

/**
 * §6.7 "My cycle" — every onboarding answer, editable at any time with the same chips-plus-
 * typed-field controls (§6.1). Each row saves independently; the last-period date goes
 * through the §6.7 re-seed confirmation before anything is written.
 */
export default function ProfileScreen() {
  const router = useRouter();
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  const changeAnchor = useSettingsStore((s) => s.changeAnchor);
  const refresh = useCycleStore((s) => s.refresh);

  const [today] = useState(() => todayIso());
  const [thisYear] = useState(() => currentYear());
  const yearRange = useMemo(() => birthYearRange(thisYear), [thisYear]);
  const yearChoices = useMemo(() => birthYearQuickChoices(thisYear), [thisYear]);
  const yearMin = yearRange[yearRange.length - 1];
  const yearMax = yearRange[0];
  const isSelectableStart = useCallback(
    (iso: string) => isSelectableStartDate(today, iso),
    [today],
  );

  const [cycleLengthText, setCycleLengthText] = useState(String(settings.reported_cycle_length));
  const [periodLengthText, setPeriodLengthText] = useState(String(settings.reported_period_length));
  const [birthYearText, setBirthYearText] = useState(
    settings.birth_year !== null ? String(settings.birth_year) : '',
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pendingAnchor, setPendingAnchor] = useState<string | null>(null);
  const [savingField, setSavingField] = useState<
    'cycle' | 'period' | 'birthYear' | 'anchor' | null
  >(null);

  const cycleLength = parseNumberInput(cycleLengthText, CYCLE_LENGTH_MIN, CYCLE_LENGTH_MAX);
  const periodLength = parseNumberInput(periodLengthText, PERIOD_LENGTH_MIN, PERIOD_LENGTH_MAX);
  const birthYear =
    birthYearText.trim() === ''
      ? { value: null, error: null as NumberInputError | null }
      : parseNumberInput(birthYearText, yearMin, yearMax);

  const saveCycleLength = async () => {
    if (cycleLength.value === null) return;
    setSavingField('cycle');
    await update({ reported_cycle_length: cycleLength.value });
    setSavingField(null);
    void refresh(today);
  };

  const savePeriodLength = async () => {
    if (periodLength.value === null) return;
    setSavingField('period');
    await update({ reported_period_length: periodLength.value });
    setSavingField(null);
    void refresh(today);
  };

  const saveBirthYear = async () => {
    if (birthYear.error) return;
    setSavingField('birthYear');
    await update({ birth_year: birthYear.value });
    setSavingField(null);
    void refresh(today);
  };

  const confirmAnchorChange = (iso: string) => {
    setShowDatePicker(false);
    setPendingAnchor(iso);
    Alert.alert(en.profileAnchorConfirmTitle, en.profileAnchorConfirmBody, [
      { text: en.cancel, style: 'cancel', onPress: () => setPendingAnchor(null) },
      {
        text: en.profileAnchorConfirmAction,
        onPress: () => {
          void (async () => {
            setSavingField('anchor');
            await changeAnchor(iso);
            setSavingField(null);
            setPendingAnchor(null);
            void refresh(today);
          })();
        },
      },
    ]);
  };

  return (
    <Screen title={en.profileTitle} bottomInset>
      <Section title={en.profileCycleLength}>
        <NumberAnswerField
          value={cycleLength.value}
          text={cycleLengthText}
          onChangeText={setCycleLengthText}
          errorText={numberFieldError(cycleLength.error, CYCLE_LENGTH_MIN, CYCLE_LENGTH_MAX, false)}
          choices={CYCLE_LENGTH_CHOICES}
          pickerMin={CYCLE_LENGTH_MIN}
          pickerMax={CYCLE_LENGTH_MAX}
          accessibilityLabel={en.profileCycleLength}
          showPicker={false}
        />
        <Button
          label={savingField === 'cycle' ? en.profileSaved : en.profileSave}
          onPress={() => void saveCycleLength()}
          disabled={cycleLength.error !== null || savingField === 'cycle'}
        />
      </Section>

      <Section title={en.profilePeriodLength}>
        <NumberAnswerField
          value={periodLength.value}
          text={periodLengthText}
          onChangeText={setPeriodLengthText}
          errorText={numberFieldError(
            periodLength.error,
            PERIOD_LENGTH_MIN,
            PERIOD_LENGTH_MAX,
            false,
          )}
          choices={PERIOD_LENGTH_CHOICES}
          pickerMin={PERIOD_LENGTH_MIN}
          pickerMax={PERIOD_LENGTH_MAX}
          accessibilityLabel={en.profilePeriodLength}
          showPicker={false}
        />
        <Button
          label={savingField === 'period' ? en.profileSaved : en.profileSave}
          onPress={() => void savePeriodLength()}
          disabled={periodLength.error !== null || savingField === 'period'}
        />
      </Section>

      <Section title={en.profileBirthYear}>
        <View style={{ maxWidth: 160 }}>
          <TextField
            value={birthYearText}
            onChangeText={setBirthYearText}
            keyboardType="number-pad"
            maxLength={4}
            errorText={numberFieldError(birthYear.error, yearMin, yearMax, true)}
            accessibilityLabel={en.profileBirthYear}
          />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {yearChoices.map((y) => (
            <Chip
              key={y}
              label={String(y)}
              selected={birthYearText === String(y)}
              onPress={() => setBirthYearText(String(y))}
            />
          ))}
          <Chip
            label={en.profileClear}
            selected={birthYearText === ''}
            onPress={() => setBirthYearText('')}
          />
        </View>
        <Button
          label={savingField === 'birthYear' ? en.profileSaved : en.profileSave}
          onPress={() => void saveBirthYear()}
          disabled={birthYear.error !== null || savingField === 'birthYear'}
        />
      </Section>

      <Section title={en.profileLastPeriodStart}>
        <Text style={{ ...typography.body, color: colors.text }}>
          {settings.onboarding_seed_range
            ? formatDate(settings.onboarding_seed_range.start, settings.calendar_system)
            : en.profileLastPeriodStartUnset}
        </Text>
        <Button
          variant="ghost"
          label={en.profileChangeDate}
          onPress={() => setShowDatePicker((v) => !v)}
        />
        {showDatePicker ? (
          <DatePickerGrid
            system={settings.calendar_system}
            today={today}
            value={pendingAnchor}
            isSelectable={isSelectableStart}
            onSelect={confirmAnchorChange}
          />
        ) : null}
      </Section>

      <Button variant="ghost" label={en.cancel} onPress={() => router.back()} />
    </Screen>
  );
}
