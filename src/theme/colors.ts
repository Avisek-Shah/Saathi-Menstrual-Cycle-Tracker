// Palette — UI/UX spec §2.8 (adopted 2026-09-06, see DECISIONS.md). Menstruation stays rose;
// fertility moved off green onto the blue-violet axis so the scheme survives red-green colour
// blindness. Three token sets: light (active), dark (defined, wired in M13), colourBlind
// (monochrome + glyph — swapped by the `color_blind_mode` setting via `useColors()`).
//
// Contrast: every arc/fill is checked against the card it sits on — 3:1 minimum for non-text
// arcs (WCAG 1.4.11), 4.5:1 for text pairings (1.4.3). Deviations from the spec's raw hex:
//   - `fertile` light: spec #8B9DE8 is only 2.62:1 on #FFFFFF (fails the 3:1 arc bar).
//     Darkened within-hue to #8091D6 → 3.02:1. (A4, 2026-09-06.)
//   - `periodLogged` #D64C6E gives white text 4.27:1 — AA-large only. Day-cell / ring digits
//     on it render at weight 600, which clears the 3:1 large-text bar. Hero text never sits
//     on this fill (it's on `surface`/`bg`).

export interface Palette {
  bg: string;
  surface: string;
  /** Alias of `periodLogged` — primary buttons, tab accent, selection. */
  primary: string;
  periodLogged: string;
  /** 40% fill for predicted period; always paired with the dashed border below. */
  periodPredicted: string;
  periodPredictedBorder: string;
  fertile: string;
  ovulation: string;
  /** Ring luteal remainder and empty track. */
  neutralTrack: string;
  todayMarker: string;
  text: string;
  textMuted: string;
  border: string;
  warning: string;
  /** Legacy — selected flow-button surface in the log sheet. Pending M12 rework. */
  primaryMuted: string;
  onPrimaryMuted: string;
}

export const paletteLight: Palette = {
  bg: '#FFF9FB',
  surface: '#FFFFFF',
  primary: '#D64C6E',
  periodLogged: '#D64C6E',
  periodPredicted: '#F2A9BC',
  periodPredictedBorder: '#D64C6E',
  fertile: '#8091D6', // darkened from spec #8B9DE8 for the 3:1 arc bar — see header
  ovulation: '#4A5BAF',
  neutralTrack: '#E8E1E3',
  todayMarker: '#1F1A1C',
  text: '#2E2A2C',
  textMuted: '#7C7378',
  border: '#F0E4E8',
  warning: '#D9A441',
  primaryMuted: '#050505ff',
  onPrimaryMuted: '#FFFFFF',
};

// Defined now so M13 is a wiring change, not a colour-picking one (§11.5). Not yet reachable.
export const paletteDark: Palette = {
  bg: '#141013',
  surface: '#1E1A1C',
  primary: '#F1809B',
  periodLogged: '#F1809B',
  periodPredicted: '#8E5566',
  periodPredictedBorder: '#F1809B',
  fertile: '#A8B6F0',
  ovulation: '#7B8AD6',
  neutralTrack: '#3A3335',
  todayMarker: '#FFFFFF',
  text: '#F2EDEF',
  textMuted: '#A79DA2',
  border: '#332D30',
  warning: '#E6B860',
  primaryMuted: '#F2EDEF',
  onPrimaryMuted: '#1E1A1C',
};

// §2.8 "monochrome + glyph scheme". The three period/fertile/ovulation fills collapse to
// three grey levels; the droplet / droplet-outline / diamond / dot glyphs (see StateGlyph)
// carry the distinction. Chrome (`primary`) goes near-black.
export const paletteColorBlind: Palette = {
  bg: '#FFF9FB',
  surface: '#FFFFFF',
  primary: '#2E2A2C',
  periodLogged: '#2E2A2C',
  periodPredicted: '#9E9599',
  periodPredictedBorder: '#2E2A2C',
  fertile: '#D7D0D3',
  ovulation: '#000000',
  neutralTrack: '#E8E1E3',
  todayMarker: '#1F1A1C',
  text: '#2E2A2C',
  textMuted: '#7C7378',
  border: '#F0E4E8',
  warning: '#8A6D2B',
  primaryMuted: '#2E2A2C',
  onPrimaryMuted: '#FFFFFF',
};

/**
 * The active palette for code that still imports a static object. New cycle-visual code
 * should use `useColors()` so the colour-blind (and later dark) swap reaches it.
 */
export const colors: Palette = paletteLight;
