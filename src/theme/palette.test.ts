import { describe, expect, it } from '@jest/globals';

import { paletteColorBlind, paletteDark, paletteLight } from './colors';
import { resolvePalette } from './palette';

describe('resolvePalette', () => {
  it('returns the light palette by default', () => {
    expect(resolvePalette({ scheme: 'light', colorBlind: false })).toBe(paletteLight);
  });

  it('returns the dark palette when scheme is dark', () => {
    expect(resolvePalette({ scheme: 'dark', colorBlind: false })).toBe(paletteDark);
  });

  it('colour-blind mode overrides both schemes', () => {
    expect(resolvePalette({ scheme: 'light', colorBlind: true })).toBe(paletteColorBlind);
    expect(resolvePalette({ scheme: 'dark', colorBlind: true })).toBe(paletteColorBlind);
  });

  it('every palette exposes the same keys', () => {
    const keys = Object.keys(paletteLight).sort();
    expect(Object.keys(paletteDark).sort()).toEqual(keys);
    expect(Object.keys(paletteColorBlind).sort()).toEqual(keys);
  });
});
