// §11.6 (M10) — shadow tokens only; the §11.2 palette is unchanged. iOS reads the `shadow*`
// properties, Android reads `elevation` — both are set so a card looks the same depth on
// either platform.
export const elevation = {
  card: {
    shadowColor: '#2E2A2C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  raised: {
    shadowColor: '#2E2A2C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
} as const;
