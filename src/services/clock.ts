/**
 * The one place the app reads the real "now". `src/core/*` must never do this (CLAUDE.md
 * rule 7) — screens and stores get today from here and pass it into the pure functions.
 * §3: "today" is local device time, date-only.
 */
export function todayIso(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function currentYear(): number {
  return new Date().getFullYear();
}
