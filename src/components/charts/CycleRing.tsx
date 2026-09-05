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

// §11.2 mandates `primaryMuted` for the predicted-period *calendar cell*, where M10
// darkened it to near-black (#050505ff) for grid legibility. On the ring — soft pastel arcs
// on a pale track — near-black reads as an error next to the mint/pink arcs, and before the
// ring became a full calendar month this arc was off-screen so nobody saw it. The ring keeps
// the softer pre-M10 pink for this one state; every other fill is the shared token, and the
// calendar is untouched. See DECISIONS.md 2026-09-06.
const RING_PREDICTED_FILL = '#F9D4DC';

// §11.2 — colour is never the only carrier of meaning; every filled state elsewhere in the
// app (DayCell) also gets a distinct ring or dot. The ring reuses the same fills so a user
// who already reads the calendar/week strip recognises the same states here.
function colorForState(state: Exclude<DayCellState, 'loggedNoFlow' | 'none'>): string {
  switch (state) {
    case 'loggedPeriod':
      return colors.primary;
    case 'predictedPeriod':
      return RING_PREDICTED_FILL;
    case 'fertile':
      return colors.fertileMuted;
    case 'ovulation':
      return colors.ovulationFill;
  }
}

// Mirrors DayCell's text-color rule: white text on the solid fills, dark text on the pale
// washes and the empty track — never relies on colour alone since the number itself is the
// second signal (§11.2). Predicted period is a pale wash on the ring (see RING_PREDICTED_FILL),
// so its number is dark here, not the white DayCell uses on the darkened calendar fill.
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
 * §16 / BUILD_PLAN "SVG cycle-day ring" — one calendar month laid out as a ring (user
 * request 2026-09-06; was one cycle from the last-period anchor): a coloured arc per state
 * (period / predicted / fertile / ovulation), each day numbered by its day-of-month, plus a
 * marker on today. `days` is `monthRingDays()` output. Not interactive — the calendar tab
 * covers logging; this is the at-a-glance hero.
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
  // A point on the ring band at day-index position `k` (fractional allowed) — `k` whole is
  // the seam *before* day `k`, where a segment's dasharray starts/ends; a fractional `k` is
  // used to place the pulled-in end-cap discs a fraction of a day inside that seam.
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
            // The ring is one calendar month, not a wrapping cycle: the last day of the
            // month is not adjacent to the first, so both ends are open (treated as `none`),
            // which gives a rounded cap at the 12 o'clock seam on each side.
            const endIndex = seg.startIndex + seg.count;
            const before: DayCellState =
              seg.startIndex === 0 ? 'none' : days[seg.startIndex - 1].state;
            const after: DayCellState = endIndex === days.length ? 'none' : days[endIndex].state;
            const color = colorForState(seg.state);

            // A rounded arc end is a dome of radius strokeWidth/2. Drawn the obvious way —
            // strokeLinecap="round", or a filled disc centred *on* the seam — that dome
            // overshoots the seam by strokeWidth/2 and lands on top of the day number just
            // outside the arc: at a 30-day cycle a `none` day's centre is only ~14px past
            // the seam, less than the dome's 12px reach, so 30 / 8 / 11 / 19 (the numbers
            // bordering the predicted-period and fertile arcs) got a coloured blob dumped on
            // them. Fix: pull the butt-capped stroke *in* by strokeWidth/2 at every end that
            // borders the empty track, then put the dome back with a disc whose outer edge
            // stops exactly at the true seam — same rounded silhouette, nothing crossing
            // into the neighbouring number. Ends that meet another colour keep their flush
            // butt join, so the tight fertile → ovulation → fertile joins stay flat.
            const capArc = strokeWidth / 2;
            const arcPerDay = circumference / days.length;
            const capDays = capArc / arcPerDay;
            const startInset = before === 'none' ? capArc : 0;
            const endInset = after === 'none' ? capArc : 0;
            const rawArcLength = (circumference * seg.count) / days.length;
            const arcLength = Math.max(0.1, rawArcLength - startInset - endInset);
            const offset = (circumference * seg.startIndex) / days.length + startInset;

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
                strokeLinecap="butt"
                fill="none"
                rotation={-90}
                origin={`${cx}, ${cy}`}
              />
            );

            const caps = [];
            if (before === 'none') {
              const p = seamPoint(seg.startIndex + capDays);
              caps.push(
                <Circle
                  key={`${seg.state}-${seg.startIndex}-cap-start`}
                  cx={p.x}
                  cy={p.y}
                  r={capArc}
                  fill={color}
                />,
              );
            }
            if (after === 'none') {
              const p = seamPoint(seg.startIndex + seg.count - capDays);
              caps.push(
                <Circle
                  key={`${seg.state}-${seg.startIndex}-cap-end`}
                  cx={p.x}
                  cy={p.y}
                  r={capArc}
                  fill={color}
                />,
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
