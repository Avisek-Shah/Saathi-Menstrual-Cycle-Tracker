/**
 * §9 — date formatting for display. Storage and arithmetic stay Gregorian everywhere; only
 * labels change. Pure: `parseISO` + `format` read the given date, never the clock.
 *
 * M5 adds the Bikram Sambat branch (via `nepali-date-converter`) and `getMonthGrid`. Until
 * then `calendar_system` defaults to 'AD' and only the AD path is exercised.
 */
import { format, parseISO } from 'date-fns';

export type CalendarSystem = 'AD' | 'BS';

export const DEFAULT_DATE_FORMAT = 'd MMM yyyy';

export function formatDate(
  iso: string,
  system: CalendarSystem = 'AD',
  fmt: string = DEFAULT_DATE_FORMAT,
): string {
  if (system === 'BS') {
    // M5: convert via nepali-date-converter. For now fall through to AD.
  }
  return format(parseISO(iso), fmt);
}

/** "12–16 Aug 2025" style range, collapsing shared month/year. */
export function formatDateRange(startIso: string, endIso: string, system: CalendarSystem = 'AD'): string {
  const start = parseISO(startIso);
  const end = parseISO(endIso);
  if (system === 'AD') {
    const sameMonth = start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth();
    if (sameMonth) return `${format(start, 'd')}–${format(end, 'd MMM yyyy')}`;
    const sameYear = start.getFullYear() === end.getFullYear();
    if (sameYear) return `${format(start, 'd MMM')} – ${format(end, 'd MMM yyyy')}`;
  }
  return `${formatDate(startIso, system)} – ${formatDate(endIso, system)}`;
}
