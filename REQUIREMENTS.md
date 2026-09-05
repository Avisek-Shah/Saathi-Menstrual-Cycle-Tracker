# Saathi — Menstrual Cycle Tracker

## Product & Engineering Requirements (v1)

---

## 0. How to use this document

This is the complete build specification for v1. Build in the milestone order given in `BUILD_PLAN.md`. Where this document specifies an algorithm, schema, or enum, implement it exactly — do not substitute an equivalent. Where something is genuinely unspecified, follow §18 and pick the simplest option, then record it in `DECISIONS.md`.

---

## 1. Product summary

A privacy-first Android app (React Native + Expo) for tracking menstrual cycles, logging daily flow/mood/symptoms, and predicting upcoming periods and fertile windows. Data lives entirely on the device. There is no account, no server, and no network calls for user data.

- **Primary audience:** women in Nepal and South Asia
- **Distribution:** direct APK to a small private group. Not published to Play Store in v1.
- **Platforms:** Android first. iOS must remain buildable from the same codebase — no Android-only APIs without a documented fallback.

### Goals

1. A user can answer "when is my next period?" in under two seconds of opening the app.
2. Logging a day takes three taps or fewer.
3. Predictions improve as the user logs, and the app is honest about how confident it is.
4. Nothing about the app forces a user to reveal to someone else that she is tracking her cycle.

### Non-goals for v1 (do not build)

- Accounts, login, cloud sync, or any backup
- Pregnancy mode, contraception/pill tracking, partner sharing
- Any analytics, crash reporting, ads, or third-party SDK that transmits data
- Multi-language UI (English only — but see §12 on i18n readiness)

---

## 2. Tech stack

| Concern        | Choice                                              | Notes                                                        |
| -------------- | --------------------------------------------------- | ------------------------------------------------------------ |
| Framework      | Expo (managed workflow), latest stable SDK          |                                                              |
| Language       | TypeScript, `strict: true`                          |                                                              |
| Navigation     | `expo-router` with a bottom tab layout              |                                                              |
| Local DB       | `expo-sqlite`                                       | Source of truth for all user data                            |
| State          | `zustand`                                           | One store per domain; DB access only via repositories (§4.4) |
| Dates          | `date-fns`                                          | All arithmetic in local time, date-only                      |
| BS calendar    | `nepali-date-converter`                             | Display conversion only                                      |
| Charts         | `react-native-gifted-charts` (+ `react-native-svg`) |                                                              |
| Notifications  | `expo-notifications`                                | Local scheduled only, never remote                           |
| Secure storage | `expo-secure-store`                                 | PIN hash only                                                |
| Safe areas     | `react-native-safe-area-context`                    | Insets for status bar, notch, and gesture nav (§11.6)        |
| Gestures       | `react-native-gesture-handler`                      | Calendar month swipe, day sheet drag                         |
| Motion         | `react-native-reanimated`                           | Short transitions only (§11.7)                               |
| Build          | EAS Build, `preview` profile producing an APK       |                                                              |
| Updates        | `expo-updates` via EAS Update                       | JS changes ship OTA; native changes need a new APK           |

Most libraries in this table are installed. (In Sep 2026, unused libraries like `expo-notifications`, `expo-secure-store`, and `react-native-gifted-charts` were removed during an audit — add them back only if their features are actively built). The M10 UX pass (§16) adds **no new dependency** — safe areas, gestures, motion, and the cycle ring all use packages Expo already pulls in.

### Hard constraints

- No `fetch`/`axios`/XHR anywhere in the app for user data. The only permitted network traffic is the Expo updates check.
- No permission requests beyond notifications.
- The app must be fully functional in airplane mode from first launch onward.

---

## 3. Domain rules

**Read before writing any code.** These definitions govern every calculation in the app.

- **Cycle day 1** = the first day of a period.
- **Cycle length** = number of days from one period's start to the next period's start. A cycle only exists once a _following_ period has started.
- **Period length** = number of consecutive days of bleeding within one period.
- **Ovulation (estimated)** = predicted next period start − 14 days (fixed luteal phase assumption). 14 days is the standard calendar-method figure — average luteal phase is 12–14 days ([Cleveland Clinic](https://my.clevelandclinic.org/health/articles/24417-luteal-phase)) and calendar predictors conventionally use 14 ([Mayo Clinic Press](https://mcpress.mayoclinic.org/pregnancy/finding-your-fertility-window/)).
- **Fertile window (estimated)** = ovulation − 5 days through ovulation + 1 day — **7 days inclusive**. (Corrected 2026-08-31: this range was previously mislabeled "6 days inclusive" in this document; the code always computed 7. See DECISIONS.md.) This matches consumer clinical guidance of "5 days before ovulation, plus the day of, plus the day after" ([Hopkins Medicine](https://www.hopkinsmedicine.org/health/wellness-and-prevention/calculating-your-monthly-fertility-window)); ASRM's stricter committee-opinion figure is a 6-day window ending at ovulation with no day after ([ASRM 2022](https://www.asrm.org/practice-guidance/practice-committee-documents/optimizing-natural-fertility-a-committee-opinion-2021/)) — both appear in the literature, and this app uses the 7-day figure.
- **Valid cycle length** = 21–45 days inclusive. Anything outside this is stored but excluded from averages (§5.3). This is a data-quality bound, not a clinical "normal" claim — ACOG's own definition of a _normal_ cycle is 21–35 days ([Cleveland Clinic summarizing ACOG](https://my.clevelandclinic.org/health/diseases/14633-abnormal-menstruation-periods)), narrower than the app's 21–45. The wider band here exists so a real cycle outside the textbook range (common with PCOS or perimenopause) still contributes to the visible history — it is simply excluded from the _average_, not hidden.
- **Valid period length** = 1–10 days inclusive.
- All dates are stored as `YYYY-MM-DD` strings in **Gregorian**, in the device's local timezone. Bikram Sambat exists only at the presentation layer. **Never store a BS date.**
- "Today" is computed once per render pass from local device time. Handle the app being left open across midnight by re-checking on app foreground.

---

## 4. Data model

### 4.1 Tables

```sql
-- One row per calendar day the user has logged anything.
CREATE TABLE daily_logs (
  date        TEXT PRIMARY KEY,              -- 'YYYY-MM-DD'
  flow        TEXT NOT NULL DEFAULT 'none',  -- FlowLevel enum
  moods       TEXT NOT NULL DEFAULT '[]',    -- JSON array of Mood enum
  symptoms    TEXT NOT NULL DEFAULT '[]',    -- JSON array of Symptom enum
  note        TEXT,                          -- free text, max 500 chars
  created_at  INTEGER NOT NULL,              -- epoch ms
  updated_at  INTEGER NOT NULL
);
CREATE INDEX idx_daily_logs_flow ON daily_logs(flow);

-- Derived, never edited by the user directly. Rebuilt by recomputePeriods().
CREATE TABLE periods (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  start_date    TEXT NOT NULL UNIQUE,
  end_date      TEXT NOT NULL,
  length_days   INTEGER NOT NULL,
  cycle_length  INTEGER,                     -- days to NEXT period's start; NULL for most recent
  is_outlier    INTEGER NOT NULL DEFAULT 0   -- 1 if cycle_length outside 21-45
);

-- Key/value app settings.
CREATE TABLE settings (
  key    TEXT PRIMARY KEY,
  value  TEXT NOT NULL
);
```

### 4.2 Enums

```ts
type FlowLevel = 'none' | 'spotting' | 'light' | 'medium' | 'heavy';

type Mood =
  'happy' | 'calm' | 'energetic' | 'sad' | 'anxious' | 'irritable' | 'sensitive' | 'low_energy';

type Symptom =
  | 'cramps'
  | 'headache'
  | 'backache'
  | 'bloating'
  | 'breast_tenderness'
  | 'acne'
  | 'nausea'
  | 'fatigue'
  | 'cravings'
  | 'constipation'
  | 'diarrhea'
  | 'insomnia'
  | 'dizziness'
  | 'spotting_between';
```

Enum values are stable identifiers. Display labels come from the string table (§12) — never render the raw enum value.

### 4.3 Settings keys and defaults

| Key                      | Type                       | Default   |
| ------------------------ | -------------------------- | --------- |
| `onboarding_complete`    | boolean                    | `false`   |
| `birth_year`             | number                     | —         |
| `reported_cycle_length`  | number                     | `28`      |
| `reported_period_length` | number                     | `5`       |
| `calendar_system`        | `'AD' \| 'BS'`             | `'AD'`    |
| `pin_enabled`            | boolean                    | `false`   |
| `notif_period_soon`      | boolean                    | `true`    |
| `notif_period_soon_days` | number                     | `2`       |
| `notif_period_today`     | boolean                    | `true`    |
| `notif_fertile_start`    | boolean                    | `false`   |
| `notif_daily_log`        | boolean                    | `false`   |
| `notif_daily_log_time`   | `'HH:mm'`                  | `'20:00'` |
| `schema_version`         | number                     | `1`       |
| `irregular_notice_seen`  | boolean                    | `false`   |
| `onboarding_seed_range`  | JSON `{start,end}` or null | `null`    |
| `log_explainer_seen`     | boolean                    | `false`   |
| `quick_log_enabled`      | boolean                    | `true`    |

`onboarding_seed_range` records exactly which days onboarding seeded as flow. It exists so a later change to the last-period date (§6.7) can remove precisely those days instead of guessing which flow the user entered herself. `log_explainer_seen` gates the one-time explainer on the log screen (§6.4). `quick_log_enabled` hides the Home quick-log row (§6.2) for a user who does not want it.

### 4.4 Access rules

All SQL lives in `src/db/repositories/*`. UI and stores call repository functions only. No component contains a query string. Every write goes through a repository function that also calls `recomputePeriods()` when flow data changed.

### 4.5 Deriving periods from logs

`recomputePeriods()` runs after any change to `daily_logs.flow`. It is deterministic and rebuilds the `periods` table from scratch:

1. Select all dates where `flow != 'none'`, ascending.
2. Group into runs. A new run starts when the gap from the previous flow day is **more than 2 days**. (A one- or two-day gap mid-period is treated as part of the same period — real cycles have light days.)
3. For each run: `start_date` = first day, `end_date` = last day, `length_days` = inclusive day count.
4. Discard any run whose `length_days > 10` **only** for averaging purposes — still store it, mark `is_outlier = 1`.
5. For each period except the last, `cycle_length` = days from its `start_date` to the next period's `start_date`. Set `is_outlier = 1` if that value is outside 21–45.
6. Wrap the whole rebuild in a transaction.

> **Consequence to respect:** `daily_logs.flow` is the single source of truth. "Period started today" is a shortcut that writes `flow = 'medium'` for today. There is no separate period-editing UI.

---

## 5. Prediction engine

Implement in `src/core/prediction.ts` as pure functions taking `Period[]` and `settings` and returning a `Prediction` object. No DB access, no dates from `new Date()` inside — pass `today` in. This file must be unit-testable and unit-tested.

### 5.1 Output shape

```ts
type Confidence = 'low' | 'medium' | 'high';

interface Prediction {
  avgCycleLength: number; // rounded, 21-45
  avgPeriodLength: number; // rounded, 1-10
  nextPeriodStart: string; // 'YYYY-MM-DD'
  nextPeriodEnd: string;
  predictionWindow: number; // ± days of uncertainty (see 5.5)
  ovulationDate: string;
  fertileStart: string;
  fertileEnd: string;
  confidence: Confidence;
  isIrregular: boolean;
  cyclesUsed: number; // how many real cycles fed the average
}
```

### 5.2 Weighted average (the core)

Take the most recent **6** non-outlier cycles, newest first. Apply descending weights `[6, 5, 4, 3, 2, 1]`, truncated to the number of cycles available:

```
avgCycleLength = round( Σ(cycleLength_i × weight_i) / Σ(weight_i) )
```

Clamp the result to 21–45. Compute `avgPeriodLength` the same way from the last 6 period lengths, clamped 1–10.

Recent cycles dominate deliberately: a woman whose cycle is shifting should see the app follow her, not average her against six months ago.

### 5.3 Outlier exclusion

Cycles marked `is_outlier` are excluded from the average entirely but still appear in history and charts (visually marked). If excluding outliers leaves fewer than 2 cycles, fall back to §5.4.

### 5.4 Cold start

| Non-outlier cycles available | Behaviour                                                                                                                | Confidence |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------- |
| 0                            | Use `reported_cycle_length` / `reported_period_length` from onboarding. Anchor to last period start given at onboarding. | `low`      |
| 1                            | Blend: `round(0.5 × observed + 0.5 × reported)`                                                                          | `low`      |
| 2–3                          | Weighted average of observed only                                                                                        | `medium`   |
| 4+ and not irregular         | Weighted average of observed only                                                                                        | `high`     |
| 4+ and irregular             | Weighted average of observed only                                                                                        | `medium`   |

### 5.5 Irregularity detection

Using the last 6 non-outlier cycles, mark `isIrregular = true` if **either**:

- the standard deviation of cycle lengths is **> 7 days**, or
- `max − min` across those cycles is **≥ 9 days**.

(This 7–9 day band is not arbitrary — it mirrors ACOG's own definition of irregular: "cycle length varies by more than 7 to 9 days" ([Cleveland Clinic summarizing ACOG](https://my.clevelandclinic.org/health/diseases/14633-abnormal-menstruation-periods)).)

Also set `isIrregular = true` if any of the last 3 cycles was an outlier (outside 21–45).

`predictionWindow` (the ± shown to the user):

- `high` confidence → `1`
- `medium` → `3`
- `low` → `5`
- `isIrregular` → add `2` to the above, capped at `7`

### 5.6 What irregularity changes in the UI

- The home screen shows a **range** ("around Oct 12–16") instead of a single date.
- The fertile window card is rendered at reduced prominence with the text "less reliable when cycles vary".
- A dismissible card appears once per irregular detection: neutral wording, no diagnosis, no condition names, no alarm. Copy: _"Your recent cycles have varied quite a bit. That's common, and it just means predictions here are rough estimates."_ Nothing more.
- **Never** name a medical condition, never say "you should see a doctor", never suggest a cause. The app describes its own uncertainty, not the user's body.

### 5.7 Late periods

If `today > nextPeriodStart` and no flow has been logged since:

- Days 1–`predictionWindow` past: home shows "Expected around now".
- Beyond that: "N days later than expected" with a neutral tone.
- At 45 days since last period start: show a one-time card offering to reset the prediction anchor ("My cycle has changed — recalculate"), which simply forces the prediction to re-anchor on the last logged period.
- **Never auto-log a period the user did not enter.**

### 5.8 Recalculation triggers

Recompute on: app foreground, any flow log write, any onboarding value change, midnight rollover while the app is open. Cache the result in the Zustand store; it is cheap enough to recompute fully each time.

---

## 6. Screens

Bottom tabs: **Home · Calendar · Insights · Settings**. Logging is a modal reached from Home and Calendar, not a tab.

### 6.1 Onboarding (first launch only)

Five steps, swipeable, with a skip on the last. Progress dots in the footer, beside the navigation buttons.

**Every answer step accepts two input methods for the same value: quick-choice chips and a typed field.** A chip fills the field; typing clears the chip selection. Neither is required — a step is satisfied by whichever the user touches. Validation is inline, beneath the field, and never blocks with a dialog.

1. **Welcome** — one screen, name of app, one sentence on what it does, one sentence stating that data stays on the phone.
2. **Last period start date** — chips for Today, Yesterday, 3 days ago, 1 week ago, 2 weeks ago; a **Pick a date** control opening an in-app month grid (the same grid component as §6.3, honouring `calendar_system`); and "I'm not sure", which sets the anchor to `today − reported_cycle_length`. Dates in the future or more than 90 days ago are not selectable.
3. **Typical cycle length** — chips 26 / 28 / 30 / 32, a numeric field accepting 21–45, and the horizontal number picker. An "I don't know" option keeps 28.
4. **Typical period length** — chips 3 / 4 / 5 / 6 / 7, a numeric field accepting 1–10, and the picker. Default 5.
5. **Birth year** — a 4-digit numeric field plus decade chips, range `currentYear − 60` to `currentYear − 9`. Used only for age-appropriate copy in Insights; never displayed back as an age. Skippable.

**Out-of-range or non-numeric input** shows the valid range beneath the field and leaves the last valid value in place. It never silently clamps behind the user's back.

**Footer.** Back, progress dots, and Next sit in a footer that clears the system navigation bar per §11.6. On the last step Next becomes Finish. The footer must never be overlapped by the gesture bar, and its controls are at least 48px tall — an unreachable Next button is the single most damaging failure in the app, because it blocks first launch entirely.

On finish: write settings, seed `daily_logs` with flow for the reported last period (start date through `start + reported_period_length − 1`, flow `medium`), record that seeded range in `onboarding_seed_range`, run `recomputePeriods()`, set `onboarding_complete = true`, schedule notifications.

**Every answer collected here is stored and editable afterwards from Settings → My cycle (§6.7).** Onboarding is not a one-time irreversible interview.

### 6.2 Home

Vertical scroll. In order:

1. **Status card** (the hero, ~40% of the first viewport)
   - Large: days until next period ("Period in **6 days**"), or during a period "Day **3** of your period", or when late "**2 days** later than expected".
   - Beneath: the predicted date, formatted per `calendar_system`, with `± window` shown as a range when window > 1.
   - Cycle day indicator: "Cycle day 17".
   - Confidence pill: `low` shows "estimate — keep logging"; `medium` and `high` show nothing. Only surface confidence when it's low enough to matter.
2. **Primary action button** — context-aware:
   - Not on a period → "Log today"
   - No log for today and a period is expected → "My period started"
   - On a period → "Log today"
3. **Quick-log row** — at most five one-tap chips that write immediately without opening a modal: the flow level (when on a period) and the user's most-used recent symptoms. A tap **merges** into today's existing log — it never replaces mood, symptoms, or a note already saved for that day. Tapping a selected chip removes that value again. Hidden when `quick_log_enabled` is false.
4. **This week strip** — 7 day-circles (3 before today, today, 3 after) each colour-coded by state (§11.2), tappable to open the log modal for that date.
5. **Fertile window card** — dates, days-until, and the line: _"An estimate. Not reliable as birth control."_ This line is not dismissible and is always present on this card.
6. **Today's log summary** — if logged, a compact chip row of flow/mood/symptoms with an edit affordance; if not, an empty prompt.

### 6.3 Calendar

- Month grid, **swipe horizontally between months**, cannot scroll past current month + 3 (predictions beyond that are meaningless). Arrow controls do the same thing for a user who does not swipe; both respect the cap.
- **The month shown when the tab opens is the current month in the active calendar system, derived from today's date.** Never a hardcoded year/month constant. Switching AD ↔ BS re-derives it.
- **Today is always ringed** (§11.2), in both AD and BS mode. A **Today** control returns to the current month whenever the view has moved away from it.
- Each day cell shows its state colour and a small dot if anything was logged. The selected day carries a ring distinct from today's.
- Header switches between AD and BS labels per setting; in BS mode, show the BS month name as the title and the AD range as a subtitle. The title and the legend each appear exactly once.
- **Tapping any day opens the day sheet** (§6.3.1) — this is the primary way to log from the calendar.
- Legend row beneath the grid.

#### 6.3.1 Day sheet

A bottom sheet for one tapped day, showing in order:

1. The date in the active calendar system.
2. One state line: period day _N_, predicted period, fertile window, ovulation estimate, or nothing predicted.
3. What is already logged that day — flow, mood and symptom chips, note excerpt — or an empty prompt.
4. **One-tap flow buttons**, writing immediately and merging like the quick-log row (§6.2).
5. **Edit full log**, opening the log modal (§6.4) for that date.

For a **future** date the sheet is read-only: prediction detail, nothing loggable (§10.1).

### 6.4 Log modal (bottom sheet, full height)

Header shows the date being logged, and the screen asks the day's question rather than naming a feature. Sections, in order:

1. **Flow** — five options, single select, laid out as large labelled buttons with icons of increasing weight. This is the first and most prominent thing on the screen, because it is the only input that changes a prediction. Selecting `none` clears the day's flow.
2. **Add more** — a disclosure revealing mood, symptoms, and note. Collapsed by default; expanded automatically when the day already has any of them saved.
   - **Mood** — chips, multi-select, no limit.
   - **Symptoms** — chips, multi-select, grouped loosely (pain / body / digestion) but without visible group headers.
   - **Note** — collapsed by default; expands to a 500-char text area, kept clear of the keyboard.

The **enums in §4.2 do not change.** This section governs presentation only; every mood and symptom stays available.

**One-time explainer.** The first time this screen opens, a small card above the flow section explains in two sentences what logging is for: flow days become periods, periods become the prediction, and mood and symptoms are kept for the user's own reference. It says plainly that nothing here is required. Gated by `log_explainer_seen`; once dismissed it never returns.

Save and cancel in the header. Save writes `daily_logs`, triggers `recomputePeriods()`, recomputes predictions, and reschedules notifications. Optimistic UI: close immediately, write in the background, and if the write fails show a toast and reopen with the values preserved.

**Three-tap requirement:** open modal → tap flow → tap save. The disclosure must not add a tap to this path.

### 6.5 Insights

Five sections, each in a card, in order:

1. **Cycle overview** (M10) — the single glanceable summary: last period (dates + length), next period (date or range), ovulation date, fertile window (dates), and where today sits in the current cycle ("Cycle day N"). Every value is read straight from the `Period[]` / `Prediction` §5 already computes — no new calculation, just one clear place all of it is shown together, so a user does not have to piece it together from Home and the calendar. Low confidence shows the same "estimate — keep logging" note as Home.
2. **Stats** — average cycle length, average period length, number of cycles tracked (shortest/longest cycle stats were cut from the UI for brevity). When fewer than 2 cycles exist, show a "keep logging to see your patterns" state instead of zeros.
3. **Charts**
   - _Cycle length over time_: bar chart, one bar per completed cycle, most recent 12. Horizontal line at the user's average. Outlier bars in a muted colour.
   - _Period length over time_: bar chart, same window.
   - _Symptom frequency_: horizontal bars, top 6 symptoms by count over the last 90 days.
   - Every chart needs an explicit empty state with the minimum data required stated ("needs at least 2 completed cycles").
4. **Cycle history** — list, newest first: start date, end date, period length, cycle length, outlier badge. Tapping a row jumps the Calendar tab to that month.
5. **Journal** — the readable record of what was logged, newest first, grouped by month. Each row: the date per `calendar_system`, a flow marker, mood and symptom chips, and the first line of any note. Tapping a row opens that day's log modal. Loads a page at a time rather than the whole history. Its empty state names what would appear here, so the section explains itself before there is any data in it.

### 6.6 Learn (accessible from Insights, not a tab)

Six static articles, bundled as local markdown/JSON, no network:

1. What actually happens during a cycle
2. What a "normal" cycle looks like (and how wide that range is)
3. Understanding your flow
4. Common symptoms and why they happen
5. How this app predicts your period
6. When cycles are irregular

Article 5 must plainly explain the algorithm in §5 in non-technical language, including that the fertile window is an estimate based on an assumption, not a measurement.

Tone: calm, factual, non-clinical, no euphemisms. Written for an adult reader who may not have had formal sex education. No condition names, no diagnostic language, no treatment suggestions.

### 6.7 Settings

- **My cycle** — every answer given during onboarding (§6.1), editable at any time, using the same chips-plus-typed-field controls:
  - typical cycle length (21–45)
  - typical period length (1–10)
  - birth year, or cleared
  - **last period start date** — see the re-seed rule below
  - calendar system (AD / BS toggle)
- Notifications (each toggle from §4.3, plus a time picker for the daily reminder)
- App lock (PIN — see §8)
- Quick-log row on Home (`quick_log_enabled`)
- Export data (writes a JSON file via the share sheet — a manual user action, not backup, and explicitly not restored by the app in v1)
- Delete all data (double confirmation; the second dialog is a hold-to-confirm button)
- About — version, and the full disclaimer text:

> _"Saathi is a tracking tool, not a medical device. Predictions are estimates based on the dates you log. They are not reliable as contraception and are not medical advice."_

**Changing the last period start date (the re-seed rule).** Editing this value is not a silent rewrite of history:

1. Show a confirmation naming what will change. Nothing is written until it is accepted.
2. Clear flow **only** on days that are inside `onboarding_seed_range` **and** carry no mood, symptom, or note. A day the user has touched herself is never cleared; her flow entries outside the seeded range are never touched.
3. Seed flow `medium` for `newStart … newStart + reported_period_length − 1`.
4. Run `recomputePeriods()` and overwrite `onboarding_seed_range` with the new range.

This stays inside the rule that the app never auto-logs a period the user did not enter: the seed is her own onboarding answer, and this is her correcting it.

Editing typical cycle or period length writes settings only. It changes predictions on the next recompute (§5.8) and never writes to `daily_logs`.

---

## 7. Notifications

All local, scheduled with `expo-notifications`. Android channel: name `Reminders`, importance default, no custom sound.

| Setting               | Timing                                                 | Title      | Body                                       |
| --------------------- | ------------------------------------------------------ | ---------- | ------------------------------------------ |
| `notif_period_soon`   | `notif_period_soon_days` before predicted start, 09:00 | `Reminder` | `Something's coming up in a few days.`     |
| `notif_period_today`  | Predicted start date, 09:00                            | `Reminder` | `Today's the day you're expecting.`        |
| `notif_fertile_start` | Fertile window start, 09:00                            | `Reminder` | `Your window starts today.`                |
| `notif_daily_log`     | Daily at `notif_daily_log_time`                        | `Reminder` | `A quick check-in when you have a moment.` |

The words "period", "cycle", "fertile", and the app name must not appear in any notification title or body. Someone glancing at the lock screen learns nothing.

**Rescheduling:** cancel all and reschedule after every prediction recompute and on app foreground. Never schedule more than 4 notifications at a time. Skip any notification whose fire time is in the past.

**Permissions:** Android 13+ requires a runtime `POST_NOTIFICATIONS` request. Ask for it the first time a user enables a reminder — never on launch.

---

## 8. App lock (PIN)

- Optional, off by default. 4-digit numeric.
- Store `SHA-256(pin + salt)` and the salt in `expo-secure-store`. Never store the PIN itself, never in SQLite or AsyncStorage.
- Lock triggers when the app has been backgrounded for **more than 30 seconds**, and on cold start.
- Lock screen: numeric keypad, no app branding, no hint about what the app is.
- After 5 wrong attempts, a 30-second lockout, doubling each subsequent 5 failures.
- **No recovery.** When enabling the PIN, a dialog must state plainly: forgetting it means reinstalling and losing all data. Require an explicit acknowledgement tap.
- Disabling the PIN requires entering the current PIN.
- The app icon and app name are **not** disguised in v1 — but keep the display name neutral: `Saathi`, not "Period Tracker".

---

## 9. Bikram Sambat calendar

- Toggle in settings, default AD.
- Conversion at render time only, via `nepali-date-converter`, wrapped in `src/core/calendar.ts` exposing `formatDate(iso, system, format)` and `getMonthGrid(year, month, system)`.
- All pickers, all storage, all arithmetic remain Gregorian. Only labels change.
- BS month names in English transliteration: Baisakh, Jestha, Ashadh, Shrawan, Bhadra, Ashwin, Kartik, Mangsir, Poush, Magh, Falgun, Chaitra.
- **The calendar grid in BS mode must re-grid to BS months** — do not just relabel Gregorian months. Nepali months have 29–32 days; the converter handles this, so drive the grid from it.
- Week starts Sunday in both modes.

---

## 10. Edge cases the build must handle

1. Logging flow on a future date — blocked at the UI level.
2. Logging a period start immediately after one ended (gap ≤ 2 days) — merges into the existing period per §4.5. This is correct behaviour, not a bug.
3. Deleting all flow from a day, leaving mood/symptoms — the log row stays, `recomputePeriods()` re-runs, periods may split or vanish.
4. A single day of flow — valid period of length 1.
5. Zero cycles ever logged (user skipped everything) — every screen must render; predictions run in `low` confidence from defaults.
6. A gap of six months with no logs — predictions still anchor on the last real period; home shows the late state, not a crash or a negative countdown.
7. Device timezone or clock changes — recompute on foreground; never store timestamps for date logic, only date strings.
8. Very long note text and long symptom lists — nothing overflows or truncates the save button.
9. DB migration path — `schema_version` in settings, with a migration runner in `src/db/migrate.ts` even though v1 has only one version. **Do not skip this.**
10. Changing the last period start date after onboarding — follow the re-seed rule in §6.7. Days the user logged herself survive it.
11. Gesture-navigation and cutout devices — no interactive control may sit inside a system inset (§11.6). Verify on a phone with gesture navigation, not only on an emulator with three-button navigation.
12. Today falling outside the displayed month — the calendar always offers a one-tap return to the current month (§6.3).
13. A day with mood or symptoms but no flow, opened from the journal — it renders as a normal entry; the journal is not a period list.

---

## 11. Design

### 11.1 Direction

Soft, conventional period-app aesthetic. Warm and calm, not clinical, not childish. Rounded corners (12–16px), generous whitespace, one accent colour used sparingly for emphasis rather than everywhere.

### 11.2 Palette

| Token           | Hex       | Use                                                   |
| --------------- | --------- | ----------------------------------------------------- |
| `bg`            | `#FFF9FB` | App background                                        |
| `surface`       | `#FFFFFF` | Cards                                                 |
| `primary`       | `#E8637C` | Period days, primary buttons                          |
| `primaryMuted`  | `#F0A0B6` | Predicted period days                                 |
| `fertile`       | `#7FB3A8` | Fertile window (accent use, e.g. card text)           |
| `fertileMuted`  | `#9FD0C2` | Fertile window fill                                   |
| `ovulation`     | `#4E8D80` | Ovulation accent (non-fill uses)                      |
| `ovulationFill` | `#3A6A5F` | Ovulation day-cell solid fill, paired with white text |
| `text`          | `#2E2A2C` | Primary text                                          |
| `textMuted`     | `#7C7378` | Secondary text                                        |
| `border`        | `#F0E4E8` | Dividers                                              |
| `warning`       | `#D9A441` | Outlier / irregular markers                           |

**Day-cell states:** logged period (`primary` fill, white text), predicted period (`primaryMuted` fill), fertile (`fertileMuted` fill), ovulation (`ovulationFill` — solid, white text, same treatment as a logged period), today (2px `text` ring, layered over any other state), logged-but-no-flow (small `textMuted` dot). (Revised 2026-08-31 — ovulation previously shared `fertileMuted` with a thin ring; the ring was too subtle to read as informational at a glance, so ovulation now gets its own solid colour the way a logged period does. See DECISIONS.md.)

Every fill/text pairing on this page is checked against WCAG AA (4.5:1) for the text colour it actually sits behind, not picked by eye — see the comment above the `colors` object in `src/theme/colors.ts`.

Colour must never be the only carrier of meaning — every state also has a shape, ring, or dot.

### 11.3 Type

System font. Scale: 34 (hero number), 24 (screen title), 18 (card title), 15 (body), 13 (caption). Weights 400/600/700 only.

### 11.4 Accessibility

- Minimum touch target 44×44.
- `accessibilityLabel` on every icon-only control.
- Support OS font scaling up to 200% without clipping — test the Home status card specifically.
- Text contrast ≥ 4.5:1 against its background.

### 11.5 Dark mode

Not in v1. But define all colours as tokens in `src/theme/colors.ts` so a dark palette is a single-file addition later.

### 11.6 Layout and safe areas

- Every screen renders through **one shared wrapper** that applies `useSafeAreaInsets()`. No screen positions its own content against the raw window.
- The status bar, notch, and gesture bar are treated as occupied space: a title never starts at `y = 0`, and a button never ends at the bottom edge.
- The bottom tab bar adds `insets.bottom` to its height; modals add `insets.top` to their header.
- Any fixed footer adds `insets.bottom` plus normal spacing, and its controls are at least 48px tall.
- Touch targets stay at 44×44 minimum (§11.4). A control that looks reachable but is not is a functional bug, not a polish item.

### 11.7 Motion

- Transitions are 200 ms or shorter, and animate opacity and translation only — never layout, colour, or size in a way that shifts text.
- Motion is never the only signal for a state change; the state is legible with animation disabled.
- Honour the OS reduce-motion setting: when it is on, transitions resolve immediately.
- No looping, decorative, or attention-seeking animation anywhere in the app.

---

## 12. Copy and i18n readiness

English only in v1, but **all user-facing strings live in `src/i18n/en.ts`** as a flat keyed object. No string literals in components. This makes the Nepali translation a one-file addition later without touching the UI.

Tone rules for all copy:

- Second person, warm, plain. No exclamation marks in status text.
- No euphemisms for menstruation in the UI body ("your period", not "that time").
- No cheerleading, no emoji in system copy.
- Never imply the user did something wrong by not logging.

---

## 13. Project structure

```
src/
  app/                    # expo-router routes
    (tabs)/
      index.tsx           # Home
      calendar.tsx
      insights.tsx
      settings.tsx
      _layout.tsx
    onboarding/
    learn/
    log/[date].tsx        # modal
    lock.tsx
    _layout.tsx
  core/
    prediction.ts         # §5 — pure, fully unit-tested
    periods.ts            # §4.5 recompute logic — pure
    calendar.ts           # AD/BS formatting
    dates.ts              # date-only helpers
  db/
    schema.ts
    migrate.ts
    client.ts
    repositories/
      dailyLogs.ts
      periods.ts
      settings.ts
  stores/
    useCycleStore.ts
    useSettingsStore.ts
  services/
    notifications.ts
    lock.ts
    export.ts
  components/
    ui/                   # Button, Card, Chip, Sheet, NumberPicker
    cycle/                # StatusCard, WeekStrip, DayCell, MonthGrid, FertileCard
    charts/
  theme/
    colors.ts
    typography.ts
    spacing.ts
  i18n/
    en.ts
  content/
    articles/             # the 6 Learn articles
```

---

## 14. Testing

Jest with `@testing-library/react-native`. The following must have unit tests before the feature is considered done:

**`prediction.ts`**

- Weighted average correctness
- Clamping at 21 and 45
- Each cold-start tier (0, 1, 2–3, 4+ cycles)
- Irregularity thresholds at the exact boundaries (sd of 7.0 vs 7.1; range of 8 vs 9)
- The `predictionWindow` table, including the irregular +2 and the cap at 7
- Late-period states at day 1, day `window`, day `window+1`, day 45

**`periods.ts`**

- Run grouping with gaps of 0, 1, 2, and 3 days
- Single-day periods
- A period at the very start and very end of the dataset
- Outlier flagging at 20, 21, 45, 46 days

**`calendar.ts`**

- Known AD↔BS date pairs, including a BS month with 32 days
- `currentBsYear` / `currentBsMonth` against known dates — the calendar's opening month depends on them (§6.3)

**`onboarding.ts`** (M10)

- Numeric input parsing: empty, non-numeric, below range, above range, valid
- Quick date choices resolve to the right ISO dates for a given `today`
- Re-seed planning: days carrying mood/symptom/note are excluded from the clear list; the new seed range is correct at period lengths 1 and 10

**`quickLog.ts`** (M10)

- A quick toggle merges into an existing log and never drops moods, symptoms, or a note
- Tapping a selected chip removes only that value

**`journal.ts`** (M10)

- Month grouping is newest-first in both AD and BS, and a month boundary falls where the active system says it does

**Fixtures.** Provide `scripts/seed.ts` generating three datasets:

1. A regular 28-day user with 8 cycles
2. An irregular user with cycles of 24/38/26/41/29/35
3. A brand-new user with only onboarding data

Every UI state must be reachable from one of these.

---

## 15. Acceptance criteria

v1 is done when all of these are true:

- [ ] Fresh install completes onboarding and lands on Home with a sensible prediction from zero logged data
- [ ] Logging today's flow takes three taps from Home and Home updates immediately
- [ ] After logging 3+ periods, the predicted date shifts to reflect the weighted recent average
- [ ] An irregular fixture user sees a date range, not a single date, and sees the neutral variation card exactly once
- [ ] The fertile-window card always shows the "not reliable as birth control" line
- [ ] Switching to BS re-grids the calendar to Nepali months with correct day counts and correct month lengths
- [ ] Notifications fire on schedule and no notification text contains "period", "cycle", "fertile", or the app name
- [ ] Enabling a PIN locks the app after 30s in background and on cold start; the no-recovery warning is acknowledged before it activates
- [ ] Airplane mode from first launch: every feature works
- [ ] Delete all data returns the app to a true first-launch state
- [ ] The app builds an installable APK via EAS `preview` profile
- [ ] No network request originates from the app other than the Expo update check
- [ ] 200% OS font scale does not clip the Home status card
- [ ] On a phone with gesture navigation, every onboarding step's Next button is fully visible and responds to the first tap
- [ ] No screen title is obscured by the status bar on a device with a notch or punch-hole camera
- [ ] Every onboarding answer can be typed as well as chosen, and every one of them can be changed later from Settings → My cycle
- [ ] Changing the last period start date re-seeds correctly and destroys no day the user logged herself
- [ ] In BS mode the calendar opens on the current Nepali month with today ringed, and the Today control returns to it from any month
- [ ] Tapping any day in the calendar opens the day sheet; a one-tap flow from that sheet updates the grid immediately
- [ ] The journal in Insights lists a day logged moments earlier, newest first
- [ ] Insights → Cycle overview shows last period, next period, ovulation, and fertile window together in one card, matching Home's own numbers exactly

---

## 16. Milestones

Full detail in `BUILD_PLAN.md`. Summary:

| Milestone | Contents                                                                                                                                                                                                       |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **M0**    | Expo + TS + expo-router scaffold, theme tokens, i18n file, tab shell                                                                                                                                           |
| **M1**    | SQLite client, schema, migration runner, repositories, seed script                                                                                                                                             |
| **M2**    | `periods.ts` and `prediction.ts` as pure modules **with unit tests passing**                                                                                                                                   |
| **M3**    | Onboarding flow, writing real settings and seed logs                                                                                                                                                           |
| **M4**    | Home (status card, week strip, fertile card) + log modal end-to-end                                                                                                                                            |
| **M5**    | Calendar with AD/BS toggle                                                                                                                                                                                     |
| **M6**    | Insights: stats, three charts, cycle history                                                                                                                                                                   |
| **M7**    | Settings, notifications, PIN lock, export, delete-all                                                                                                                                                          |
| **M8**    | Learn articles                                                                                                                                                                                                 |
| **M9**    | Edge cases (§10), accessibility pass, EAS APK build, expo-updates wiring                                                                                                                                       |
| **M10**   | UX pass: safe areas (§11.6), onboarding input + editable profile (§6.1, §6.7), calendar day sheet and swipe (§6.3), Home quick-log (§6.2), log reframe (§6.4), journal + cycle overview (§6.5), motion (§11.7) |

M2 before M4 is deliberate — the prediction logic is the product, and it should be correct in isolation before any screen depends on it.

---

## 17. Explicitly out of scope

Accounts · cloud sync · backup/restore · pregnancy mode · contraception or pill tracking · partner sharing · temperature/BBT · weight logging · sexual activity logging · Nepali UI translation · dark mode · Play Store release · analytics of any kind · widgets · wearable integration.

Do not build these "while you're in there." Each one is a v2 decision.

---

## 18. Open decisions for the developer

Where this document is silent, prefer: fewer dependencies, simpler state, and behaviour that fails visibly rather than silently. Log any assumption you make as a `// SPEC:` comment at the point of the decision, and add a line to `DECISIONS.md`.
