import { useMemo } from 'react';

import { useSettingsStore } from '../stores/useSettingsStore';
import type { Palette } from './colors';
import { resolvePalette } from './palette';

/**
 * The active palette for the current viewer. Swaps to the monochrome scheme when
 * `color_blind_mode` is on (UI/UX spec §2.8). M13 adds the light/dark axis here — the call
 * sites do not change.
 */
export function useColors(): Palette {
  const colorBlind = useSettingsStore((s) => s.settings.color_blind_mode);
  return useMemo(() => resolvePalette({ scheme: 'light', colorBlind }), [colorBlind]);
}
