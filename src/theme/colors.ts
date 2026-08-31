// SPEC: color tokens defined as a flat object so dark mode is a single-file swap (§11.5)
// 2026-08-31 (M10): `primaryMuted`/`fertileMuted` darkened and `ovulationFill` added — see
// §11.2 and DECISIONS.md. Every new/changed value here was checked against WCAG AA (4.5:1)
// for the text colour it actually sits behind, not just picked by eye.
export const colors = {
  bg: '#FFF9FB',
  surface: '#FFFFFF',
  primary: '#E8637C',
  primaryMuted: '#F0A0B6', // was #F9D4DC — darkened for calendar legibility (§11.2)
  fertile: '#7FB3A8',
  fertileMuted: '#9FD0C2', // was #D6E9E4 — darkened for calendar legibility (§11.2)
  ovulation: '#4E8D80',
  // Solid ovulation-day fill (§11.2), paired with white text like `loggedPeriod`. Distinct
  // from `ovulation` (the lighter ring/accent token used elsewhere) because #4E8D80 only
  // reaches 3.86:1 against white — below the 4.5:1 floor §11.4 requires for the day number.
  ovulationFill: '#3A6A5F',
  text: '#2E2A2C',
  textMuted: '#7C7378',
  border: '#F0E4E8',
  warning: '#D9A441',
} as const;
