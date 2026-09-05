import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import type { DayCellState } from '../../core/home';

interface StateGlyphProps {
  state: DayCellState;
  /** Glyph colour. Callers pass a value with adequate contrast on the cell fill. */
  color: string;
  /** Nominal box size in px. The droplet fills it; the diamond/dot are smaller. */
  size?: number;
}

/**
 * The second signal for every day-cell state (UI/UX spec §2.8 — "colour is never the only
 * carrier of meaning"). Rendered in the cell's glyph slot beneath the number, and reused by
 * the ring and the 14-day strip. `fertile` and `none` have no glyph.
 */
export function StateGlyph({ state, color, size = 10 }: StateGlyphProps) {
  switch (state) {
    case 'loggedPeriod':
      return <Ionicons name="water" size={size} color={color} />;
    case 'predictedPeriod':
      return <Ionicons name="water-outline" size={size} color={color} />;
    case 'ovulation': {
      const d = size * 0.7;
      return (
        <View
          style={{
            width: d,
            height: d,
            backgroundColor: color,
            transform: [{ rotate: '45deg' }],
          }}
        />
      );
    }
    case 'loggedNoFlow': {
      const d = Math.max(4, size * 0.5);
      return <View style={{ width: d, height: d, borderRadius: d / 2, backgroundColor: color }} />;
    }
    default:
      return null;
  }
}
