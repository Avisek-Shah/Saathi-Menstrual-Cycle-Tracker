import { format, parseISO } from 'date-fns';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import type { NativeScrollEvent } from 'react-native';

import { Button } from '../../components/ui/Button';
import { NumberPicker } from '../../components/ui/NumberPicker';
import { ProgressDots } from '../../components/ui/ProgressDots';
import {
  CYCLE_LENGTH_DEFAULT,
  CYCLE_LENGTH_MAX,
  CYCLE_LENGTH_MIN,
  PERIOD_LENGTH_DEFAULT,
  PERIOD_LENGTH_MAX,
  PERIOD_LENGTH_MIN,
  birthYearRange,
  recentDateOptions,
} from '../../core/onboarding';
import { en, fill } from '../../i18n/en';
import { currentYear, todayIso } from '../../services/clock';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { colors } from '../../theme/colors';
import { MIN_TOUCH_TARGET, radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

const STEP_COUNT = 5;

export default function Onboarding() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const completeOnboarding = useSettingsStore((s) => s.completeOnboarding);

  const [step, setStep] = useState(0);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [notSure, setNotSure] = useState(false);
  const [cycleLength, setCycleLength] = useState(CYCLE_LENGTH_DEFAULT);
  const [periodLength, setPeriodLength] = useState(PERIOD_LENGTH_DEFAULT);
  const [birthYear, setBirthYear] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const today = todayIso();
  const dateOptions = recentDateOptions(today);
  const years = birthYearRange(currentYear());

  const goTo = (next: number) => {
    const clamped = Math.max(0, Math.min(STEP_COUNT - 1, next));
    setStep(clamped);
    scrollRef.current?.scrollTo({ x: width * clamped, animated: true });
  };

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setStep(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  const canAdvance = step !== 1 || startDate !== null || notSure;

  const handleFinish = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await completeOnboarding(
        {
          lastPeriodStart: notSure ? null : startDate,
          reportedCycleLength: cycleLength,
          reportedPeriodLength: periodLength,
          birthYear,
        },
        today,
      );
      router.replace('/(tabs)');
    } catch {
      setSubmitting(false);
    }
  };

  const pageStyle = { width, paddingHorizontal: spacing.xl, paddingTop: spacing.xxl };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        scrollEnabled={canAdvance || step < 1}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {/* 1 — Welcome */}
        <View style={[pageStyle, { justifyContent: 'center' }]}>
          <Text style={{ ...typography.hero, color: colors.text }}>{en.onboardingWelcomeTitle}</Text>
          <Text style={{ ...typography.body, color: colors.text, marginTop: spacing.lg }}>
            {en.onboardingWelcomeWhat}
          </Text>
          <Text style={{ ...typography.body, color: colors.textMuted, marginTop: spacing.md }}>
            {en.onboardingWelcomePrivacy}
          </Text>
        </View>

        {/* 2 — Last period start */}
        <View style={pageStyle}>
          <Text style={{ ...typography.title, color: colors.text }}>{en.onboardingStartTitle}</Text>
          <Text style={{ ...typography.body, color: colors.textMuted, marginTop: spacing.sm }}>
            {en.onboardingStartHelp}
          </Text>
          <View style={{ flex: 1, marginTop: spacing.lg }}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {dateOptions.map((iso) => {
                const selected = !notSure && iso === startDate;
                return (
                  <Pressable
                    key={iso}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      setStartDate(iso);
                      setNotSure(false);
                    }}
                    style={{
                      minHeight: MIN_TOUCH_TARGET,
                      justifyContent: 'center',
                      paddingHorizontal: spacing.md,
                      marginBottom: spacing.xs,
                      borderRadius: radius.control,
                      backgroundColor: selected ? colors.primary : colors.surface,
                    }}
                  >
                    <Text
                      style={{
                        ...typography.body,
                        color: selected ? colors.surface : colors.text,
                      }}
                    >
                      {format(parseISO(iso), 'EEE d MMM yyyy')}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
          <View style={{ paddingVertical: spacing.md }}>
            <Button
              variant="ghost"
              label={en.onboardingStartNotSure}
              onPress={() => {
                setNotSure(true);
                setStartDate(null);
                goTo(2);
              }}
            />
          </View>
        </View>

        {/* 3 — Typical cycle length */}
        <View style={pageStyle}>
          <Text style={{ ...typography.title, color: colors.text }}>{en.onboardingCycleTitle}</Text>
          <Text style={{ ...typography.body, color: colors.textMuted, marginTop: spacing.sm }}>
            {en.onboardingCycleHelp}
          </Text>
          <Text style={{ ...typography.hero, color: colors.primary, marginTop: spacing.xl }}>
            {fill(en.onboardingCycleUnit, { n: cycleLength })}
          </Text>
          <View style={{ marginTop: spacing.lg }}>
            <NumberPicker
              min={CYCLE_LENGTH_MIN}
              max={CYCLE_LENGTH_MAX}
              value={cycleLength}
              onChange={setCycleLength}
              accessibilityLabel={en.onboardingCycleTitle}
            />
          </View>
          <View style={{ marginTop: spacing.lg, alignItems: 'flex-start' }}>
            <Button
              variant="ghost"
              label={en.onboardingDontKnow}
              onPress={() => {
                setCycleLength(CYCLE_LENGTH_DEFAULT);
                goTo(3);
              }}
            />
          </View>
        </View>

        {/* 4 — Typical period length */}
        <View style={pageStyle}>
          <Text style={{ ...typography.title, color: colors.text }}>{en.onboardingPeriodTitle}</Text>
          <Text style={{ ...typography.body, color: colors.textMuted, marginTop: spacing.sm }}>
            {en.onboardingPeriodHelp}
          </Text>
          <Text style={{ ...typography.hero, color: colors.primary, marginTop: spacing.xl }}>
            {fill(en.onboardingCycleUnit, { n: periodLength })}
          </Text>
          <View style={{ marginTop: spacing.lg }}>
            <NumberPicker
              min={PERIOD_LENGTH_MIN}
              max={PERIOD_LENGTH_MAX}
              value={periodLength}
              onChange={setPeriodLength}
              accessibilityLabel={en.onboardingPeriodTitle}
            />
          </View>
          <View style={{ marginTop: spacing.lg, alignItems: 'flex-start' }}>
            <Button
              variant="ghost"
              label={en.onboardingDontKnow}
              onPress={() => {
                setPeriodLength(PERIOD_LENGTH_DEFAULT);
                goTo(4);
              }}
            />
          </View>
        </View>

        {/* 5 — Birth year */}
        <View style={pageStyle}>
          <Text style={{ ...typography.title, color: colors.text }}>
            {en.onboardingBirthYearTitle}
          </Text>
          <Text style={{ ...typography.body, color: colors.textMuted, marginTop: spacing.sm }}>
            {en.onboardingBirthYearHelp}
          </Text>
          <View style={{ marginTop: spacing.xl }}>
            <NumberPicker
              min={years[years.length - 1]}
              max={years[0]}
              value={birthYear ?? 0}
              onChange={setBirthYear}
              accessibilityLabel={en.onboardingBirthYearTitle}
            />
          </View>
          <View style={{ marginTop: spacing.lg, alignItems: 'flex-start' }}>
            <Button variant="ghost" label={en.onboardingSkip} onPress={handleFinish} />
          </View>
        </View>
      </ScrollView>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.lg,
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
