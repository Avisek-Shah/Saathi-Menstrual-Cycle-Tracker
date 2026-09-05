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
  insightsAvgCycle: 'Average cycle',
  insightsAvgPeriod: 'Average period',
  insightsDays: '{n} days',
  insightsCyclesUsed: 'Based on {n} cycles',
  settingsCalendarSystem: 'Calendar system',
  settingsNotifications: 'Notifications',

  // Insights → Cycle overview (§6.5, M10) — the single glanceable summary the user asked for:
  // last period, next period, ovulation, fertile window, cycle day, all in one place.
  overviewTitle: 'Cycle overview',
  overviewLastPeriod: 'Last period',
  overviewNextPeriod: 'Next period',
  overviewOvulation: 'Ovulation',
  overviewCycleDayLabel: 'Cycle day',
  overviewNoPeriodYet: 'Not logged yet',

  // Insights → Journal (§6.5, M10).
  insightsJournalTitle: 'Journal',
  journalEmpty: 'Days you log will show up here, newest first.',
  journalLoadMore: 'Load more',
  journalNothingLogged: 'Nothing logged',

  // Settings (§6.7, M10 rebuild).
  settingsMyCycleSection: 'My cycle',
  settingsMyCycleRow: 'Cycle length, period length, birth year, last period',
  settingsAppSection: 'App',
  settingsAppLock: 'App lock',
  settingsQuickLog: 'Quick-log on Home',
  settingsDataSection: 'Data',
  settingsExportData: 'Export data',
  settingsDeleteAllData: 'Delete all data',
  settingsAboutSection: 'About',
  settingsNotBuiltYet: 'Not available yet',
  settingsVersion: 'Version {version}',
  settingsVersionUnknown: 'Version unavailable',
  settingsOn: 'On',
  settingsOff: 'Off',
  settingsNotifPeriodSoon: 'Period reminder',
  settingsNotifPeriodToday: 'Day-of reminder',
  settingsNotifFertileStart: 'Fertile window reminder',
  settingsNotifDailyLog: 'Daily check-in reminder',
  settingsNotifCaption: 'Saved now; scheduled reminders arrive with a later update.',

  // Settings → My cycle (§6.7).
  profileTitle: 'My cycle',
  profileCycleLength: 'Typical cycle length',
  profilePeriodLength: 'Typical period length',
  profileBirthYear: 'Birth year',
  profileBirthYearCleared: 'Not set',
  profileClear: 'Clear',
  profileLastPeriodStart: 'Last period start',
  profileLastPeriodStartUnset: 'Not recorded',
  profileChangeDate: 'Change date',
  profileSave: 'Save',
  profileSaved: 'Saved',
  // The re-seed confirmation (§6.7, §10.10) — states plainly what will and won't change.
  profileAnchorConfirmTitle: 'Change last period start?',
  profileAnchorConfirmBody:
    'This updates the days used to predict your next period. Any day you logged yourself is kept exactly as you entered it.',
  profileAnchorConfirmAction: 'Change it',

  // Onboarding (§6.1). {n} filled via `fill`.
  onboardingWelcomeTitle: 'Saathi',
  onboardingWelcomeWhat:
    'Track your cycle, and see when your next period and fertile window are likely.',
  onboardingWelcomePrivacy:
    'Everything you enter stays on this phone. There is no account and nothing is sent anywhere.',
  onboardingStartTitle: 'When did your last period start?',
  onboardingStartHelp: 'Pick the day the bleeding began, or type it in.',
  onboardingStartNotSure: "I'm not sure",
  onboardingStartToday: 'Today',
  onboardingStartYesterday: 'Yesterday',
  onboardingStart3DaysAgo: '3 days ago',
  onboardingStart1WeekAgo: '1 week ago',
  onboardingStart2WeeksAgo: '2 weeks ago',
  onboardingPickDate: 'Pick a date',
  onboardingHideDate: 'Hide date picker',
  onboardingCycleTitle: 'How long is your typical cycle?',
  onboardingCycleHelp:
    'Count from the first day of one period to the first day of the next. Most are 24 to 35 days. Type it in, or choose a number below.',
  onboardingCycleUnit: '{n} days',
  onboardingDontKnow: "I don't know",
  onboardingPeriodTitle: 'How many days does your period usually last?',
  onboardingPeriodHelp:
    'Count the days you have any bleeding. Type it in, or choose a number below.',
  onboardingBirthYearTitle: 'Which year were you born?',
  onboardingBirthYearHelp:
    'Used only to tailor a few tips. It is never shown back as your age. Type it in, or choose a year below.',
  onboardingBack: 'Back',
  onboardingNext: 'Next',
  onboardingSkip: 'Skip',
  onboardingFinish: 'Finish',
  onboardingEditableLater: 'You can change any of this later from Settings → My cycle.',
  numberFieldEmpty: 'Enter a number to continue',
  numberFieldNotANumber: 'Enter a whole number',
  numberFieldOutOfRangeCycle: 'Enter a number between {min} and {max} days',
  numberFieldOutOfRangeYear: 'Enter a year between {min} and {max}',

  // Home (§6.2). {a}/{b}/{days} filled via `fill`.
  predictedOn: 'around {date}',
  predictedRange: 'around {a} – {b}',
  fertileInDays: 'in {days} days',
  fertileToday: 'today',
  fertileStartedDaysAgo: 'started {days} days ago',
  fertileIrregularNote: 'less reliable when cycles vary',
  homeQuickLogLabel: 'Quick log',
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
  logHeaderQuestion: 'How was today?',
  logExplainerBody:
    'Flow days become periods, and periods become the prediction. Mood and symptoms are just for your own reference. None of this is required.',
  logFlow: 'Flow',
  logAddMore: 'Add more',
  logHideMore: 'Hide',
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

  // Calendar (§6.3). Legend labels mirror the §11.2 day-cell states.
  legendPeriod: 'Period',
  legendPredicted: 'Predicted',
  legendFertile: 'Fertile',
  legendOvulation: 'Ovulation',
  legendLogged: 'Log (no flow)',
  legendToday: 'Today',
  calendarPrevMonth: 'Previous month',
  calendarNextMonth: 'Next month',
  // Visible glyphs for the prev/next month controls — accessibilityLabel carries the real
  // name (§11.4); these are decoration, but rule 6 keeps every rendered character here too.
  calendarPrevGlyph: '‹',
  calendarNextGlyph: '›',
  numberFieldPlaceholder: '—',
  // Future-date detail (§6.3) — shown instead of the log modal.
  futureNotLoggable: "This day hasn't happened yet.",
  futurePredictedPeriod: 'Your period is predicted around this day.',
  futureFertile: 'This day is in your estimated fertile window.',
  futureOvulation: 'Ovulation is estimated on this day.',
  futureNothing: 'Nothing is predicted for this day.',
  close: 'Close',
  calendarToday: 'Today',

  // Day sheet (§6.3.1).
  dayStatePeriodDay: 'Day {n} of this period',
  daySheetNothingLogged: 'Nothing logged this day',
  daySheetEditFull: 'Edit full log',

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
