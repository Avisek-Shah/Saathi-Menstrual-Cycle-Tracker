import { type ReactNode, useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import type { CycleRingModel } from '../../core/home';
import { useColors } from '../../theme/useColors';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CycleRingProps {
  model: CycleRingModel;
  /** Diameter in dp. §2.3 calls for 240; the card may pass a little more. */
  size?: number;
  /**
   * Day-of-month for today, drawn inside the today-marker halo.
   * SPEC: §2.3 says "no numerals on the rim" — user explicitly asked for the date to show
   * on the ring anyway (2026-09-06); logged in DECISIONS.md. This is the one numeral, and
   * only ever the single today digit(s), never a full rim of day numbers.
   */
  todayLabel?: string | null;
  /** The 3-line centre (eyebrow / hero / chip), rendered over the ring. */
  children?: ReactNode;
  /** One full sentence for TalkBack — the ring is a single accessible element (§10). */
  accessibilityLabel: string;
}

const BAND_STROKE = 14; // §2.3
const PROGRESS_STROKE = 4; // §2.3

/**
 * Cycle-relative ring (UI/UX spec §2.2–2.7). Cycle day 1 at 12 o'clock, clockwise, length
 * `model.length`. Four layers over a neutral track: the menstruation + fertile phase band, a
 * one-day ovulation notch, a thin inner elapsed stroke, and the today-marker. Predicted arcs
 * are soft and feathered; the logged menstruation arc is hard-edged (§2.4). No rim numerals —
 * the sole exception is today's date-of-month inside the today-marker halo (see `todayLabel`).
 */
export function CycleRing({
  model,
  size = 240,
  todayLabel = null,
  children,
  accessibilityLabel,
}: CycleRingProps) {
  const c = useColors();
  const {
    length: L,
    periodLength,
    fertileStartDay,
    fertileEndDay,
    ovulationDay,
    elapsedDays,
    todayDay,
    overflowDays,
    frozen,
    ghost,
    lowConfidence,
    featherDays,
  } = model;

  const cx = size / 2;
  const cy = size / 2;
  const bandR = (size - BAND_STROKE) / 2;
  const progressR = bandR - 12;
  const bandC = 2 * Math.PI * bandR;
  const progressC = 2 * Math.PI * progressR;
  const overflowR = bandR + BAND_STROKE / 2 + 8;
  const tickInner = bandR - BAND_STROKE / 2 - 2;
  const tickOuter = bandR + BAND_STROKE / 2 + 2;

  // Day offset (fractional) → point on a circle of radius r. Day 0 sits at 12 o'clock.
  const deg = (day: number) => -90 + (day / L) * 360;
  const xy = (r: number, day: number) => {
    const rad = (deg(day) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };
  // A band arc from `d0` to `d1` as a dashed segment of a full circle — animation-friendly,
  // and the technique never touches the path `d` string on the JS thread.
  const arc = (d0: number, d1: number) => {
    const len = (Math.max(0, d1 - d0) / L) * bandC;
    return {
      strokeDasharray: `${len} ${bandC - len}`,
      strokeDashoffset: -((d0 / L) * bandC),
    };
  };
  // A partial arc as a real path — used only for the non-animated dashed overflow arc.
  const arcPath = (r: number, d0: number, d1: number) => {
    const p0 = xy(r, d0);
    const p1 = xy(r, d1);
    const large = d1 - d0 > L / 2 ? 1 : 0;
    return `M ${p0.x} ${p0.y} A ${r} ${r} 0 ${large} 1 ${p1.x} ${p1.y}`;
  };

  // §11.7 / §12 — one sweep on mount, 600ms ease-out, resolves instantly under reduce-motion.
  const sweep = useSharedValue(frozen ? 1 : 0);
  useEffect(() => {
    if (frozen) {
      sweep.value = 1;
      return;
    }
    sweep.value = withTiming(1, {
      duration: 600,
      easing: Easing.out(Easing.ease),
      reduceMotion: ReduceMotion.System,
    });
  }, [frozen, sweep]);
  const elapsedProps = useAnimatedProps(() => {
    const full = (elapsedDays / L) * progressC;
    return { strokeDasharray: [sweep.value * full, progressC] as unknown as string };
  });

  const fertileOpacity = lowConfidence ? 0.5 : 1;
  const hasFertile = fertileEndDay > fertileStartDay;
  const feather = Math.min(featherDays, (fertileEndDay - fertileStartDay) / 2);

  return (
    <View
      style={{ width: size, height: size }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      <View
        style={{ position: 'absolute', width: size, height: size, opacity: frozen ? 0.45 : 1 }}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Svg width={size} height={size}>
          {/* Neutral track / ghost ring */}
          <Circle
            cx={cx}
            cy={cy}
            r={bandR}
            stroke={c.neutralTrack}
            strokeWidth={BAND_STROKE}
            fill="none"
            opacity={ghost ? 0.15 : 1}
          />

          {!ghost && (
            <>
              {/* Menstruation arc — logged, hard-edged, full saturation (§2.4) */}
              <Circle
                cx={cx}
                cy={cy}
                r={bandR}
                stroke={c.periodLogged}
                strokeWidth={BAND_STROKE}
                strokeLinecap="butt"
                fill="none"
                rotation={-90}
                origin={`${cx}, ${cy}`}
                opacity={lowConfidence ? 0.6 : 1}
                {...arc(0, periodLength)}
              />

              {/* Fertile arc — predicted: soft, three stacked passes that fade toward the ends */}
              {hasFertile && (
                <>
                  <Circle
                    cx={cx}
                    cy={cy}
                    r={bandR}
                    stroke={c.fertile}
                    strokeWidth={BAND_STROKE}
                    strokeLinecap="round"
                    fill="none"
                    rotation={-90}
                    origin={`${cx}, ${cy}`}
                    opacity={0.3 * fertileOpacity}
                    {...arc(fertileStartDay, fertileEndDay)}
                  />
                  {feather > 0 && (
                    <Circle
                      cx={cx}
                      cy={cy}
                      r={bandR}
                      stroke={c.fertile}
                      strokeWidth={BAND_STROKE}
                      strokeLinecap="round"
                      fill="none"
                      rotation={-90}
                      origin={`${cx}, ${cy}`}
                      opacity={0.55 * fertileOpacity}
                      {...arc(fertileStartDay + feather / 2, fertileEndDay - feather / 2)}
                    />
                  )}
                  {feather > 0 && (
                    <Circle
                      cx={cx}
                      cy={cy}
                      r={bandR}
                      stroke={c.fertile}
                      strokeWidth={BAND_STROKE}
                      strokeLinecap="round"
                      fill="none"
                      rotation={-90}
                      origin={`${cx}, ${cy}`}
                      opacity={0.85 * fertileOpacity}
                      {...arc(fertileStartDay + feather, fertileEndDay - feather)}
                    />
                  )}
                </>
              )}

              {/* Ovulation — a single-day notch, never a wide arc (§2.3) */}
              <Line
                x1={xy(tickInner, ovulationDay).x}
                y1={xy(tickInner, ovulationDay).y}
                x2={xy(tickOuter, ovulationDay).x}
                y2={xy(tickOuter, ovulationDay).y}
                stroke={c.ovulation}
                strokeWidth={3}
                strokeLinecap="round"
                opacity={lowConfidence ? 0.6 : 1}
              />
              <Circle
                cx={xy(bandR, ovulationDay).x}
                cy={xy(bandR, ovulationDay).y}
                r={3.5}
                fill={c.ovulation}
                opacity={lowConfidence ? 0.6 : 1}
              />

              {/* Four subtle ticks: day 1 + phase boundaries (§2.3) */}
              {[0, periodLength, fertileStartDay, fertileEndDay].map((d, i) => (
                <Line
                  key={`tick-${i}`}
                  x1={xy(tickInner, d).x}
                  y1={xy(tickInner, d).y}
                  x2={xy(tickOuter, d).x}
                  y2={xy(tickOuter, d).y}
                  stroke={c.textMuted}
                  strokeWidth={1.5}
                  opacity={0.5}
                />
              ))}

              {/* Elapsed progress — thin, on its own inner radius so it never fights the band */}
              <AnimatedCircle
                cx={cx}
                cy={cy}
                r={progressR}
                stroke={c.todayMarker}
                strokeWidth={PROGRESS_STROKE}
                strokeLinecap="round"
                fill="none"
                rotation={-90}
                origin={`${cx}, ${cy}`}
                animatedProps={elapsedProps}
              />

              {/* Late: a dashed overflow arc growing one day at a time on an outer radius */}
              {overflowDays > 0 && (
                <Path
                  d={arcPath(overflowR, 0, overflowDays)}
                  stroke={c.periodLogged}
                  strokeWidth={3}
                  strokeDasharray="3 4"
                  strokeLinecap="round"
                  fill="none"
                />
              )}

              {/* Today marker — background-coloured halo, highest contrast. Carries today's
                  date-of-month when known (see `todayLabel` SPEC note above); a plain dot
                  otherwise. */}
              {todayDay !== null && (
                <>
                  <Circle
                    cx={xy(bandR, todayDay).x}
                    cy={xy(bandR, todayDay).y}
                    r={11}
                    fill={c.surface}
                    stroke={c.todayMarker}
                    strokeWidth={todayLabel ? 1.5 : 0}
                  />
                  {todayLabel ? (
                    <SvgText
                      x={xy(bandR, todayDay).x}
                      y={xy(bandR, todayDay).y}
                      fill={c.todayMarker}
                      fontSize={todayLabel.length > 1 ? 9 : 11}
                      fontWeight="700"
                      textAnchor="middle"
                      alignmentBaseline="central"
                    >
                      {todayLabel}
                    </SvgText>
                  ) : (
                    <Circle
                      cx={xy(bandR, todayDay).x}
                      cy={xy(bandR, todayDay).y}
                      r={6}
                      fill={c.todayMarker}
                    />
                  )}
                </>
              )}
            </>
          )}
        </Svg>
      </View>

      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: BAND_STROKE * 2,
        }}
      >
        {children}
      </View>
    </View>
  );
}
