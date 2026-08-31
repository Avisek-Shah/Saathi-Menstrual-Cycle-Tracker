import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  NativeSyntheticEvent,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import type { NativeScrollEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { DatePickerGrid } from '../../components/ui/DatePickerGrid';
import { NumberAnswerField } from '../../components/ui/NumberAnswerField';
import { ProgressDots } from '../../components/ui/ProgressDots';
import { TextField } from '../../components/ui/TextField';
import { formatDate } from '../../core/calendar';
import {
  CYCLE_LENGTH_CHOICES,
  CYCLE_LENGTH_DEFAULT,
  CYCLE_LENGTH_MAX,
  CYCLE_LENGTH_MIN,
  PERIOD_LENGTH_CHOICES,
  PERIOD_LENGTH_DEFAULT,
  PERIOD_LENGTH_MAX,
  PERIOD_LENGTH_MIN,
  birthYearQuickChoices,
  birthYearRange,
  isSelectableStartDate,
  parseNumberInput,
  quickDateChoices,
  type NumberInputError,
} from '../../core/onboarding';
import { en, fill } from '../../i18n/en';
import { currentYear, todayIso } from '../../services/clock';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

const STEP_COUNT = 5;

/** §6.1 step 2 chip labels, in the order `quickDateChoices` returns their offsets. */
const START_DATE_CHOICE_LABELS = [
  en.onboardingStartToday,
  en.onboardingStartYesterday,
  en.onboardingStart3DaysAgo,
  en.onboardingStart1WeekAgo,
  en.onboardingStart2WeeksAgo,
];

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

interface PageStyle {
  width: number;
  paddingHorizontal: number;
  paddingTop: number;
}

interface NumberAnswerStepProps {
  pageStyle: PageStyle;
  title: string;
  help: string;
  value: number | null;
  text: string;
  onChangeText: (next: string) => void;
  error: string | null;
  choices: readonly number[];
  onDontKnow: () => void;
  pickerMin: number;
  pickerMax: number;
}

/**
 * §6.1 steps 3 and 4 share one shape: chips, a typed field, and the horizontal picker, all
 * three feeding the same value (§6.1 — "chips + typed field").
 */
function NumberAnswerStep({
  pageStyle,
  title,
  help,
  value,
  text,
  onChangeText,
  error,
  choices,
  onDontKnow,
  pickerMin,
  pickerMax,
}: NumberAnswerStepProps) {
  return (
    <ScrollView style={pageStyle} contentContainerStyle={{ paddingBottom: spacing.xl }}>
      <Text style={{ ...typography.title, color: colors.text }}>{title}</Text>
      <Text style={{ ...typography.body, color: colors.textMuted, marginTop: spacing.sm }}>{help}</Text>

      <View style={{ marginTop: spacing.xl }}>
        <NumberAnswerField
          value={value}
          text={text}
          onChangeText={onChangeText}
          errorText={error}
          choices={choices}
          pickerMin={pickerMin}
          pickerMax={pickerMax}
          accessibilityLabel={title}
          onDontKnow={onDontKnow}
        />
      </View>
    </ScrollView>
  );
}

export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const completeOnboarding = useSettingsStore((s) => s.completeOnboarding);
  const calendarSystem = useSettingsStore((s) => s.settings.calendar_system);

  const [step, setStep] = useState(0);

  // Step 2 — last period start.
  const [startDate, setStartDate] = useState<string | null>(null);
  const [notSure, setNotSure] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Step 3 / 4 — kept as raw typed text: a chip tap and typing both just write here (§6.1).
  const [cycleLengthText, setCycleLengthText] = useState(String(CYCLE_LENGTH_DEFAULT));
  const [periodLengthText, setPeriodLengthText] = useState(String(PERIOD_LENGTH_DEFAULT));

  // Step 5 — birth year. Empty text means "skipped".
  const [birthYearText, setBirthYearText] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const today = todayIso();
  const thisYear = currentYear();
  const dateChoices = quickDateChoices(today);
  const yearRange = birthYearRange(thisYear);
  const yearChoices = birthYearQuickChoices(thisYear);
  const yearMin = yearRange[yearRange.length - 1];
  const yearMax = yearRange[0];

  const cycleLength = parseNumberInput(cycleLengthText, CYCLE_LENGTH_MIN, CYCLE_LENGTH_MAX);
  const periodLength = parseNumberInput(periodLengthText, PERIOD_LENGTH_MIN, PERIOD_LENGTH_MAX);
  const birthYear =
    birthYearText.trim() === ''
      ? { value: null, error: null as NumberInputError | null }
      : parseNumberInput(birthYearText, yearMin, yearMax);

  const goTo = (next: number) => {
    const clamped = Math.max(0, Math.min(STEP_COUNT - 1, next));
    setStep(clamped);
    scrollRef.current?.scrollTo({ x: width * clamped, animated: true });
  };

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setStep(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  const canAdvance = (() => {
    if (step === 1) return startDate !== null || notSure;
    if (step === 2) return cycleLength.error === null;
    if (step === 3) return periodLength.error === null;
    if (step === 4) return birthYear.error === null;
    return true;
  })();

  const handleFinish = async () => {
    if (submitting || !canAdvance) return;
    setSubmitting(true);
    try {
      await completeOnboarding(
        {
          lastPeriodStart: notSure ? null : startDate,
          reportedCycleLength: cycleLength.value ?? CYCLE_LENGTH_DEFAULT,
          reportedPeriodLength: periodLength.value ?? PERIOD_LENGTH_DEFAULT,
          birthYear: birthYear.value,
        },
        today,
      );
      router.replace('/(tabs)');
    } catch {
      setSubmitting(false);
    }
  };

  const pageStyle: PageStyle = { width, paddingHorizontal: spacing.xl, paddingTop: spacing.xxl };

  const cycleLengthError = numberFieldError(cycleLength.error, CYCLE_LENGTH_MIN, CYCLE_LENGTH_MAX, false);
  const periodLengthError = numberFieldError(periodLength.error, PERIOD_LENGTH_MIN, PERIOD_LENGTH_MAX, false);
  const birthYearError = numberFieldError(birthYear.error, yearMin, yearMax, true);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {/* 1 — Welcome */}
        <ScrollView style={pageStyle} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
          <Text style={{ ...typography.hero, color: colors.text }}>{en.onboardingWelcomeTitle}</Text>
          <Text style={{ ...typography.body, color: colors.text, marginTop: spacing.lg }}>
            {en.onboardingWelcomeWhat}
          </Text>
          <Text style={{ ...typography.body, color: colors.textMuted, marginTop: spacing.md }}>
            {en.onboardingWelcomePrivacy}
          </Text>
        </ScrollView>

        {/* 2 — Last period start */}
        <ScrollView style={pageStyle} contentContainerStyle={{ paddingBottom: spacing.xl }}>
          <Text style={{ ...typography.title, color: colors.text }}>{en.onboardingStartTitle}</Text>
          <Text style={{ ...typography.body, color: colors.textMuted, marginTop: spacing.sm }}>
            {en.onboardingStartHelp}
          </Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg }}>
            {dateChoices.map((choice, i) => (
              <Chip
                key={choice.iso}
                label={START_DATE_CHOICE_LABELS[i]}
                selected={!notSure && startDate === choice.iso}
                onPress={() => {
                  setStartDate(choice.iso);
                  setNotSure(false);
                }}
              />
            ))}
            <Chip
              label={en.onboardingStartNotSure}
              selected={notSure}
              onPress={() => {
                setNotSure(true);
                setStartDate(null);
              }}
            />
          </View>

          <View style={{ marginTop: spacing.md, alignItems: 'flex-start' }}>
            <Button
              variant="ghost"
              label={showDatePicker ? en.onboardingHideDate : en.onboardingPickDate}
              onPress={() => setShowDatePicker((v) => !v)}
            />
          </View>

          {showDatePicker ? (
            <View style={{ marginTop: spacing.sm }}>
              <DatePickerGrid
                system={calendarSystem}
                today={today}
                value={notSure ? null : startDate}
                isSelectable={(iso) => isSelectableStartDate(today, iso)}
                onSelect={(iso) => {
                  setStartDate(iso);
                  setNotSure(false);
                }}
              />
            </View>
          ) : null}

          {startDate && !notSure ? (
            <Text style={{ ...typography.body, color: colors.primary, marginTop: spacing.md }}>
              {formatDate(startDate, calendarSystem)}
            </Text>
          ) : null}
        </ScrollView>

        {/* 3 — Typical cycle length */}
        <NumberAnswerStep
          pageStyle={pageStyle}
          title={en.onboardingCycleTitle}
          help={en.onboardingCycleHelp}
          value={cycleLength.value}
          text={cycleLengthText}
          onChangeText={setCycleLengthText}
          error={cycleLengthError}
          choices={CYCLE_LENGTH_CHOICES}
          onDontKnow={() => setCycleLengthText(String(CYCLE_LENGTH_DEFAULT))}
          pickerMin={CYCLE_LENGTH_MIN}
          pickerMax={CYCLE_LENGTH_MAX}
        />

        {/* 4 — Typical period length */}
        <NumberAnswerStep
          pageStyle={pageStyle}
          title={en.onboardingPeriodTitle}
          help={en.onboardingPeriodHelp}
          value={periodLength.value}
          text={periodLengthText}
          onChangeText={setPeriodLengthText}
          error={periodLengthError}
          choices={PERIOD_LENGTH_CHOICES}
          onDontKnow={() => setPeriodLengthText(String(PERIOD_LENGTH_DEFAULT))}
          pickerMin={PERIOD_LENGTH_MIN}
          pickerMax={PERIOD_LENGTH_MAX}
        />

        {/* 5 — Birth year */}
        <ScrollView style={pageStyle} contentContainerStyle={{ paddingBottom: spacing.xl }}>
          <Text style={{ ...typography.title, color: colors.text }}>{en.onboardingBirthYearTitle}</Text>
          <Text style={{ ...typography.body, color: colors.textMuted, marginTop: spacing.sm }}>
            {en.onboardingBirthYearHelp}
          </Text>
          <View style={{ marginTop: spacing.xl, maxWidth: 160 }}>
            <TextField
              value={birthYearText}
              onChangeText={setBirthYearText}
              keyboardType="number-pad"
              maxLength={4}
              placeholder={String(thisYear - 25)}
              errorText={birthYearError}
              accessibilityLabel={en.onboardingBirthYearTitle}
            />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md }}>
            {yearChoices.map((y) => (
              <Chip
                key={y}
                label={String(y)}
                selected={birthYearText === String(y)}
                onPress={() => setBirthYearText(String(y))}
              />
            ))}
          </View>
          <View style={{ marginTop: spacing.lg, alignItems: 'flex-start' }}>
            <Button
              variant="ghost"
              label={en.onboardingSkip}
              onPress={handleFinish}
              disabled={submitting}
            />
          </View>
        </ScrollView>
      </ScrollView>

      <Text
        style={{
          ...typography.caption,
          color: colors.textMuted,
          textAlign: 'center',
          paddingHorizontal: spacing.xl,
        }}
      >
        {en.onboardingEditableLater}
      </Text>

      {/*
        §6.1 / §11.6 — the footer clears the gesture bar via `insets.bottom`. This is the fix
        for the unreachable-Next-button bug: without the inset, this row rendered under the
        system navigation bar on gesture-nav phones and swallowed the tap.
      */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.md,
          paddingBottom: insets.bottom + spacing.lg,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <View style={{ flex: 1, alignItems: 'flex-start' }}>
          {step > 0 ? (
            <Button variant="ghost" label={en.onboardingBack} onPress={() => goTo(step - 1)} />
          ) : null}
        </View>
        <ProgressDots count={STEP_COUNT} activeIndex={step} />
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Button
            label={step === STEP_COUNT - 1 ? en.onboardingFinish : en.onboardingNext}
            disabled={!canAdvance || submitting}
            onPress={step === STEP_COUNT - 1 ? handleFinish : () => goTo(step + 1)}
          />
        </View>
      </View>
    </View>
  );
}
