import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { CalendarSystem } from '../../core/calendar';
import { formatDate } from '../../core/calendar';
import type { CycleRingModel, HeroPhase } from '../../core/home';
import { predictionDateRange } from '../../core/home';
import type { Prediction } from '../../core/prediction';
import { en, fill } from '../../i18n/en';
import { elevation } from '../../theme/elevation';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { useColors } from '../../theme/useColors';
import { CycleRing } from '../charts/CycleRing';

interface CycleRingCardProps {
  model: CycleRingModel;
  phase: HeroPhase;
  prediction: Prediction;
  calendarSystem: CalendarSystem;
}

interface Centre {
  eyebrow: string | null;
  hero: string;
  chip: string | null;
  toggleable: boolean;
}

function confidenceChip(prediction: Prediction): string | null {
  if (prediction.cyclesUsed === 0) return en.ringChipFromYou;
  if (prediction.confidence === 'low') return en.confidenceEstimate;
  return null;
}

function dateForm(prediction: Prediction, system: CalendarSystem): string {
  const range = predictionDateRange(prediction.nextPeriodStart, prediction.predictionWindow);
  const fmt = (iso: string) => formatDate(iso, system, 'd MMM');
  if (range.single) return fill(en.ringDateAround, { date: fmt(range.single) });
  return fill(en.predictedRange, { a: fmt(range.start), b: fmt(range.end) });
}

function centreFor(
  phase: HeroPhase,
  prediction: Prediction,
  system: CalendarSystem,
  showDate: boolean,
): Centre {
  const chip = confidenceChip(prediction);
  switch (phase.phase) {
    case 'noData':
      return { eyebrow: null, hero: en.ringHeroNoData, chip: null, toggleable: false };
    case 'longGap':
      return { eyebrow: null, hero: en.ringHeroLongGap, chip: null, toggleable: false };
    case 'paused':
      return {
        eyebrow: fill(en.cycleDay, { day: phase.cycleDay }),
        hero: en.ringHeroPaused,
        chip: null,
        toggleable: false,
      };
    case 'noPeriodYet':
      return {
        eyebrow: fill(en.cycleDay, { day: phase.cycleDay }),
        hero: en.ringHeroNoPeriodYet,
        chip: null,
        toggleable: false,
      };
    case 'menstruating':
      return {
        eyebrow: fill(en.cycleDay, { day: phase.cycleDay }),
        hero: fill(en.onPeriod, { day: phase.periodDay }),
        chip,
        toggleable: false,
      };
    case 'postPeriod':
      return {
        eyebrow: null,
        hero: fill(en.cycleDay, { day: phase.cycleDay }),
        chip,
        toggleable: false,
      };
    case 'fertile':
      return {
        eyebrow: fill(en.cycleDay, { day: phase.cycleDay }),
        hero: fill(en.ringHeroFertile, { n: phase.dayN, total: phase.total }),
        chip,
        toggleable: false,
      };
    case 'ovulation':
      return {
        eyebrow: fill(en.cycleDay, { day: phase.cycleDay }),
        hero: en.ringHeroOvulation,
        chip,
        toggleable: false,
      };
    case 'expectedNow':
      return {
        eyebrow: fill(en.cycleDay, { day: phase.cycleDay }),
        hero: showDate ? dateForm(prediction, system) : en.expectedAroundNow,
        chip,
        toggleable: true,
      };
    case 'luteal': {
      const eyebrow = fill(en.cycleDay, { day: phase.cycleDay });
      if (phase.tier === 'range') {
        const range = predictionDateRange(prediction.nextPeriodStart, prediction.predictionWindow);
        const fmt = (iso: string) => formatDate(iso, system, 'd MMM');
        return {
          eyebrow,
          hero: fill(en.ringHeroExpectedRange, { a: fmt(range.start), b: fmt(range.end) }),
          chip,
          toggleable: false,
        };
      }
      if (showDate) return { eyebrow, hero: dateForm(prediction, system), chip, toggleable: true };
      const one = phase.daysUntil === 1;
      const hero =
        phase.tier === 'point'
          ? one
            ? en.periodInOne
            : fill(en.periodIn, { days: phase.daysUntil })
          : one
            ? en.ringHeroApproxOne
            : fill(en.ringHeroApprox, { days: phase.daysUntil });
      return { eyebrow, hero, chip, toggleable: true };
    }
  }
}

function a11yLabel(phase: HeroPhase, centre: Centre, length: number): string {
  if (phase.phase === 'noData') return en.ringA11yNoData;
  if (phase.phase === 'longGap') return en.ringHeroLongGap;
  const day = 'cycleDay' in phase ? phase.cycleDay : 0;
  const base = fill(en.ringA11yKnown, { day, length, hero: centre.hero });
  return centre.chip ? `${base} ${centre.chip}.` : base;
}

/** Home hero (UI/UX spec §2.5): the cycle-relative ring with a 3-line centre — eyebrow,
 * phase-aware hero, optional chip. Tapping the centre toggles the countdown ↔ the date. */
export function CycleRingCard({ model, phase, prediction, calendarSystem }: CycleRingCardProps) {
  const c = useColors();
  const [showDate, setShowDate] = useState(false);
  const centre = centreFor(phase, prediction, calendarSystem, showDate);

  const body = (
    <>
      {centre.eyebrow ? (
        <Text style={{ ...typography.caption, color: c.textMuted, textAlign: 'center' }}>
          {centre.eyebrow}
        </Text>
      ) : null}
      <Text
        style={{
          ...typography.hero,
          fontWeight: '600',
          color: c.text,
          textAlign: 'center',
          marginTop: 2,
        }}
        numberOfLines={2}
        adjustsFontSizeToFit
        maxFontSizeMultiplier={1.3}
      >
        {centre.hero}
      </Text>
      {centre.chip ? (
        <View
          style={{
            marginTop: spacing.xs,
            paddingHorizontal: spacing.sm,
            paddingVertical: 2,
            borderRadius: radius.pill,
            backgroundColor: c.bg,
            borderWidth: 1,
            borderColor: c.border,
          }}
        >
          <Text style={{ ...typography.caption, color: c.textMuted }}>{centre.chip}</Text>
        </View>
      ) : null}
    </>
  );

  return (
    <View
      style={{
        backgroundColor: c.surface,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: c.border,
        paddingVertical: spacing.xl,
        alignItems: 'center',
        ...elevation.raised,
      }}
    >
      <CycleRing model={model} accessibilityLabel={a11yLabel(phase, centre, model.length)}>
        {centre.toggleable ? (
          <Pressable
            onPress={() => setShowDate((v) => !v)}
            accessibilityRole="button"
            accessibilityHint={en.ringToggleHint}
            style={{ alignItems: 'center' }}
          >
            {body}
          </Pressable>
        ) : (
          <View style={{ alignItems: 'center' }}>{body}</View>
        )}
      </CycleRing>
    </View>
  );
}
