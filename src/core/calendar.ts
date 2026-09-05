/**
 * §9 — date formatting for display. Storage and arithmetic stay Gregorian everywhere; only
 * labels change. Pure: `parseISO` + `format` read the given date, never the clock.
 *
 * Bikram Sambat (BS) conversion is done via `nepali-date-converter`. The library's
 * `dateConfigMap` (BS year → month-day counts) is the source of truth for month lengths.
 *
 *   - BS month names come from §9's transliteration, not from the library's `format('MMMM')`,
 *     because the library spells "Asar" / "Aswin" while §9 mandates "Ashadh" / "Ashwin".
 *   - BS→AD for grid layout goes through `new NepaliDate(bsYear, monthIdx0, date).getAD()`,
 *     then we hand the resulting ISO to `date-fns` for weekday / offset.
 *   - AD→BS for labels goes through `NepaliDate.fromAD(jsDate).getBS()`.
 *
 * `getMonthGrid` returns a 7×6 cell list (always 6 rows; weeks may be short) and a header
 * (BS month name in BS mode, AD range as subtitle per §6.3).
 */
import NepaliDate, { dateConfigMap } from 'nepali-date-converter';
import {
  addDays as fnsAddDays,
  format,
  getDaysInMonth,
  getDay,
  parseISO,
} from 'date-fns';

import { addDays, daysBetween, type IsoDate } from './dates';

export type CalendarSystem = 'AD' | 'BS';

export const DEFAULT_DATE_FORMAT = 'd MMM yyyy';

/** §9 — English transliteration, the canonical names used in the UI. */
export const BS_MONTH_NAMES = [
  'Baisakh',
  'Jestha',
  'Ashadh',
  'Shrawan',
  'Bhadra',
  'Ashwin',
  'Kartik',
  'Mangsir',
  'Poush',
  'Magh',
  'Falgun',
  'Chaitra',
] as const;

/** `date-fns` (English) matches our needs; we don't use the library's English formatters for months. */
const AD_FORMAT = 'd MMM yyyy';

/**
 * Display a single ISO date. `fmt` accepts:
 *   - `"d MMM yyyy"` (default), `"d MMMM yyyy"`, etc. — passed through to `date-fns` for AD
 *   - or anything with literal `MMMM` / `MMM` / `YYYY` for BS (the supported BS tokens)
 *
 * For BS we honour the spec transliteration: the BS month name replaces `MMM`/`MMMM` in the
 * template. Years are formatted as 4 digits.
 */
export function formatDate(
  iso: IsoDate,
  system: CalendarSystem = 'AD',
  fmt: string = DEFAULT_DATE_FORMAT,
): string {
  if (system === 'BS') return formatDateBs(iso, fmt);
  return format(parseISO(iso), fmt);
}

function formatDateBs(iso: IsoDate, fmt: string): string {
  const adDate = parseISO(iso);
  const bs = NepaliDate.fromAD(adDate).getBS();
  return renderBsPattern(fmt, bs);
}

/**
 * Single-pass token substitution. Matching all tokens in one `replace` (rather than chained
 * replaces) is deliberate: it never rescans substituted text, so a month name containing a
 * `d` — "Ashadh", "Mangsir" — is not corrupted by a later `d` → day-of-month pass.
 * `getBS().month` is 0-based, so it indexes `BS_MONTH_NAMES` directly.
 */
function renderBsPattern(fmt: string, bs: { year: number; month: number; date: number }): string {
  const monthName = BS_MONTH_NAMES[bs.month] ?? '';
  const monthShort = monthName.slice(0, 3);
  return fmt.replace(/yyyy|YYYY|MMMM|MMM|dd|DD|d|D/g, (token) => {
    switch (token) {
      case 'yyyy':
      case 'YYYY':
        return String(bs.year);
      case 'MMMM':
        return monthName;
      case 'MMM':
        return monthShort;
      case 'dd':
      case 'DD':
        return String(bs.date).padStart(2, '0');
      default: // 'd' | 'D'
        return String(bs.date);
    }
  });
}

/** §6.3 range helper. Collapses shared month/year in AD; in BS shows `Bs - Bs YYYY`. */
export function formatDateRange(
  startIso: IsoDate,
  endIso: IsoDate,
  system: CalendarSystem = 'AD',
): string {
  if (system === 'BS') {
    return `${formatDate(startIso, 'BS')} – ${formatDate(endIso, 'BS')}`;
  }
  const start = parseISO(startIso);
  const end = parseISO(endIso);
  const sameMonth = start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth();
  if (sameMonth) return `${format(start, 'd')}–${format(end, AD_FORMAT)}`;
  const sameYear = start.getFullYear() === end.getFullYear();
  if (sameYear) return `${format(start, 'd MMM')} – ${format(end, AD_FORMAT)}`;
  return `${format(start, AD_FORMAT)} – ${format(end, AD_FORMAT)}`;
}

// ──────────────────────────── Month grid ────────────────────────────

/** A cell in the month grid. `iso` is the storage date (always Gregorian). */
export interface MonthCell {
  /** Date this cell represents. Always a real YYYY-MM-DD in local time, even for filler cells. */
  iso: IsoDate;
  /**
   * 1-based day-of-month in the displayed (AD or BS) month. Fill cells (`fill: true`) carry
   * the real day-of-month of the neighbouring date they represent, not 0 — `leadingFill`/
   * `padToSixRows` below compute it the same way real cells do.
   */
  day: number;
  /** True when the cell is a leading/trailing fill from the previous/next month. */
  fill: boolean;
  /** Day-of-week index (Sun=0..Sat=6) in local time. */
  weekday: number;
}

export interface MonthGrid {
  /** 7×6 cells, row-major. */
  cells: MonthCell[];
  /** The label shown as the title (e.g. "October 2025" or "Poush 2083"). */
  title: string;
  /** The subtitle (e.g. AD date range in BS mode; empty in AD mode). */
  subtitle: string;
  /** True when this month is the one the user is currently living in. */
  isCurrentMonth: boolean;
}

/**
 * Build the 7×6 grid for a single month. `year` and `month` are 1-based for AD. In BS mode
 * they refer to the Bikram Sambat year and the BS month index (1=Baisakh … 12=Chaitra).
 */
export function getMonthGrid(
  year: number,
  month: number,
  system: CalendarSystem,
  today: IsoDate,
): MonthGrid {
  if (system === 'BS') return getMonthGridBs(year, month, today);
  return getMonthGridAd(year, month, today);
}

/**
 * How a fill cell's number is labelled. Fill cells belong to the neighbouring month, so in BS
 * mode they must carry the *BS* day-of-month — labelling them with `Date.getDate()` would
 * put Gregorian numbers in the corners of a BS grid, which is the relabelling §9 forbids.
 */
type DayNumberFn = (iso: IsoDate) => number;

const adDayNumber: DayNumberFn = (iso) => parseISO(iso).getDate();
const bsDayNumber: DayNumberFn = (iso) => NepaliDate.fromAD(parseISO(iso)).getBS().date;

/** Trailing days of the previous month, so the first real day lands on its weekday column. */
function leadingFill(firstIso: IsoDate, firstWeekday: number, dayNumber: DayNumberFn): MonthCell[] {
  const cells: MonthCell[] = [];
  for (let i = 0; i < firstWeekday; i++) {
    const iso = addDays(firstIso, -(firstWeekday - i));
    cells.push({ iso, day: dayNumber(iso), fill: true, weekday: i });
  }
  return cells;
}

/**
 * Pad with the following month's days to a full 6 rows. Always 42 — a fixed height means the
 * grid never reflows as the user swipes between a 5-row and a 6-row month.
 */
function padToSixRows(cells: MonthCell[], dayNumber: DayNumberFn): void {
  while (cells.length < 42) {
    const last = cells[cells.length - 1];
    const iso = addDays(last.iso, 1);
    cells.push({ iso, day: dayNumber(iso), fill: true, weekday: (last.weekday + 1) % 7 });
  }
}

function getMonthGridAd(adYear: number, adMonth1: number, today: IsoDate): MonthGrid {
  // date-fns uses 0-based months internally.
  const adMonth0 = adMonth1 - 1;
  const first = new Date(adYear, adMonth0, 1);
  const firstIso = format(first, 'yyyy-MM-dd');
  const daysInMonth = getDaysInMonth(first);
  const firstWeekday = getDay(first); // Sun=0..Sat=6 — matches §9 "week starts Sunday"

  const cells = leadingFill(firstIso, firstWeekday, adDayNumber);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      iso: format(new Date(adYear, adMonth0, d), 'yyyy-MM-dd'),
      day: d,
      fill: false,
      weekday: (firstWeekday + d - 1) % 7,
    });
  }
  padToSixRows(cells, adDayNumber);

  const todayDate = parseISO(today);
  return {
    cells,
    title: format(first, 'MMMM yyyy'),
    subtitle: '',
    isCurrentMonth: todayDate.getFullYear() === adYear && todayDate.getMonth() === adMonth0,
  };
}

function getMonthGridBs(bsYear: number, bsMonth1: number, today: IsoDate): MonthGrid {
  if (bsMonth1 < 1 || bsMonth1 > 12) {
    // Out of range — caller is responsible for clamping; fail visibly.
    throw new Error(`BS month out of range: ${bsMonth1}`);
  }
  const yearConfig = dateConfigMap[String(bsYear) as keyof typeof dateConfigMap] as
    | Record<string, number>
    | undefined;
  if (!yearConfig) {
    // SPEC: 2026-08-31 — `dateConfigMap` covers 2000..2090 in the installed library. Refuse
    // gracefully for years outside the supported range rather than crashing later.
    throw new Error(`BS year not supported: ${bsYear}`);
  }
  const monthName = BS_MONTH_NAMES[bsMonth1 - 1];
  // `dateConfigMap` keys use the library's spellings ("Asar", "Aswin"), which differ from
  // §9's ("Ashadh", "Ashwin") — but its values are ordered Baisakh→Chaitra, so we index
  // positionally instead of by name.
  const daysInMonth = Object.values(yearConfig)[bsMonth1 - 1];

  // First day of the BS month → its AD equivalent → day-of-week.
  const firstIso = isoForBsDate(bsYear, bsMonth1 - 1, 1);
  const firstWeekday = getDay(parseISO(firstIso));
  // Last day, for the AD subtitle range.
  const lastIso = isoForBsDate(bsYear, bsMonth1 - 1, daysInMonth);

  const cells = leadingFill(firstIso, firstWeekday, bsDayNumber);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      iso: isoForBsDate(bsYear, bsMonth1 - 1, d),
      day: d,
      fill: false,
      weekday: (firstWeekday + d - 1) % 7,
    });
  }
  padToSixRows(cells, bsDayNumber);

  return {
    cells,
    title: `${monthName} ${bsYear}`,
    subtitle: formatDateRange(firstIso, lastIso, 'AD'),
    isCurrentMonth: bsMonth1 === currentBsMonth(today) && bsYear === currentBsYear(today),
  };
}

/** AD → BS conversion. Returns the AD ISO for a given BS date — used to label day-cells. */
function isoForBsDate(bsYear: number, bsMonth0: number, bsDate: number): IsoDate {
  const ad = new NepaliDate(bsYear, bsMonth0, bsDate).getAD();
  return `${ad.year}-${String(ad.month + 1).padStart(2, '0')}-${String(ad.date).padStart(2, '0')}`;
}

/** Today's BS month, 1-based (1=Baisakh … 12=Chaitra). `getBS().month` is 0-based. */
export function currentBsMonth(today: IsoDate): number {
  return NepaliDate.fromAD(parseISO(today)).getBS().month + 1;
}
export function currentBsYear(today: IsoDate): number {
  return NepaliDate.fromAD(parseISO(today)).getBS().year;
}

/**
 * §6.3 — step by one month in the active system. Returns a new (year, month1) pair. Both AD
 * and BS have 12 months, so the modular arithmetic is identical. Negative deltas are allowed.
 */
export function addMonth(
  year: number,
  month1: number,
  delta: number,
): { year: number; month: number } {
  const total = year * 12 + (month1 - 1) + delta;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}

/** §6.3 — month caps at current + 3. Returns [start, end] inclusive, both 1-based month, same year. */
export function monthWindow(
  year: number,
  month1: number,
  today: IsoDate,
  system: CalendarSystem,
): { start: { year: number; month: number }; end: { year: number; month: number } } {
  const current = system === 'BS'
    ? { year: currentBsYear(today), month: currentBsMonth(today) }
    : (() => {
        const d = parseISO(today);
        return { year: d.getFullYear(), month: d.getMonth() + 1 };
      })();
  const end = addMonth(current.year, current.month, 3); // cap
  // Clamp: never allow viewing beyond end.
  if (year > end.year || (year === end.year && month1 > end.month)) {
    return { start: end, end };
  }
  // For swipe start, just return what was asked; the caller clamps navigation.
  return { start: { year, month: month1 }, end };
}

/** Days between today and the first day of the given (year, month) in the chosen system. */
export function daysUntilMonth(
  today: IsoDate,
  year: number,
  month1: number,
  system: CalendarSystem,
): number {
  if (system === 'BS') {
    const first = new NepaliDate(year, month1 - 1, 1);
    const ad = first.getAD();
    const iso = `${ad.year}-${String(ad.month + 1).padStart(2, '0')}-${String(ad.date).padStart(2, '0')}`;
    return daysBetween(today, iso);
  }
  // AD
  const js = `${year}-${String(month1).padStart(2, '0')}-01`;
  return daysBetween(today, js);
}
