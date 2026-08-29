/**
 * Pure date-only helpers — no Date objects escaping, pass today in.
 * SPEC: 2026-08-30 — uses date-fns (allowed by §2), avoids new Date() inside.
 */
export const addDays = (iso: string, days: number): string => {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};
