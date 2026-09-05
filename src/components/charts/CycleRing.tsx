import { type ReactNode, useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import type { DayCellState, RingDay } from '../../core/home';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

interface CycleRingProps {
  days: RingDay[];
  size?: number;
  strokeWidth?: number;
  /** Rendered centered over the ring — the headline/date/confidence text. */
  children?: ReactNode;
}

// §11.2 — colour is never the only carrier of meaning; every filled state elsewhere in the
// app (DayCell) also gets a distinct ring or dot. The ring reuses the exact same fills so a
// user who already reads the calendar/week strip recognises the same states here.
function colorForState(state: Exclude<DayCellState, 'loggedNoFlow' | 'none'>): string {
  switch (state) {
    case 'loggedPeriod':
      return colors.primary;
    case 'predictedPeriod':
      return colors.primaryMuted;
    case 'fertile':
      return colors.fertileMuted;
    case 'ovulation':
      return colors.ovulationFill;
  }
}

// Mirrors DayCell's `onSolid` rule: white text on the two solid fills, dark text on the pale
// washes and the empty track — never relies on colour alone since the number itself is the
// second signal (§11.2).
function textColorForState(state: DayCellState): string {
  if (state === 'loggedPeriod' || state === 'ovulation') return colors.surface;
  if (state === 'none') return colors.textMuted;
  return colors.text;
}

interface Segment {
  state: Exclude<DayCellState, 'loggedNoFlow' | 'none'>;
  startIndex: number;
  count: number;
}

/** Run-length encode consecutive same-state days so each colour is drawn as one arc, not N. */
function toSegments(days: RingDay[]): Segment[] {
  const segments: Segment[] = [];
  for (let i = 0; i < days.length; i++) {
    const state = days[i].state;
    if (state === 'none') continue;
    const last = segments[segments.length - 1];
    if (last && last.startIndex + last.count === i && last.state === state) {
      last.count += 1;
    } else {
      segments.push({ state, startIndex: i, count: 1 });
    }
  }
  return segments;
}

/**
 * §16 / BUILD_PLAN "SVG cycle-day ring" — one full cycle laid out as a ring: a coloured arc
 * per state (period / predicted / fertile / ovulation), each day numbered, plus a marker on
 * today's day. Not interactive — the calendar tab already covers logging; this is the
 * at-a-glance hero.
 */
export function CycleRing({ days, size = 288, strokeWidth = 24, children }: CycleRingProps) {
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  const segments = toSegments(days);

  // Each day's centre point sits on the ring band itself, at the midpoint of its arc slice —
  // same angle math the today-marker used before numbers existed.
  const pointFor = (index: number) => {
    const angle = ((index + 0.5) / days.length) * 2 * Math.PI - Math.PI / 2;
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  };
  // The *seam* before day index `k` (as opposed to `pointFor`'s day-centre) — where one
  // segment's dasharray actually starts/ends, so a rounded end-cap sits exactly on the join.
  const seamPoint = (k: number) => {
    const angle = (k / days.length) * 2 * Math.PI - Math.PI / 2;
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  };
  const todayIndex = days.findIndex((d) => d.isToday);
  const todayPoint = todayIndex >= 0 ? pointFor(todayIndex) : null;
  const numberBox = Math.max(16, Math.min(strokeWidth, 22));
  // The marker ring inverts against its own fill — dark on the pale washes and the empty
  // track, white on the two solid fills — which is the same contrast rule the digit itself
  // follows. Doing it this way means one ring is enough: no second halo ring widening the
  // marker into the neighbouring day's number.
  const todayRingColor =
    todayIndex >= 0 && textColorForState(days[todayIndex].state) === colors.surface
      ? colors.surface
      : colors.text;

  // §11.7 — a single opacity fade on mount, ≤200ms, honours the OS reduce-motion setting
  // (resolves instantly when it's on). No loop, no colour/size animation.
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 200, reduceMotion: ReduceMotion.System });
  }, [opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[{ width: size, height: size }, style]}>
      <View
        style={{ position: 'absolute', width: size, height: size }}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Svg width={size} height={size}>
          <Circle
            cx={cx}
            cy={cy}
            r={radius}
            stroke={colors.border}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {segments.flatMap((seg) => {
            const arcLength = (circumference * seg.count) / days.length;
            const offset = (circumference * seg.startIndex) / days.length;
            const color = colorForState(seg.state);
            const main = (
              <Circle
                key={`${seg.state}-${seg.startIndex}`}
                cx={cx}
                cy={cy}
                r={radius}
                stroke={color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${arcLength} ${circumference - arcLength}`}
                strokeDashoffset={-offset}
                // A *true* round linecap rounds both ends of this dash equally — but where
                // two colours sit back-to-back (fertile → ovulation → fertile, a day apart)
                // that bulges each into the other and swallows the number between them. So
                // the stroke itself always stays square-jointed…
                strokeLinecap="butt"
                fill="none"
                rotation={-90}
                origin={`${cx}, ${cy}`}
              />
            );
            // …and a small filled disc — the same diameter as the band, so it reproduces a
            // round cap exactly — is added by hand, but only at a seam that borders the empty
            // track (`none`), never at a seam between two colours. That keeps the rounded
            // look at every segment's *real* edge (period start, fertile tapering into empty
            // days) while the tight internal joins that broke last time stay flat.
            const before = days[(seg.startIndex - 1 + days.length) % days.length].state;
            const after = days[(seg.startIndex + seg.count) % days.length].state;
            const caps = [];
            if (before === 'none') {
              const p = seamPoint(seg.startIndex);
              caps.push(
                <Circle key={`${seg.state}-${seg.startIndex}-cap-start`} cx={p.x} cy={p.y} r={strokeWidth / 2} fill={color} />,
              );
            }
            if (after === 'none') {
              const p = seamPoint(seg.startIndex + seg.count);
              caps.push(
                <Circle key={`${seg.state}-${seg.startIndex}-cap-end`} cx={p.x} cy={p.y} r={strokeWidth / 2} fill={color} />,
              );
            }
            return [main, ...caps];
          })}
        </Svg>
        {days.map((day, i) => {
          const point = pointFor(i);
          return (
            <View
              key={day.dateIso}
              style={{
                position: 'absolute',
                left: point.x - numberBox / 2,
                top: point.y - numberBox / 2,
                width: numberBox,
                height: numberBox,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  ...typography.caption,
                  fontSize: numberBox < 20 ? 10 : typography.caption.fontSize,
                  lineHeight: numberBox,
                  color: textColorForState(day.state),
                }}
              >
                {day.dayNumber}
              </Text>
            </View>
          );
        })}
        {/* Today: a ring, not a fill, so the day number underneath stays readable — the
            marker is the shape, matching DayCell's own "today" convention (§11.2). It sits
            exactly on `numberBox`, adding no width of its own: day numbers are only ~29.6px
            apart at a 28-day cycle (and under 19px at the 45-day maximum §5 allows), so every
            pixel of padding here is a pixel of the neighbouring date covered. Contrast comes
            from `todayRingColor` inverting against the fill, not from a second halo ring. */}
        {todayPoint ? (
          <View
            style={{
              position: 'absolute',
              left: todayPoint.x - numberBox / 2,
              top: todayPoint.y - numberBox / 2,
              width: numberBox,
              height: numberBox,
              borderRadius: numberBox / 2,
              borderWidth: 2,
              borderColor: todayRingColor,
            }}
          />
        ) : null}
      </View>
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: strokeWidth * 2,
        }}
      >
        {children}
      </View>
    </Animated.View>
  );
}
