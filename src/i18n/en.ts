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

  // Onboarding (§6.1). {n} filled via `fill`.
  onboardingWelcomeTitle: 'Saathi',
  onboardingWelcomeWhat: 'Track your cycle, and see when your next period and fertile window are likely.',
  onboardingWelcomePrivacy: 'Everything you enter stays on this phone. There is no account and nothing is sent anywhere.',
  onboardingStartTitle: 'When did your last period start?',
  onboardingStartHelp: 'Pick the day the bleeding began.',
  onboardingStartNotSure: "I'm not sure",
  onboardingCycleTitle: 'How long is your typical cycle?',
  onboardingCycleHelp: 'Count from the first day of one period to the first day of the next. Most are 24 to 35 days.',
  onboardingCycleUnit: '{n} days',
  onboardingDontKnow: "I don't know",
  onboardingPeriodTitle: 'How many days does your period usually last?',
  onboardingPeriodHelp: 'Count the days you have any bleeding.',
  onboardingBirthYearTitle: 'Which year were you born?',
  onboardingBirthYearHelp: 'Used only to tailor a few tips. It is never shown back as your age.',
  onboardingBack: 'Back',
  onboardingNext: 'Next',
  onboardingSkip: 'Skip',
  onboardingFinish: 'Finish',

  // Home (§6.2). {a}/{b}/{days} filled via `fill`.
  predictedOn: 'around {date}',
  predictedRange: 'around {a} – {b}',
  fertileInDays: 'in {days} days',
  fertileToday: 'today',
  fertileStartedDaysAgo: 'started {days} days ago',
  fertileIrregularNote: 'less reliable when cycles vary',
  todaysLog: "Today's log",
  logSummaryEmpty: 'Nothing logged today',
  edit: 'Edit',
  // §5.6 — exact copy, do not change without §5.6 review.
  irregularNoticeBody:
    "Your recent cycles have varied quite a bit. That's common, and it just means predictions here are rough estimates.",
  dismiss: 'Dismiss',
  // §5.7 day-45 card.
  recalcTitle: 'My cycle has changed — recalculate',
  recalcBody: 'Re-anchor the prediction on your most recent period.',
  recalcAction: 'Recalculate',

  // Log modal (§6.4).
  logFlow: 'Flow',
  logMood: 'Mood',
  logSymptoms: 'Symptoms',
  logNote: 'Note',
  logAddNote: 'Add a note',
  logNotePlaceholder: 'Anything you want to remember about today',
  logNoteCount: '{n} / 500',
  logFutureBlocked: "This day hasn't happened yet.",
  save: 'Save',
  cancel: 'Cancel',
  saveFailedTitle: "Couldn't save",
  saveFailedBody: 'Your entry is still here. Try again?',
  retry: 'Retry',

  // FlowLevel labels (§4.2). Never render the raw enum value.
  flow_none: 'None',
  flow_spotting: 'Spotting',
  flow_light: 'Light',
  flow_medium: 'Medium',
  flow_heavy: 'Heavy',

  // Mood labels (§4.2).
  mood_happy: 'Happy',
  mood_calm: 'Calm',
  mood_energetic: 'Energetic',
  mood_sad: 'Sad',
  mood_anxious: 'Anxious',
  mood_irritable: 'Irritable',
  mood_sensitive: 'Sensitive',
  mood_low_energy: 'Low energy',

  // Symptom labels (§4.2).
  symptom_cramps: 'Cramps',
  symptom_headache: 'Headache',
  symptom_backache: 'Backache',
  symptom_bloating: 'Bloating',
  symptom_breast_tenderness: 'Breast tenderness',
  symptom_acne: 'Acne',
  symptom_nausea: 'Nausea',
  symptom_fatigue: 'Fatigue',
  symptom_cravings: 'Cravings',
  symptom_constipation: 'Constipation',
  symptom_diarrhea: 'Diarrhea',
  symptom_insomnia: 'Insomnia',
  symptom_dizziness: 'Dizziness',
  symptom_spotting_between: 'Spotting between periods',

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
