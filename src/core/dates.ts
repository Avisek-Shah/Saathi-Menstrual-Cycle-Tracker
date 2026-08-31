/**
 * Pure date-only helpers. §3: all arithmetic in local time, date-only, YYYY-MM-DD strings.
 *
 * Uses date-fns (allowed by §2). `parseISO` reads a date-only string as LOCAL midnight and
 * `format` writes local calendar fields, so there is no UTC round-trip — unlike
 * `new Date(iso).toISOString().slice(0, 10)`, which shifts the day in any timezone east of
 * UTC (the target audience: Nepal UTC+5:45, India UTC+5:30). See DECISIONS.md 2026-08-31.
 *
 * Per CLAUDE.md rule 7 these functions never read the current time; callers pass `today` in.
 */
import {
  addDays as fnsAddDays,
  differenceInCalendarDays,
  format,
  isValid,
  parseISO,
} from 'date-fns';

/** A calendar date with no time component, formatted `YYYY-MM-DD` in the device's local zone. */
export type IsoDate = string;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function toDate(iso: IsoDate): Date {
  if (!ISO_DATE.test(iso)) {
    throw new Error(`Expected a YYYY-MM-DD date string, got: ${JSON.stringify(iso)}`);
  }
  const d = parseISO(iso);
  if (!isValid(d)) {
    throw new Error(`Not a valid calendar date: ${iso}`);
  }
  return d;
}

/** `iso` shifted by `days` (may be negative), returned as a `YYYY-MM-DD` string. */
export function addDays(iso: IsoDate, days: number): IsoDate {
  return format(fnsAddDays(toDate(iso), days), 'yyyy-MM-dd');
}

/** Whole calendar days from `fromIso` to `toIso`. Positive when `toIso` is later. */
export function daysBetween(fromIso: IsoDate, toIso: IsoDate): number {
  return differenceInCalendarDays(toDate(toIso), toDate(fromIso));
}

/** True when `iso` is a syntactically valid `YYYY-MM-DD` calendar date. */
export function isIsoDate(iso: string): boolean {
  return ISO_DATE.test(iso) && isValid(parseISO(iso));
}
