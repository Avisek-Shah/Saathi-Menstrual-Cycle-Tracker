// Pure palette resolution — UI/UX spec §2.8, §10. No React, no store access; `useColors()`
// feeds it the current settings. Kept separate from `colors.ts` so it is unit-testable.
import { type Palette, paletteColorBlind, paletteDark, paletteLight } from './colors';

export type Scheme = 'light' | 'dark';

export interface PaletteInput {
  scheme: Scheme;
  colorBlind: boolean;
}

/**
 * Colour-blind mode wins over the light/dark choice — it is a distinct monochrome scheme,
 * not a variant of either. Dark wiring lands in M13; until then `scheme` is always `'light'`.
 */
export function resolvePalette({ scheme, colorBlind }: PaletteInput): Palette {
  if (colorBlind) return paletteColorBlind;
  return scheme === 'dark' ? paletteDark : paletteLight;
}
