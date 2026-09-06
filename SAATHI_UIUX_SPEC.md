# Saathi — UI/UX & Implementation Spec

> **For the implementing agent.** This is a review-and-rebuild spec for an existing Expo / React Native menstrual cycle tracker. It contains diagnosed bugs, design decisions with rationale, exact copy strings, colour tokens, and acceptance criteria. Work through `§13 Build order` top to bottom. Do not skip P0 items.
>
> **Status:** adopted as the UI/UX authority on 2026-09-06 (`DECISIONS.md`). Maps to milestones M11–M13 in `BUILD_PLAN.md` §6c. The prediction engine (`REQUIREMENTS.md` §5) is affirmed correct by §1 below and is not changed. Some §1 items were already fixed in the shipped build (no floating FAB; one date model on Home); they are no-ops now.

---

## 0. Project context

| | |
|---|---|
| **App** | Saathi — menstrual cycle tracker |
| **Stack** | Expo managed React Native |
| **Data** | Device-only. No backend, no accounts, no cloud sync |
| **Platform** | Android first, iOS later from the same codebase |
| **Distribution** | Direct APK to a small private group. Not Play Store |
| **Audience** | Nepal / South Asia. English-only UI in v1 |
| **Calendars** | Gregorian (AD) + Bikram Sambat (BS) toggle |
| **v1 scope** | Period tracking, fertility/ovulation prediction, daily flow/mood/symptom logging, charts, cycle history, educational content |

**Constraints that shape every decision below:**

1. No backend means **export is the only backup path**. A lost phone is total data loss.
2. Device-only storage means **app lock is the entire security model**, not a nice-to-have.
3. Menstruation carries real stigma in parts of Nepal. Discretion (app lock, app-switcher hiding, neutral icon) is a functional requirement, not polish.
4. Nepal is **UTC+05:45**. Any date stored as a UTC timestamp will be wrong. See `§11.4`.

**Tone rules that apply to all copy in this app:**

- Address the user as `you`. Never `women`, `girls`, `ladies`.
- Never `normal` / `abnormal`. Use `typical for you` / `different from your usual`.
- Never moralise: no `You forgot to log!`, no `Great job!`, no streaks.
- Never celebrate. No confetti, no badges. Logging a period is not an achievement.
- Never volunteer pregnancy, testing, or "possible causes" for a late period.
- Correlation language only in insights: `most often`, `tends to`. Never `causes`.

---

## 1. Diagnosis of the current build

**The prediction engine is correct.** Given last period 20 Aug and a 30-day cycle, it produces: next period 19 Sep, ovulation 5 Sep, fertile window 31 Aug – 6 Sep, cycle day 18 on 6 Sep. All internally consistent. **Every bug below is a presentation bug.**

| # | Bug | Where | Priority |
|---|---|---|---|
| 1 | Ring numbers 1–30 are **calendar dates**, but users read them as **cycle days**. Home says "Cycle day 18" while the today-marker sits at ring position 6 | Home | P0 |
| 2 | Cycle phases clip at month boundaries — the 31 Aug portion of the fertile window has nowhere to render on a September ring | Home | P0 |
| 3 | Ring silently changes meaning on the 1st of each month | Home | P0 |
| 4 | **Three conflicting "next period" answers.** Home card: `14–24 Sep`. Calendar: `19–23` grey cells. Ring: pink arc starting ~19 and running past 24 | Home + Calendar | P0 |
| 5 | `Next period 14–24 Sep` reads as *"my period will last 11 days"*. It is actually a ±5-day confidence interval rendered as if it were the flow | Home | P0 |
| 6 | Countdown uses the point estimate (19 Sep → "13 days") while the subline uses the interval. Two mental models on one card | Home | P0 |
| 7 | Predicted period days render **grey**. Grey universally means *disabled*. The most important prediction in the app looks switched off | Calendar | P0 |
| 8 | Legend says `Predicted ⚫ black` but cells render grey. Predicted period is also visually identical to `Log (no flow)` | Calendar | P0 |
| 9 | Floating gear FAB overlaps content on every screen. On Settings it physically covers the `Quick-log on Home` toggle | All | P0 |
| 10 | Four notification toggles animate to "on" but do nothing — `Saved now; scheduled reminders arrive with a later update` | Settings | P0 |
| 11 | `App lock — Not available yet`, greyed out | Settings | P0 |
| 12 | Predicted period block uses the Settings period length (5) instead of the logged median. August's logged period was 20–26 = 7 days | Calendar | P1 |
| 13 | Pink + green is the worst possible pair for red-green colour blindness (~8% of males, ~0.5% of females) | All | P1 |
| 14 | Three separate `Save` buttons on one settings sheet plus a global `Cancel`. Commit model is unclear | Settings | P1 |
| 15 | Three Home stat cards (Cycle day / Next period / Ovulation) duplicate the ring; no focal point | Home | P1 |
| 16 | Insights `Cycle overview` duplicates Home and contains no charts | Insights | P1 |
| 17 | Journal entries show bare tags (`Medium`) with no cycle-day context | Insights | P1 |
| 18 | Hero text wraps to two lines and crowds the inner ring edge | Home | P1 |
| 19 | `An estimate. Not reliable as birth control.` is the last line of a below-fold card | Home | P1 |

---

## 2. Cycle visualization — full spec

### 2.1 Decision: hybrid (ring + linear strip)

**Ring as hero, 14-day linear strip beneath it, calendar tab for browsing.** Three views, three jobs, no overlap.

**Why a ring at all** — it is the only form that conveys *cyclicality* and *"where am I right now"* instantly, and it matches the established mental model (Flo, Clue, Apple Health).

**Where a ring fails, and what compensates:**

| Ring weakness | Compensation |
|---|---|
| Hard arc edges assert precision you don't have | Feathered gradient ends on predicted arcs (`§2.4`) |
| Closed shape — no room when a period is late | Dashed overflow arc on an outer radius (`§2.7 D`) |
| Poor at reading exact dates | The linear strip below (`§2.6`) |
| Arc length compares durations badly | Bar chart in Insights (`§5`) |

**Rejected:** pure linear timeline as hero (loses cyclicality, reads clinical); four-quadrant clinical phase wheel (follicular/luteal are education, not glance-level info).

### 2.2 Decision: cycle-relative, never calendar-synced

Ring day 1 = first day of the **current cycle**, not the 1st of the month.

| | Calendar-month ring (current) | Cycle-relative ring (build this) |
|---|---|---|
| Ring length | 28–31, changes monthly | User's predicted cycle length |
| "Cycle day 18" | Not represented | Is the marker's position |
| Phase crossing a month boundary | Clipped, invisible | Always fully visible |
| Meaning of 12 o'clock | Arbitrary (the 1st) | Period start |
| Ring reshapes when | Every month, for no reason | Only when the length estimate changes |

**Also reject a fixed 28.** Resolve cycle length in this order:

1. Median of the last 6 logged cycles — once `loggedCycles >= 3`
2. The value in Settings — when `loggedCycles` is 1–2
3. `28` — zero cycles, and flagged internally as a default

### 2.3 Ring geometry

```
Anchor:        cycle day 1 at 12 o'clock  (-90° in SVG coordinate space)
Direction:     clockwise
Degrees/day:   360 / L        where L = resolved cycle length
Diameter:      240dp
Band stroke:   14dp
Progress:      4dp, drawn on an inner radius (band_r - 12)
```

**Four layers, outermost first:**

1. **Phase band** (14dp) — menstruation arc, fertile arc, neutral luteal remainder.
2. **Ovulation** — a single notch/dot on the band, **not a wide arc**. It is one estimated day; a fat arc overstates the confidence.
3. **Elapsed stroke** (4dp, inner radius) — thin progress line from day 1 to today. Keeping progress on a separate radius stops it fighting the phase colours for the same pixels. This is the main reason the current ring is hard to parse.
4. **Today marker** — filled dot with a background-coloured halo. Always the highest-contrast element on the screen.

**No numerals on the rim.** Numbers around the ring are the root cause of the current ambiguity, and 30 numerals at 240dp are below comfortable read size. Four subtle ticks (day 1 + phase boundaries) are sufficient.

### 2.4 Uncertainty rendering

Establish and hold this visual grammar everywhere in the app:

> **Solid, saturated, hard-edged = it happened.**
> **Soft, desaturated, feathered = we are guessing.**

Predicted arcs get an SVG `linearGradient` fading each end over ±(confidence width in days). Logged arcs get hard edges and full saturation.

### 2.5 Ring centre — max 3 lines

```
eyebrow  13sp muted      →  Cycle day 18
hero     28sp semibold   →  Period in ~13 days
chip     12sp pill       →  estimate
```

Cap the hero at `fontScale 1.3` inside the ring; let overflow go to the strip below.

**The hero string is phase-dependent.** This is the largest single comprehension win:

| State | Eyebrow | Hero |
|---|---|---|
| Menstruating | `Cycle day 3` | `Day 3 of your period` |
| Post-period | — | `Cycle day 9` |
| Fertile window | `Cycle day 15` | `Fertile window · day 3 of 6` |
| Ovulation day | `Cycle day 17` | `Ovulation likely today` |
| Luteal | `Cycle day 18` | `Period in ~13 days` |
| Late, 1–7 days | `Cycle day 33` | `No period logged yet` |
| Late, 8+ days | `Cycle day 40` | `Predictions paused` |
| No data | — | `Log your period to start` |

### 2.6 The 14-day linear strip

Horizontally scrollable, today at ~35% from the left so recent past stays visible while the future dominates.

```
 Mon  Tue  Wed  Thu  Fri  Sat  Sun  Mon
  4    5    6    7    8    9   10   11
  ◐    ◉    ●    ○    ○    ○    ○    ○
      ovul today
```

Per column: weekday, date, one status glyph, a small dot if a log exists. Tapping a column opens that day's log sheet. **This is where dates live** — it makes the ring's abstraction safe, because anyone confused by the circle has a literal answer 100px below it.

### 2.7 Edge cases — all must be handled

**A. First-time user, zero logged cycles (but onboarding data exists)**
- Render all predicted arcs at low opacity with heavily feathered ends
- Hero: `Period in ~13 days`, chip: `Based on what you told us`
- Never show a bare number without `~` until `loggedCycles >= 3`

**B. No data at all**
- Do **not** render an empty ring — a hollow circle reads as broken
- Ghost ring at 15% opacity, centred CTA: `When did your last period start?` + date picker

**C. Irregular cycles** — tier on the standard deviation of logged cycle lengths:

| σ | Behaviour |
|---|---|
| `< 3 days` | Point estimate. `Period in 13 days` |
| `3–7 days` | Tilde + range on tap. `Period in ~13 days` |
| `> 7 days` | **No point estimate at all.** `Period expected 16–24 Sep`, and widen the feathered arc to match |

A 12-day-wide interval displayed as "in 13 days" is a lie the user will catch — and once she catches it she stops trusting the ovulation estimate too.

**D. Late period** — the most emotionally loaded state in the app.
- Ring stops advancing. Today-marker parks at the day-1 boundary
- Draw a **dashed overflow arc** on a slightly larger radius, growing one day at a time. Visually honest, no wrap-around
- Eyebrow keeps counting: `Cycle day 33`
- Hero: `No period logged yet`. **Not** `You're late!`, not `⚠️ Overdue`
- On day 2 of late, inline prompt: `Did your period start?  [Yes, log it]  [Not yet]`
- **Never** surface pregnancy, testing, or possible causes unprompted
- Day 8+: freeze the ring. `Predictions paused until you log your next period.`

**E. Long gap** — no log for 60+ days: pause all predictions, show one re-anchor card: `It's been a while. When did your last period start?` Do not accumulate 60 phantom cycle days.

**F. Retroactive edits** — if a logged start contradicts a prediction, silently re-anchor the whole chain and re-render. Never show a "your prediction was wrong" state. The past is always ground truth.

**G. Period length mismatch** — once `loggedPeriods >= 2`, use the **median logged duration** for the predicted block, not the Settings value.

### 2.8 Colour tokens

The current pink-vs-green palette collapses under deuteranopia. Keep rose for menstruation (culturally correct, unambiguous), move fertility to the blue-violet axis.

```js
export const cycleColors = {
  periodLogged:     { light: '#D64C6E', dark: '#F1809B' },
  periodPredicted:  { light: '#F2A9BC', dark: '#8E5566' }, // + dashed border
  fertile:          { light: '#8B9DE8', dark: '#A8B6F0' },
  ovulation:        { light: '#4A5BAF', dark: '#7B8AD6' },
  neutralTrack:     { light: '#E8E1E3', dark: '#3A3335' },
  todayMarker:      { light: '#1F1A1C', dark: '#FFFFFF' },
};
```

**Never encode by colour alone.** Every state carries at least two of: hue, luminance, texture, glyph.

| State | Hue | Fill | Texture | Glyph |
|---|---|---|---|---|
| Logged period | Rose | Solid | — | Droplet |
| Predicted period | Rose | 40% | Dashed border | Droplet outline |
| Fertile | Periwinkle | 25% | — | — |
| Ovulation | Indigo | Solid | — | Small diamond |
| Logged, no flow | Neutral | None | — | Small dot |
| Today | — | None | 2dp ring | — |

**Contrast requirements:** 3:1 minimum for non-text arcs against the card background (WCAG 1.4.11), 4.5:1 for ring centre text. The current `#EFE6E9` track on `#FDF5F7` background is approximately 1.1:1 — fix this.

Ship a **Colour-blind friendly** toggle in Settings that swaps to a monochrome + glyph scheme. Cheap to build, disproportionate goodwill.

### 2.9 What to exclude from the Home ring area

| Excluded | Reason |
|---|---|
| Day numbers 1–30 on the rim | Root cause of the current ambiguity |
| Clinical phase labels (follicular, luteal) | Education, not glance-level. Belongs in Insights |
| Historical average cycle length | A statistic, not a state. Insights tab |
| Pregnancy-chance percentages | Unsupportable with calendar math. The #1 source of harm in this category |
| Predicted PMS window | Prescribes a mood before it happens. Low accuracy, high emotional cost |
| Streaks, badges, logging counts | Gamifying a bodily function creates guilt on skipped days |
| BBT, weight, any second chart | Home answers one question: where am I today |
| Two date framings for one event | The current 14–24 vs 19–23 problem |

---

## 3. Home Screen

### Structure — single vertical priority stack

```
1. Ring (hero)          one state, one number, one chip
2. 14-day linear strip  the date answer
3. [ Log today ]        full-width primary, sticky above the tab bar
4. Quick log row        4–6 chips, horizontally scrollable, most-used first
5. Context card         ONE card, contents change by phase
```

**Delete the three stat cards.** Cycle day → ring eyebrow. Next period → hero. Ovulation → ring + strip. They are a third redundant encoding and they are why the screen reads as a dashboard rather than an answer.

**One phase-aware context card:**

| Phase | Card contents |
|---|---|
| Menstruating | Flow summary so far + `Heavier than usual?` → Insights |
| Fertile | Fertile window dates + the birth-control disclaimer as a bordered callout |
| Luteal | Most-logged symptom for this phase from her own history |
| Late | Re-anchor prompt |
| `loggedCycles < 3` | `Log 2 more cycles to unlock your patterns` + progress indicator |

**Move the disclaimer.** `An estimate. Not reliable as birth control.` is the most ethically important sentence in the app and it is currently the last line of a below-fold card. Put it inside the fertile-window card as a bordered callout, and repeat it during onboarding.

**Delete the floating gear FAB.** Settings is already a tab. If it is a debug affordance, gate it behind `__DEV__`.

### Interactions
- Tap ring → full-screen cycle detail with phase breakdown
- Tap centre number → toggle point estimate ↔ range
- Tap strip column → open that day's log sheet
- Long-press `Log today` → flow-only quick sheet (2-tap logging)
- **No pull-to-refresh.** Nothing is fetched; it implies a server

### Copy
```
✅  Period in ~13 days
✅  Expected around 19 Sep     (tap → "Most likely 17–21 Sep")
✅  Log today
✅  estimate — keep logging    (tappable, explains why)
❌  Period in 13 days
❌  Next period 14–24 Sep 2026   ← this line must not exist in this form
❌  Log now / + Add
```

**Priority: P0**

---

## 4. Calendar / Period Log

### Fixes
- Apply the `§2.8` texture grammar: solid = logged, dashed = predicted, dot = has an entry
- Once texture carries logged-vs-predicted, the legend shrinks from 5 items to 3
- Predicted period must be rose at 40% with a dashed outline, **never grey**
- Fix the legend/render mismatch; drop the standalone `Predicted` swatch

### Additions
- **Cycle bands** — a thin coloured bar under each week row marking cycle boundaries. The single most useful addition for pattern recognition: it makes "my cycles are getting shorter" visible with no statistics
- **Bottom sheet on tap**, not a new screen. Snap points 40% / 90%. Android back-gesture dismisses
- **Jump-to** — tapping the month title opens a year/month grid. Scrolling back 8 months one arrow-tap at a time is punishing
- Add a visible entry point for logging a past date

### Day cell anatomy
```
┌─────────┐
│    5    │  ← date
│   ●●    │  ← up to 2 status glyphs
│    ·    │  ← entry dot
└─────────┘
```
Minimum 48×48dp touch target (Material). Current cells look ~36dp.

### Bikram Sambat
When BS is active, show the BS date as primary and the AD date as a small superscript in the corner of each cell. **Do not force a mode switch to cross-reference** — most Nepali users hold both calendars simultaneously.

### Copy
```
Legend:  Period (logged) · Period (predicted) · Fertile · Ovulation · Logged
Empty future day:  "Nothing logged. Add a note for 12 Sep?"
```

**Priority: P0** (colour + legend) · **P2** (cycle bands, jump-to)

---

## 5. Statistics & Insights

Currently a static key-value table that duplicates Home, on a screen called Insights with no charts. Rebuild as three blocks.

### Block 1 — Cycle history bar chart
Horizontal bars, one per cycle, length = cycle days, with the period portion filled in a darker rose. Dashed median line. **This is the most valuable chart in a period app** — regularity becomes visible instantly. Requires `loggedCycles >= 3`.

### Block 2 — Cycle statistics
```
Average cycle      29 days      (range 27–31)
Average period      6 days      (range 5–7)
Variation        ±2 days        Regular
Cycles logged           4
```
Show `Variation` with a plain-language verdict (`Regular` / `Somewhat irregular` / `Irregular`) rather than a raw σ. Include a `What does this mean?` link and a note that occasional variation is normal — this reduces unnecessary alarm.

### Block 3 — Symptom patterns
Phase × symptom heat strip. For each logged symptom, show which cycle quarter it clusters in.
```
Headache    ▁▁▃█   most often before your period
Cramps      █▃▁▁   most often during your period
```
Requires `loggedCycles >= 3`. Correlation language only.

### Progressive unlock with visible progress
```
Cycle history        ✓ unlocked
Symptom patterns     2 of 3 cycles  ▓▓▓▓▓▓░░░
```
Better than a flat `needs 2 or more cycles` — it tells her how close she is.

### Journal upgrade
- Group by **cycle**, not by month
- Show cycle day on every entry: `Day 7 · 26 Aug · Medium flow`
- Filter chips by tag; search by month/tag

### Health report export
Generate a clean PDF or plain-text summary — cycle lengths, period lengths, symptom frequency, date range. Locally via `expo-print` + `expo-sharing`. Genuinely useful for a gynaecologist visit and costs nothing in backend.

### Copy
```
✅  Your cycles have been fairly regular over the last 4 months.
✅  Headaches show up most often in the week before your period.
❌  Your cycle is abnormal
❌  ⚠️ Irregular cycle detected
❌  Your headaches are caused by falling oestrogen.
```

**Priority: P1**

---

## 6. Symptom & Mood Tracking

### Single bottom-sheet log flow — one screen, no wizard

```
┌─ 6 Sep 2026 ─────────────────┐
│ Flow                          │
│  ○ None ● Light ○ Med ○ Heavy │
│                               │
│ Mood                          │
│  😊 😐 😔 😠 😰 🥱  (multi)    │
│                               │
│ Symptoms                      │
│  [Cramps] [Headache] [Bloat]  │
│  [Acne] [Tender] [Tired]  [+] │
│                               │
│ Note                          │
│  ┌─────────────────────────┐  │
│                               │
│        [ Save ]               │
└───────────────────────────────┘
```

### Rules
- **Everything optional.** No required fields. Save works with zero selections
- Chips toggle instantly, no confirm step. Optional long-press for intensity (1–3 dots)
- **Reorder chips by her own usage frequency**, most-used first. Static alphabetical lists age badly
- `[+]` opens a custom-symptom creator, stored locally. No fixed taxonomy needed
- **Mood must be optional and low-key.** A mandatory mood picker turns a tracker into a diary and drives churn. Never require it to save flow
- Journal must record *what* is `Medium` — currently the tag is context-free

### Smart suggestions — conservative only
If cramps were logged on cycle day 1–2 in each of the last three cycles, **pre-highlight** (do not pre-select) that chip on day 1. Pre-selecting creates false data.

### Vocabulary
Even in an English-only v1, use terms that read naturally to a Nepali-English speaker. `Stomach cramps` not `Dysmenorrhoea`. `Feeling low` not `Depressed mood`. Avoid clinical register throughout.

### Copy
```
✅  How's today?
✅  Saved                          (brief toast)
✅  Nothing to log today? That's fine — [Skip]
❌  Record your symptoms
❌  Your entry has been successfully recorded!
```

**Priority: P1**

---

## 7. Settings & Profile

### P0 fixes

**Notifications.** Four toggles currently animate to "on" and do nothing (`Saved now; scheduled reminders arrive with a later update`). This is the worst pattern in the app — it silently trains distrust. Either:
- Implement with `expo-notifications` local scheduling (no backend needed, roughly a day of work), **or**
- Hide the section entirely until it works

If you must ship them disabled, grey them out with `Coming soon` — do not let them animate to "on".

**App lock.** Device-only data + hand-distributed APK + shared-phone culture means the lock **is** the privacy model.
- `expo-local-authentication` for biometric / PIN on resume
- Optional "hide content in app switcher" via `FLAG_SECURE` on Android

**Delete the floating gear FAB** — it currently covers the `Quick-log on Home` toggle.

### P1 fixes

**Commit model.** Three `Save` buttons on one sheet plus a global `Cancel` is a form-design error that makes people re-check whether their input took. Use **one Save at the bottom**, or better, **auto-save on change with an undo snackbar**.

**Birth year.** The chips `2011 / 2006 / 2001 / 1996 / 1986` use 5-year jumps then a 10-year jump. Arbitrary. Replace with a scroll wheel, a validated number field, or — better — an age range (`Under 18 / 18–24 / 25–34 / 35–44 / 45+`). You only need coarse context, and it is less identifying. With device-only storage, minimising identifiers is free.

**Calendar system.** Move higher in the list. Label it `Calendar — Bikram Sambat / Gregorian`, not `AD`. Prompt for it during onboarding rather than burying it.

### Complete the Data section
```
DATA
  Export my data          JSON + CSV via share sheet
  Import data             restore from a previous export
  Delete all data         two-step, typed "DELETE" confirmation

PRIVACY
  Where your data lives   plain-language explainer
  App lock                biometric / PIN
```

### Privacy explainer — use this text
> Everything you log stays on this phone. Saathi has no account, no server, and sends nothing anywhere. If you uninstall the app or lose this phone, your data goes with it — export a backup if you want to keep it.

That last clause matters and most apps omit it. With no cloud backup in v1, uninstall equals permanent loss, and users must know before it happens.

### Copy
```
✅  Everything stays on this phone.
✅  Delete all data — this can't be undone.
❌  Saved now; scheduled reminders arrive with a later update
```

**Priority: P0** (fake toggles, app lock, FAB) · **P1** (commit model, data section)

---

## 8. Onboarding

**Four screens maximum, all skippable.**

**Screen 1 — Privacy first, before anything is asked.** This is the trust moment, and for a hand-distributed APK in Nepal it is the difference between installing and deleting.
> **Your data never leaves this phone.**
> No account. No internet. No one else sees it.
> `[ Get started ]`

**Screen 2 — Last period start.** Calendar picker defaulting to ~2 weeks ago. Prominent `I'm not sure` → skips to the no-prediction state rather than forcing a guess.

**Screen 3 — Cycle length + period length.** Preset chips (26 / 28 / 30 / 32 / Other) plus `I don't know` → defaults to 28, flagged internally as a default.

**Screen 4 — Calendar preference.** Bikram Sambat or Gregorian. Do this here, not buried in Settings — it changes every date in the app.

**Then land on Home with a working prediction and exactly one coach-mark on the ring:**
> This ring shows your whole cycle. You're on day 18 — the dot is you.

One coach-mark. Not a five-step tour.

**Data import:** v1 accepts your own JSON export format only. Cross-app import (Flo, Clue) is a data-cleaning project, not an onboarding feature. Defer.

**Re-onboarding:** if setup was skipped, show a persistent but dismissible Home card: `Add your last period to get predictions.`

### Copy
```
✅  When did your last period start?
✅  Roughly how long is your cycle?
✅  Not sure? We'll figure it out as you log.
❌  Enter your LMP date
❌  Welcome to your journey!
```

**Priority: P1**

---

## 9. Navigation & Information Architecture

**Keep the four tabs.** The structure is right; the responsibilities overlap. Reassign:

| Tab | The one question it answers |
|---|---|
| Home | Where am I today, and what do I do now? |
| Calendar | What happened / will happen on a specific date? |
| Insights | What are my patterns over time? |
| Settings | How does the app behave? |

**Delete the FAB.** It duplicates the Settings tab and covers content. If a persistent log affordance is wanted, use a centre tab-bar action button (Material 3 pattern), not a floating overlay.

**De-duplicate Home and Insights** — currently both show cycle day, next period, and ovulation.

**Add a path to log a past date from Home** — currently it requires a detour through Calendar.

### Gestures
- Horizontal swipe on Calendar = previous / next month
- Horizontal swipe on the Home strip = scroll days
- **No horizontal swipe between tabs** — it conflicts with both of the above and with the Android back gesture
- Android hardware back must: dismiss sheet → return to Home → exit app. Test this explicitly

### Deep links
```
saathi://log/today
saathi://calendar/2026-09-19
```

**Priority: P0** (FAB) · **P1** (de-duplication)

---

## 10. Accessibility & Inclusivity

### Screen reader — TalkBack is the priority (Android first)

**The ring must be one accessible element, not thirty.** Set `accessible={true}` on the container and `importantForAccessibility="no-hide-descendants"` on the arcs. Otherwise TalkBack reads 30 unlabelled SVG paths.

```
accessibilityLabel:
"Cycle day 18 of about 30. Period expected in about 13 days,
 around 19 September. This is an estimate."
```

- Every chip: `accessibilityRole="button"`, `accessibilityState={{ selected }}`
- Calendar cells: `"6 September, today, ovulation likely"` — never rely on colour being announced
- **Test with TalkBack on before every release.** Ten minutes, catches almost everything

### Visual
- Support `fontScale` to 200%. The 32sp ring hero will break — cap at `fontScale 1.3` inside the ring
- Minimum 48×48dp touch targets
- Respect `AccessibilityInfo.isReduceMotionEnabled()` — skip the ring sweep
- Ship the colour-blind mode from `§2.8`
- Full dark theme. Health apps get opened at 2am

### Language
Rules are in `§0`. Additionally: never assume goals — do not ask "trying to conceive?" unless she opts into a fertility mode.

### Cultural context
Menstruation carries real stigma in many Nepali communities, and *chhaupadi* practice persists in parts of the far west. Two implications:
1. App name and icon must be discreet. "Saathi" is well chosen — keep the icon neutral too
2. App lock and app-switcher hiding are what make the app usable on a shared or observed phone. They are functional requirements

**Priority: P1** (screen reader, font scaling, language) · **P2** (colour-blind mode, dark theme)

---

## 11. Performance & Technical

### 11.1 Charting — do not add Victory

`victory-native` (the non-Skia version) has poor RN performance and a large footprint for what this app needs. Everything here — ring, bars, heat strip — is achievable with **`react-native-svg`** (already in Expo) plus **`react-native-reanimated` v3** (also in Expo).

If genuinely complex charts become necessary later, jump straight to `victory-native` XL (Skia-backed), skipping the legacy version.

**Ring implementation — animate `strokeDasharray`, never the path `d` string.** Recalculating `d` forces a JS-thread round-trip every frame.

```js
const C = 2 * Math.PI * r;
const animatedProps = useAnimatedProps(() => ({
  strokeDasharray: [ (progress.value / L) * C, C ],
}));
```

### 11.2 Animation — Reanimated 3 only, skip Lottie

Lottie adds ~1MB to the APK for animations this app should not be showing anyway (`§13`). The animation budget is one ring sweep plus a few springs — all worklet-native.

### 11.3 State

- **Zustand**, not Redux. The state is small; the boilerplate is not worth it
- **Raw logs are the only source of truth.** Never persist derived values (cycle day, next period, phase). Derive with pure, memoised selectors
- Extract prediction logic into a dependency-free `src/cycle/` module — pure functions in, plain objects out
- Recompute on: app foreground, log write, settings change, and **midnight rollover** (`AppState` + timer — otherwise cycle day is stale on a phone left open overnight)

**Required unit tests for `src/cycle/`:**
```
□ regular cycle, mid-luteal
□ zero cycles logged
□ one cycle logged
□ irregular cycles, σ > 7
□ late period, days 1 / 7 / 8 / 30
□ 60-day gap → predictions paused
□ retroactive edit re-anchors the chain
□ cycle spanning a year boundary
□ leap-year date arithmetic
□ period length: settings value vs logged median
```

### 11.4 Storage — and the UTC+05:45 trap

- **`expo-sqlite`, not AsyncStorage.** AsyncStorage is a single JSON blob; at a year of daily logs you serialise the whole thing on every write. SQLite gives date-range queries for free

```sql
cycles(id, start_date, end_date)
logs(date PRIMARY KEY, flow, mood, note)
log_symptoms(date, symptom_id)
symptoms(id, label, is_custom)
schema_version(version)
```

- **Store dates as `'YYYY-MM-DD'` local-date strings. Never UTC timestamps.** This is the classic period-app bug, and **Nepal's UTC+05:45 offset makes it worse**: a `Date` serialised to UTC shifts a log to the previous day for anyone logging before 05:45 local time. Use date-only handling (`date-fns` with local parsing, or plain string arithmetic)
- Wrap writes in transactions
- Include `schema_version` from day one — migrations will be needed and APKs are hand-distributed

### 11.5 Offline-first

No backend means offline-native by default. What is still required:
- **Export / import is the only backup path.** Prompt for an export after the 3rd logged cycle
- **Never render a network state, spinner, or "syncing" indicator.** There is nothing to sync, and implying otherwise erodes the privacy promise made during onboarding

### 11.6 Bikram Sambat

- Do **all** cycle math in Gregorian ordinals. BS is a **formatting layer only**
- Use a lookup-table library (`nepali-date-converter` or similar). Algorithmic conversion is unreliable outside the tabulated range
- Cache conversions. Never convert inside a `FlatList` render

### 11.7 Build

- Hermes on (Expo default); New Architecture if dependencies support it
- `expo-build-properties` → enable ProGuard / R8 minification for release APKs
- Ship an ABI-split or `arm64-v8a`-only APK — with hand-distributed installs, download size matters on Nepali mobile data

**Priority: P0** (date storage — fix before real data accumulates) · **P1** (SQLite, prediction module) · **P2** (build optimisation)

---

## 12. Micro-interactions & Feedback

### Animation — restrained. This is not a fitness app.

| Moment | Treatment |
|---|---|
| Ring first render | Elapsed stroke sweeps 0 → today, 600ms ease-out. **Once per app open**, not per tab visit |
| Cycle day advances | No animation. It just updates |
| Log saved | Chip settles + subtle haptic |
| Period logged (day 1) | Ring re-anchors with a 400ms cross-fade, **not a spin** |
| Sheet open/close | Standard platform spring |
| Tab switch | Instant. No transition |

**Explicitly forbidden:** confetti, streak celebrations, badge unlocks, `you're doing great!`. Logging a period is not an achievement, and the celebration lands badly for anyone tracking through pain, fertility struggles, or a late period.

### Haptics (`expo-haptics`)
```
Light    → chip toggle
Medium   → save
Success  → period start logged
Warning  → destructive confirm only
```
Nothing else.

### Empty states — every one needs an action

| Screen | Empty state |
|---|---|
| Home, no data | Ghost ring + `When did your last period start?` + picker |
| Calendar, no logs | Faint `Tap any day to log` overlay on first visit only |
| Insights, < 3 cycles | Skeleton chart + `2 of 3 cycles` progress |
| Journal, empty | `Your notes will show up here.` |

### Confirmations
Silent success (a toast at most). Loud only for destructive actions. **Undo snackbar for 5s after any delete** — cheaper and kinder than a confirm dialog.

**Priority: P2**

---

## 13. Build order

### Sprint 1 — P0, trust
```
□ 1  Rebuild the ring as cycle-relative (§2.2, §2.3)
□ 2  Collapse the three conflicting "next period" outputs into one date model (§2.5)
□ 3  Predicted period → rose + dashed, not grey; fix the Calendar legend (§2.8, §4)
□ 4  Delete the floating gear FAB (§3, §7, §9)
□ 5  Implement notifications with expo-notifications OR hide the section (§7)
□ 6  Ship app lock via expo-local-authentication + FLAG_SECURE (§7)
□ 7  Audit date storage for the UTC+05:45 bug (§11.4)
```

### Sprint 2 — P1, comprehension
```
□  8  Phase-aware hero copy + 14-day linear strip (§2.5, §2.6)
□  9  Full log bottom sheet: flow / mood / symptoms / note (§6)
□ 10  Insights: cycle history bar chart + statistics block (§5)
□ 11  Onboarding, privacy-first (§8)
□ 12  TalkBack labels + 200% font scaling (§10)
□ 13  Single-commit settings model; complete the Data section (§7)
□ 14  Extract src/cycle/ prediction module + edge-case tests (§11.3)
□ 15  Migrate storage to expo-sqlite (§11.4)
```

### Sprint 3 — P2
```
□ 16  Symptom pattern heat strip (§5)
□ 17  Colour-blind mode + dark theme (§2.8, §10)
□ 18  PDF export for clinician visits (§5)
□ 19  Calendar cycle bands + jump-to-month (§4)
□ 20  Haptics, micro-interactions, empty states (§12)
```

---

## 14. Acceptance criteria for the cycle chart

The ring rebuild is done when all of these hold:

```
□ Ring position 12 o'clock is always cycle day 1, never the 1st of the month
□ The today-marker's ring position equals the displayed cycle day
□ A fertile window crossing a month boundary renders fully, unclipped
□ No numerals appear on the ring rim
□ Home, Calendar, and the ring show the same predicted period dates
□ "Next period" never displays a confidence interval as if it were flow duration
□ Predicted arcs have feathered ends; logged arcs have hard edges
□ Ovulation renders as a single-day notch, not a multi-day arc
□ With σ > 7 days, no point-estimate countdown is shown
□ A late period parks the marker at the day-1 boundary and grows a dashed overflow arc
□ A late period never mentions pregnancy, testing, or possible causes
□ With zero data, a ghost ring plus a date-picker CTA renders — not an empty circle
□ TalkBack announces the ring as one element with a full sentence
□ At fontScale 2.0, the ring centre does not clip or overlap the band
□ Under a deuteranopia simulator, period and fertile arcs remain distinguishable
□ Reduce-motion disables the sweep animation
```
