// §11.1 — generous whitespace, rounded corners 12–16px.
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 40,
} as const;

export const radius = {
  control: 12,
  card: 16,
  pill: 999,
} as const;

// §11.4 — minimum touch target.
export const MIN_TOUCH_TARGET = 44;
