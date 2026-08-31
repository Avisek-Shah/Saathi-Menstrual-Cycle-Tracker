// §11.3 — system font, one scale, weights 400 / 600 / 700 only.
// `fontWeight` kept as strings (React Native style convention).
export const typography = {
  hero: { fontSize: 34, fontWeight: '700' },
  title: { fontSize: 24, fontWeight: '700' },
  cardTitle: { fontSize: 18, fontWeight: '600' },
  body: { fontSize: 15, fontWeight: '400' },
  caption: { fontSize: 13, fontWeight: '400' },
} as const;
