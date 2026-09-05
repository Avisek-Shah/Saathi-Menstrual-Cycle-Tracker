import { parseISO } from 'date-fns';
import { useRef } from 'react';
import { type LayoutChangeEvent, Pressable, ScrollView, Text, View } from 'react-native';

import type { CalendarSystem } from '../../core/calendar';
import { formatDate } from '../../core/calendar';
import { type DayCellState, dayCellState } from '../../core/home';
import type { Period } from '../../core/periods';
import type { Prediction } from '../../core/prediction';
import type { LogRow } from '../../db/repositories/dailyLogs';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { type Palette } from '../../theme/colors';
import { useColors } from '../../theme/useColors';
import { StateGlyph } from '../ui/StateGlyph';

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const COL_WIDTH = 46;

interface LinearStripProps {
  days: string[];
  today: string;
  logsByDate: Record<string, LogRow>;
  periods: Period[];
  prediction: Prediction;
  calendarSystem: CalendarSystem;
  onPressDay: (dateIso: string) => void;
}

function fillFor(state: DayCellState, c: Palette): string {
  switch (state) {
    case 'loggedPeriod':
      return c.periodLogged;
    case 'predictedPeriod':
      return c.periodPredicted;
    case 'fertile':
      return c.fertile;
    case 'ovulation':
      return c.ovulation;
    default:
      return c.surface;
  }
}

/**
 * §2.6 — the 14-day strip beneath the ring. This is where exact dates live, so anyone the
 * ring's abstraction loses has a literal answer right below it. Tapping a column opens that
 * day's log.
 */
export function LinearStrip({
  days,
  today,
  logsByDate,
  periods,
  prediction,
  calendarSystem,
  onPressDay,
}: LinearStripProps) {
  const c = useColors();
  const scroller = useRef<ScrollView>(null);

  // Bias the initial scroll so today sits ~35% from the left — recent past stays visible
  // while the future dominates.
  const onLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    const x = Math.max(0, 5 * COL_WIDTH - width * 0.35);
    scroller.current?.scrollTo({ x, animated: false });
  };

  return (
    <ScrollView
      ref={scroller}
      horizontal
      showsHorizontalScrollIndicator={false}
      onLayout={onLayout}
      contentContainerStyle={{ paddingVertical: spacing.xs }}
    >
      {days.map((iso) => {
        const log = logsByDate[iso] ?? null;
        const state = dayCellState({
          dateIso: iso,
          loggedFlow: log?.flow ?? null,
          hasLogRow: log !== null,
          periods,
          prediction,
        });
        const isToday = iso === today;
        const onSolid = state === 'loggedPeriod' || state === 'ovulation';
        const isPredicted = state === 'predictedPeriod';
        const d = parseISO(iso);

        return (
          <Pressable
            key={iso}
            onPress={() => onPressDay(iso)}
            accessibilityRole="button"
            accessibilityLabel={formatDate(iso, calendarSystem, 'd MMMM')}
            style={{ width: COL_WIDTH, alignItems: 'center', gap: 3 }}
          >
            <Text style={{ ...typography.caption, color: c.textMuted }}>{WEEKDAY[d.getDay()]}</Text>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: isToday ? 2 : isPredicted ? 1.5 : 0,
                borderColor: isToday ? c.todayMarker : c.periodPredictedBorder,
                borderStyle: isPredicted && !isToday ? 'dashed' : 'solid',
                backgroundColor: fillFor(state, c),
              }}
            >
              <Text
                style={{
                  ...typography.caption,
                  fontWeight: onSolid ? '600' : '400',
                  color: onSolid ? c.surface : c.text,
                }}
              >
                {formatDate(iso, calendarSystem, 'd')}
              </Text>
            </View>
            <View style={{ height: 9, justifyContent: 'center' }}>
              <StateGlyph state={state} color={glyphColor(state, c)} size={9} />
            </View>
            <View
              style={{
                width: 4,
                height: 4,
                borderRadius: 2,
                backgroundColor: log ? c.textMuted : 'transparent',
              }}
            />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function glyphColor(state: DayCellState, c: Palette): string {
  switch (state) {
    case 'loggedPeriod':
    case 'predictedPeriod':
      return c.periodLogged;
    case 'ovulation':
      return c.ovulation;
    case 'loggedNoFlow':
      return c.textMuted;
    default:
      return 'transparent';
  }
}
