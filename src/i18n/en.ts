// §12 — every user-facing string lives here as a flat keyed object. No literals in components.
// English only in v1; a Nepali file is a drop-in sibling later.
export const en = {
  appName: 'Saathi',
  welcome: 'Saathi',
  welcomeSubtitle: 'A private tracker for your cycle. Everything stays on your phone.',
  begin: 'Begin',

  // Home status (§6.2). {days}/{day} filled via `fill`.
  periodIn: 'Period in {days} days',
  periodInOne: 'Period in 1 day',
  onPeriod: 'Day {day} of your period',
  lateBy: '{days} days later than expected',
  expectedAroundNow: 'Expected around now',
  logToday: 'Log today',
  myPeriodStarted: 'My period started',
  fertileWindow: 'Fertile window',
  fertileDisclaimer: 'An estimate. Not reliable as birth control.',
  cycleDay: 'Cycle day {day}',
  confidenceEstimate: 'estimate — keep logging',

  today: 'Today',
  history: 'History',

  // Tab titles (§6).
  home: 'Home',
  calendar: 'Calendar',
  insights: 'Insights',
  settings: 'Settings',
  learn: 'Learn',

  // Placeholder screens — replaced by their milestone (M4–M7).
  comingSoon: 'Coming soon',
  insightsEmptyStats: 'Keep logging to see your patterns (needs 2 or more cycles)',
  settingsCalendarSystem: 'Calendar system',
  settingsNotifications: 'Notifications',

  // Log modal (§6.4).
  logFlow: 'Flow',
  logMood: 'Mood',
  logSymptoms: 'Symptoms',
  logNote: 'Note',
  save: 'Save',
  cancel: 'Cancel',

  // Notifications — must never name the app or cycle terms (§7). Do not edit without §7 review.
  notifReminder: 'Reminder',
  notifBodySoon: "Something's coming up in a few days.",
  notifBodyToday: "Today's the day you're expecting.",
  notifBodyFertile: 'Your window starts today.',
  notifBodyDaily: 'A quick check-in when you have a moment.',
} as const;

export type StringKey = keyof typeof en;

/** Substitute `{name}` tokens: `fill(en.periodIn, { days: 6 })`. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
