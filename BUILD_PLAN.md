# Saathi — Build & Release Plan

Solo developer + AI agent → private APK distribution to a small group.

---

## 1. Plan at a glance

| Phase | Milestones | Focused days | What exists at the end |
|---|---|---|---|
| **A. Foundation** | M0–M2 | 3–4 | Repo, DB, and a tested prediction engine with no UI |
| **B. Core loop** | M3–M4 | 3–4 | Onboarding + Home + logging — the app is usable |
| **C. Full surface** | M5–M7 | 4–5 | Calendar, Insights, Settings, notifications, PIN |
| **D. Polish** | M8–M9 | 2–3 | Learn content, edge cases, accessibility |
| **D2. UX pass** | M10 | 2–3 | The app is comfortable on a real phone: safe areas, typed input, editable profile, interactive calendar, readable journal |
| **E. Release** | R1–R3 | 1–2 | Signed APK, install guide, delivered to the group |
| **F. Live** | ongoing | — | Feedback, OTA fixes, v1.1 |

**Total: 15–21 focused days.** At 2–3 hours an evening that's roughly 5–7 weeks; over full weekends, 3–4 weeks. The estimate assumes an AI agent writing most of the code and you reviewing every diff — it does *not* assume the agent gets it right first try.

The biggest schedule risk is Phase A. Rushing the prediction engine means paying for it in every later phase with bugs that look like UI bugs but aren't.

---

## 2. Phase 0 — Pre-flight (half a day, before any code)

### Tooling

- [ ] Node LTS installed, `npm i -g eas-cli`
- [ ] Expo account created, `eas login` verified
- [ ] Private git repo created, initial empty commit
- [ ] A real mid-range Android device for testing — not just an emulator, and not a flagship

### Files you create by hand, not via the agent

Create these three before the agent touches anything. They are the agent's guardrails, and an agent that wrote its own guardrails will happily ignore them.

- `REQUIREMENTS.md` — the full spec, at repo root
- `AGENTS.md` (or `CLAUDE.md`, whichever your agent reads) — the rules file
- `DECISIONS.md` — empty, with a heading. Every departure from the spec gets one dated line with a reason. This is the file that saves you in three months when you can't remember why something works the way it does.

### Agent workflow

One milestone, one conversation, one prompt shaped like this:

```
Read REQUIREMENTS.md and AGENTS.md.
Implement milestone M4 only: [paste the milestone row].
Relevant spec sections: §6.2, §6.4, §11.2.

Before writing code, list the files you will create or modify
and any spec ambiguity you found. Wait for my confirmation.
```

The "wait for confirmation" step is worth the extra round trip — it catches misreadings before they become 400 lines you have to review.

**After every milestone, you personally:** run the app, run the tests, read the diff, commit. Do not batch two milestones into one review.

---

## 3. Phase A — Foundation

### M0 — Scaffold (0.5 day)

| Task | Notes |
|---|---|
| `npx create-expo-app` with TypeScript + expo-router template | |
| Set `strict: true` in tsconfig | |
| Install the §2 dependency list | Nothing else |
| `src/theme/{colors,typography,spacing}.ts` from §11.2–11.3 | Tokens only, no components |
| `src/i18n/en.ts` with an empty export | |
| Tab shell: 4 tabs, placeholder screens, correct icons and labels | |
| ESLint + Prettier, `npm run lint` passes | |

**Done when:** app launches on device, four tabs navigate, no console warnings.

### M1 — Data layer (1 day)

| Task | Notes |
|---|---|
| `src/db/client.ts` — open DB, run migrations on first call | |
| `src/db/schema.ts` — the three tables from §4.1 exactly | |
| `src/db/migrate.ts` — version runner, v1 only | Don't skip this |
| `repositories/dailyLogs.ts` — get by date, get range, upsert, delete | |
| `repositories/periods.ts` — get all, replace all (transactional) | |
| `repositories/settings.ts` — typed get/set with §4.3 defaults | |
| `scripts/seed.ts` — the three fixture datasets from §14 | |

**Done when:** the seed script populates a DB and a throwaway screen prints row counts for all three fixtures.

### M2 — The engine (1.5–2 days) ← *the important one*

| Task | Notes |
|---|---|
| `src/core/dates.ts` — date-only helpers, no Date objects escaping | |
| `src/core/periods.ts` — `recomputePeriods()` per §4.5, pure | Takes logs, returns periods |
| `src/core/prediction.ts` — everything in §5, pure | |
| Unit tests for all boundary cases in §14 | Not "some tests" — the listed ones |

**Done when:** `npm test` passes with every §14 case covered, and you have manually verified the irregular fixture produces `isIrregular: true` with `predictionWindow: 5`.

> **Review this milestone yourself, line by line.** It's ~300 lines of pure functions with no UI to distract you, and it's the only part of the app where a subtle bug produces confidently wrong output rather than a visible crash. Read the weighted-average implementation and the standard-deviation calculation with your own eyes.

---

## 4. Phase B — Core loop

### M3 — Onboarding (1–1.5 days)

- Five steps per §6.1, swipeable, progress dots
- Date picker constrained to the last 90 days, "I'm not sure" fallback
- Number pickers for cycle/period length with "I don't know"
- Birth year picker
- On finish: write settings → seed logs → recompute → mark complete
- Guard: `_layout.tsx` redirects to onboarding when `onboarding_complete` is false

**Done when:** a wiped install reaches Home with a real prediction, and re-launching skips onboarding.

### M4 — Home + logging (2–2.5 days)

- `StatusCard` — all four states: countdown, on-period, late, low-confidence
- Context-aware primary button (§6.2)
- `WeekStrip` — 7 cells, correct state colours, tappable
- `FertileCard` with the permanent disclaimer line
- Today's log summary / empty state
- Log modal (§6.4): flow, moods, symptoms, note; optimistic save
- Wire: save → recompute periods → recompute prediction → Home updates

**Done when:** the three-tap logging test passes and Home updates without a manual refresh.

> **At this point the app is genuinely usable.** If you had to ship early, you could ship here — see §9.

---

## 5. Phase C — Full surface

### M5 — Calendar (1–1.5 days)

- Month grid, horizontal swipe, capped at current month + 3
- All day-cell states from §11.2 with shape + colour
- AD/BS toggle re-gridding to Nepali months
- Legend
- Future dates show prediction detail, not the log modal

**Watch for:** the agent relabelling Gregorian months as BS instead of actually re-gridding. Test by opening a BS month with 32 days and counting the cells.

### M6 — Insights (1–1.5 days)

- Stats card with its <2-cycle empty state
- Three charts, each with an explicit empty state naming the data needed
- Cycle history list with outlier badges, tapping jumps to Calendar

### M7 — Settings, notifications, lock (1.5–2 days)

| Task | Watch out for |
|---|---|
| Settings screen, all rows from §6.7 | |
| `services/notifications.ts` — schedule/cancel/reschedule | Android 13+ needs a runtime `POST_NOTIFICATIONS` request; ask at the *first* time a user enables a reminder, not on launch |
| Neutral notification copy audit | Grep the whole repo for "period", "cycle", "fertile" inside `notifications.ts` |
| PIN lock: hash + salt in SecureStore, 30s background trigger, lockout backoff | The no-recovery acknowledgement dialog is not optional |
| Export to JSON via share sheet | |
| Delete all data, double confirm | |

---

## 6. Phase D — Polish

### M8 — Learn content (0.5–1 day)

Six articles as local markdown. **Write article 5 ("How this app predicts your period") yourself** — it's the honesty centrepiece of the app and an agent will pad it with reassuring vagueness. Keep it to plain sentences: it averages your recent cycles, weights the recent ones more, assumes ovulation is 14 days before your next period, and that last assumption is why the fertile window is a rough estimate.

### M9 — Hardening (1–1.5 days)

Work through REQUIREMENTS §10 as an explicit checklist, one commit per case. Then:

- [ ] Accessibility: labels on icon-only buttons, 44px targets, 200% font scale on Home
- [ ] Contrast check on the pink-on-pink combinations — `primaryMuted` text is the likely failure
- [ ] Airplane mode from a wiped install, full walkthrough
- [ ] Timezone change test: set device to a different zone, reopen, verify no date shift
- [ ] Grep the bundle for network calls
- [ ] Performance: 500 seeded log rows, calendar swipe stays smooth

---

## 6b. Phase D2 — UX pass

### Carried over — read this before starting M10

As of 2026-08-31 the repository does **not** contain everything the milestones above claim. Verified against the tree:

| Milestone | Claimed | Actually in the repo |
|---|---|---|
| M6 Insights | stats, three charts, cycle history | two stat rows; `src/components/charts/` is empty; no history list |
| M7 Settings, notifications, PIN, export | complete | `src/services/` holds only `clock.ts`; no `notifications.ts`, `lock.ts`, `export.ts`, no `app/lock.tsx`; settings screen is a two-row stub |
| M8 Learn | six articles | `src/content/learn/article-5.md` only; no `app/learn/` route |

M10 does not build those. They stay owned by M6, M7, and M8 and must be finished before release — §15 acceptance depends on notifications, the PIN, delete-all, and the charts. Settings rows for the unbuilt features render in a visibly disabled state rather than pretending to work.

### M10 — UX pass (2–3 days)

Spec: §6.1, §6.2, §6.3, §6.3.1, §6.4, §6.5, §6.7, §10.10–13, §11.6, §11.7. **No new dependency** — everything needed is already installed.

**Step 1 — safe areas (do first; it is the blocking bug)**

- [x] `SafeAreaProvider` + `GestureHandlerRootView` + `StatusBar` in the root layout
- [x] One `Screen` wrapper component applying insets; every tab, the modal, and onboarding go through it
- [x] Tab bar height includes `insets.bottom`
- [x] Onboarding footer clears the gesture bar; controls ≥ 48px; Next responds on the first tap on a gesture-nav phone

**Step 2 — onboarding input**

- [x] Pure helpers in `core/onboarding.ts`: numeric input parsing, quick date choices, quick length choices — with tests
- [x] `TextField` and `DatePickerGrid` components; the grid reuses `getMonthGrid`
- [x] Every answer step offers chips **and** a typed field, with inline validation
- [x] `onboarding_seed_range` written on finish

**Step 3 — editable profile**

- [x] Settings → My cycle screen editing all onboarding answers
- [x] Pure `reseedPlan` + repository `clearFlowForDates`, with tests for the protected-day rule
- [x] Anchor change confirms first, then recomputes; no user-logged day is destroyed
- [x] Settings rebuilt into grouped sections; unbuilt M7 rows shown disabled

**Step 4 — calendar**

- [x] Opening month derived from `today` via `currentBsYear`/`currentBsMonth` — every hardcoded year/month constant removed
- [x] Today ringed in AD and BS; Today control returns to the current month
- [x] Horizontal swipe between months, capped at current + 3 via `monthWindow`
- [x] Day sheet on tap: state line, logged summary, one-tap flow, edit full log; read-only for future dates
- [x] One title, one legend
- [x] Prev/next month controls redone as a visible `MonthNavButton` (filled circle) — the bare glyph read as too small to be a button

**Step 5 — Home quick-log**

- [x] Pure `core/quickLog.ts` with merge semantics, tested
- [x] Quick-log chip row on Home, gated by `quick_log_enabled`

**Step 6 — log reframe**

- [x] Flow first as large labelled buttons; mood/symptoms/note behind "Add more"
- [x] One-time explainer gated by `log_explainer_seen`
- [x] Three-tap path re-verified: open → flow → save

**Step 7 — journal**

- [x] Pure `core/journal.ts` grouping, tested
- [x] Journal section in Insights, paginated, tap-through to the day

**Step 7b — cycle overview (added 2026-08-31, §6.5)**

- [x] `CycleOverviewCard` at the top of Insights: last period, next period, ovulation, fertile window, cycle day — one glanceable card, sourced from the same `Period[]`/`Prediction` Home already uses
- [x] Shared `Row`/`Divider` (`components/ui/Row.tsx`) so the overview and Settings read as one visual language

**Step 8 — visual polish**

- [x] Elevation tokens (`theme/elevation.ts`); palette unchanged (§11.2)
- [x] Card / StatusCard shadow depth
- [x] `MonthNavButton` — calendar and date-picker month controls are now a filled circular button, not a bare small glyph
- [ ] Status card hero with an SVG cycle-day ring — **not built**; `react-native-svg` is available but this specific visual wasn't done in this pass
- [ ] Reanimated transitions ≤ 200 ms, disabled under reduce-motion — **not built**; screens change state instantly, no animation layer added yet
- [x] Every new string in `src/i18n/en.ts`

**Done when:** the new §15 acceptance boxes pass on a real gesture-navigation phone, `npm test` and `npm run typecheck` are green, and the sensitive copy in §5.6, §6.2, §7, and §8 is byte-identical to before the pass.

---

## 7. Phase E — Release

### R1 — Build configuration

**`eas.json`**

```json
{
  "cli": { "version": ">= 12.0.0" },
  "build": {
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" },
      "channel": "preview"
    }
  }
}
```

**`app.json` essentials**

```json
{
  "expo": {
    "name": "Saathi",
    "slug": "saathi",
    "version": "1.0.0",
    "runtimeVersion": { "policy": "fingerprint" },
    "android": {
      "package": "com.yourname.saathi",
      "versionCode": 1,
      "permissions": ["POST_NOTIFICATIONS"]
    },
    "updates": { "url": "https://u.expo.dev/YOUR_PROJECT_ID" }
  }
}
```

`runtimeVersion: fingerprint` means the runtime ID changes only when native code changes — so JS-only fixes ship OTA and native changes correctly refuse to. And `POST_NOTIFICATIONS` should be the *only* permission in that array; if the agent added others, find out why and remove them.

### R2 — The keystore (read this twice)

```bash
eas build --profile preview --platform android
```

EAS generates a keystore on the first build. **Back it up immediately:**

```bash
eas credentials
# Android → Keystore → Download
```

Store that file and its passwords somewhere you will still have them in two years — a password manager, not a laptop folder.

Why this matters more for you than for a Play Store app: your users install by sideloading. If you later build with a *different* keystore, Android refuses to install the new APK over the old one. The only fix is uninstall-and-reinstall, and since there is no backup in v1, **every user loses all her data.** That is the worst failure mode in this entire plan, and it's caused by a lost file rather than any bug.

### R3 — Ship

```bash
eas build --profile preview --platform android
```

EAS returns a download URL and a QR code.

| Delivery method | Good for | Watch out |
|---|---|---|
| EAS internal distribution link | Simplest — send the URL, page handles install | Link expires after 30 days |
| Google Drive link | Permanent, familiar | Drive warns about APK files |
| Direct file over WhatsApp/Viber | Works offline, no account needed | Some clients block `.apk`; zip it |

For a small private group: **Drive with a stable filename** (`saathi-v1.0.0.apk`), link shared over whatever messenger the group already uses.

**Install guide to send with it:**

> 1. Tap the link and download the file.
> 2. Your phone will ask permission to install from this app. Allow it.
> 3. You may see a warning saying the app is unknown. Tap "Install anyway" — this appears for any app not from the Play Store.
> 4. Open the app and answer the four questions.
>
> Your information stays only on your phone. It is not sent anywhere, and nobody — including me — can see it.

That last line matters. Sideloading asks people to override a security warning, and the only thing that makes that reasonable is trust. Say plainly what the app does with data, and make sure it's true.

---

## 8. Phase F — Living with it

### Update workflow

**JS/UI change** (copy fix, colour, bug in a screen):

```bash
eas update --branch preview --message "Fix late-period text"
```

Users get it the next time they open the app. No new APK, no asking anyone to install anything.

**Native change** (new permission, SDK upgrade, new native module):

```bash
# bump version + versionCode in app.json first
eas build --profile preview --platform android
```

New APK, redistribute, same keystore.

Practically: batch small fixes and push OTA weekly at most. Avoid native changes for the first few months — every one costs you a redistribution round.

### Versioning

`1.0.0` at launch. Patch for OTA fixes, minor for new features. Bump `versionCode` by 1 on **every** APK build without exception.

### Feedback loop

You have no analytics and no crash reporting, deliberately. So:

- Pick 2–3 people from the group as first testers. Give them the APK a week before everyone else.
- Ask one specific question rather than "any feedback?" — try *"Did the predicted date match what actually happened?"* That's the only question whose answer tells you if the product works.
- Add an "Email feedback" row in Settings that opens a `mailto:` with the app version pre-filled. No data attached, ever.
- Keep a plain text file of reported issues. At this scale, a file beats a tracker.

### Likely v1.1

1. **Import to match export** — the "I got a new phone" problem will arrive within months
2. **Nepali translation** — one file, since §12 forced strings out of components
3. **Dark mode** — one file, since §11.5 forced colours into tokens
4. **Widget** — highest-value feature for an app whose core question is answerable in one glance

---

## 9. Ship early at M4

Onboarding + Home + logging is a real, useful app. Getting it onto two real phones after four or five days of work — instead of after fifteen — means the feedback that matters (does the prediction match reality?) starts accumulating while you're still building Calendar and Insights.

Cycle feedback is slow by nature. A month of real data is worth more than any amount of testing against fixtures.

---

## 10. Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Lost keystore | Low | **Severe** — every user loses all data | Back it up at R2, twice, in two places |
| Prediction engine has a subtle bug | Medium | High — wrong output, confidently shown | M2 tests before any UI; review that file personally |
| Agent drifts from spec across milestones | Medium | Medium | One milestone per conversation; review every diff |
| BS calendar off-by-one on month lengths | Medium | Medium | Test a 32-day month specifically |
| Notification leaks context on a shared phone | Low | High — this is the trust promise | Grep audit in M7 |
| Scope creep into pregnancy/pill tracking | High | Medium — delays launch indefinitely | §17 is a hard list; new ideas go to DECISIONS.md, not the branch |
| Users can't sideload without help | Medium | Low | Written guide + walk the first two through it in person |

---

## 11. Weekly checkpoint

Ask yourself these four every week, honestly:

1. Which milestone am I on, and is it actually *done* or just mostly working?
2. Did I review every diff, or did I start rubber-stamping?
3. Has anything crept in that REQUIREMENTS §17 says is out of scope?
4. Is the keystore backed up?
